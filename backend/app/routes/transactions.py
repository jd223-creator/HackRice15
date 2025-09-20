from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import secrets
from datetime import datetime

from app.models.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.services.fraud_detection import fraud_detector
from app.services.exchange_rate import exchange_service
from app.utils.auth import get_current_user

router = APIRouter()

class TransactionRequest(BaseModel):
    recipient_email: str
    recipient_name: str
    amount: float
    source_currency: str = "USD"
    target_currency: str = "PHP"

class QuoteRequest(BaseModel):
    amount: float
    source_currency: str = "USD"
    target_currency: str = "PHP"

@router.post("/quote")
async def get_quote(quote: QuoteRequest):
    """Get transaction quote with fees"""
    rate_info = await exchange_service.get_rate(quote.source_currency, quote.target_currency)
    
    # Calculate fees (1.5% + $2 fixed)
    percentage_fee = quote.amount * 0.015
    fixed_fee = 2.0
    total_fees = percentage_fee + fixed_fee
    
    recipient_amount = (quote.amount - total_fees) * rate_info['our_rate']
    
    return {
        'amount': quote.amount,
        'fees': round(total_fees, 2),
        'recipient_receives': round(recipient_amount, 2),
        'exchange_rate': rate_info['our_rate'],
        'rate_info': rate_info
    }

@router.post("/send")
async def send_money(
    transaction: TransactionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send money with fraud detection"""
    
    # Get user's transaction history
    user_history = db.query(Transaction).filter(
        Transaction.sender_id == current_user.id
    ).order_by(Transaction.created_at.desc()).limit(20).all()
    
    # Run fraud detection
    fraud_analysis = fraud_detector.calculate_fraud_score(
        transaction.dict(),
        user_history
    )
    
    # Get exchange rate
    rate_info = await exchange_service.get_rate(
        transaction.source_currency, 
        transaction.target_currency
    )
    
    # Calculate fees
    percentage_fee = transaction.amount * 0.015
    fixed_fee = 2.0
    total_fees = percentage_fee + fixed_fee
    
    # Create transaction
    db_transaction = Transaction(
        sender_id=current_user.id,
        recipient_email=transaction.recipient_email,
        recipient_name=transaction.recipient_name,
        amount=transaction.amount,
        source_currency=transaction.source_currency,
        target_currency=transaction.target_currency,
        exchange_rate=rate_info['our_rate'],
        fees=total_fees,
        fraud_score=fraud_analysis['fraud_score'],
        blockchain_tx_hash=f"0x{secrets.token_hex(32)}",  # Mock blockchain hash
        status="pending" if fraud_analysis['recommendation'] == 'APPROVE' else "review"
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return {
        'transaction_id': db_transaction.id,
        'status': db_transaction.status,
        'fraud_analysis': fraud_analysis,
        'blockchain_tx_hash': db_transaction.blockchain_tx_hash,
        'fees': total_fees,
        'recipient_receives': round((transaction.amount - total_fees) * rate_info['our_rate'], 2)
    }

@router.get("/history")
async def get_transaction_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction history"""
    transactions = db.query(Transaction).filter(
        Transaction.sender_id == current_user.id
    ).order_by(Transaction.created_at.desc()).limit(10).all()
    
    return transactions

@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific transaction details"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.sender_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction