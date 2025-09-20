from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.models.database import Base
from datetime import datetime

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_email = Column(String)
    recipient_name = Column(String)
    amount = Column(Float)
    source_currency = Column(String)
    target_currency = Column(String)
    exchange_rate = Column(Float)
    fees = Column(Float)
    status = Column(String, default="pending")
    fraud_score = Column(Integer, default=0)
    blockchain_tx_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)