from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
import httpx
import asyncio
from datetime import datetime

router = APIRouter()

class ExchangeRateResponse(BaseModel):
    from_currency: str
    to_currency: str
    market_rate: float
    our_rate: float
    competitor_rate: float
    our_markup: str
    competitor_markup: str
    savings_percent: str
    last_updated: datetime

class CurrencyInfo(BaseModel):
    code: str
    name: str
    flag: str
    popular_destinations: List[str]

class RateComparisonResponse(BaseModel):
    amount: float
    from_currency: str
    to_currency: str
    our_service: Dict
    competitors: List[Dict]
    savings: Dict

# Supported currencies with country info
SUPPORTED_CURRENCIES = {
    'USD': {'name': 'US Dollar', 'flag': '🇺🇸', 'destinations': ['PH', 'MX', 'IN', 'NG']},
    'EUR': {'name': 'Euro', 'flag': '🇪🇺', 'destinations': ['PH', 'IN', 'NG', 'US']},
    'GBP': {'name': 'British Pound', 'flag': '🇬🇧', 'destinations': ['PH', 'IN', 'NG', 'US']},
    'CAD': {'name': 'Canadian Dollar', 'flag': '🇨🇦', 'destinations': ['PH', 'IN', 'US']},
    'AUD': {'name': 'Australian Dollar', 'flag': '🇦🇺', 'destinations': ['PH', 'IN', 'US']},
    'PHP': {'name': 'Philippine Peso', 'flag': '🇵🇭', 'destinations': ['US', 'EU', 'GB']},
    'MXN': {'name': 'Mexican Peso', 'flag': '🇲🇽', 'destinations': ['US', 'EU', 'GB']},
    'INR': {'name': 'Indian Rupee', 'flag': '🇮🇳', 'destinations': ['US', 'EU', 'GB']},
    'NGN': {'name': 'Nigerian Naira', 'flag': '🇳🇬', 'destinations': ['US', 'EU', 'GB']},
}

# Mock competitor data (for demo purposes)
COMPETITOR_DATA = {
    'Western Union': {'markup': 0.055, 'fixed_fee': 5.99, 'brand': 'Western Union'},
    'MoneyGram': {'markup': 0.048, 'fixed_fee': 4.99, 'brand': 'MoneyGram'},
    'Remitly': {'markup': 0.035, 'fixed_fee': 2.99, 'brand': 'Remitly'},
    'Wise': {'markup': 0.025, 'fixed_fee': 1.50, 'brand': 'Wise (TransferWise)'},
}

# Exchange rate service class
class ExchangeRateService:
    def __init__(self):
        self.base_url = "https://api.exchangerate-api.com/v4/latest"
        # Fallback rates for demo (in case API fails)
        self.fallback_rates = {
            'USD': {
                'PHP': 56.50, 'MXN': 17.25, 'INR': 83.15, 'NGN': 790.00,
                'EUR': 0.92, 'GBP': 0.79, 'CAD': 1.35, 'AUD': 1.52
            },
            'EUR': {
                'USD': 1.08, 'PHP': 61.20, 'MXN': 18.70, 'INR': 89.80,
                'NGN': 855.00, 'GBP': 0.86, 'CAD': 1.46, 'AUD': 1.64
            },
            'GBP': {
                'USD': 1.26, 'EUR': 1.16, 'PHP': 71.30, 'MXN': 21.75,
                'INR': 104.50, 'NGN': 995.00, 'CAD': 1.70, 'AUD': 1.91
            }
        }
        
    async def get_live_rate(self, from_currency: str, to_currency: str) -> float:
        """Fetch live exchange rate from API"""
        if from_currency == to_currency:
            return 1.0
            
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/{from_currency}")
                
                if response.status_code == 200:
                    data = response.json()
                    if to_currency in data['rates']:
                        return data['rates'][to_currency]
        
        except Exception as e:
            print(f"API Error: {e}")
        
        # Fallback to mock rates
        return self.fallback_rates.get(from_currency, {}).get(to_currency, 1.0)
    
    async def calculate_rates(self, from_currency: str, to_currency: str) -> Dict:
        """Calculate all rates with markups"""
        market_rate = await self.get_live_rate(from_currency, to_currency)
        
        # Our competitive rates (1.5% markup)
        our_markup = 0.015
        our_rate = market_rate * (1 - our_markup)
        
        # Typical competitor rate (5% markup)
        competitor_markup = 0.05
        competitor_rate = market_rate * (1 - competitor_markup)
        
        # Calculate savings
        savings_percent = ((competitor_rate - our_rate) / competitor_rate) * 100
        
        return {
            'from_currency': from_currency,
            'to_currency': to_currency,
            'market_rate': round(market_rate, 6),
            'our_rate': round(our_rate, 6),
            'competitor_rate': round(competitor_rate, 6),
            'our_markup': f'{our_markup * 100:.1f}%',
            'competitor_markup': f'{competitor_markup * 100:.1f}%',
            'savings_percent': f'{savings_percent:.1f}%',
            'last_updated': datetime.utcnow()
        }

# Global service instance
exchange_service = ExchangeRateService()

# Routes
@router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies"""
    currencies = []
    for code, info in SUPPORTED_CURRENCIES.items():
        currencies.append(CurrencyInfo(
            code=code,
            name=info['name'],
            flag=info['flag'],
            popular_destinations=info['destinations']
        ))
    
    return {
        "currencies": currencies,
        "total": len(currencies),
        "note": "These are the currencies we support for remittance"
    }

@router.get("/{from_currency}/{to_currency}", response_model=ExchangeRateResponse)
async def get_exchange_rate(
    from_currency: str,
    to_currency: str
):
    """Get exchange rate between two currencies"""
    
    # Validate currencies
    if from_currency.upper() not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Currency {from_currency} not supported")
    
    if to_currency.upper() not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Currency {to_currency} not supported")
    
    # Get rates
    rates = await exchange_service.calculate_rates(
        from_currency.upper(), 
        to_currency.upper()
    )
    
    return ExchangeRateResponse(**rates)

@router.get("/compare/{from_currency}/{to_currency}")
async def compare_rates(
    from_currency: str,
    to_currency: str,
    amount: float = Query(1000, description="Amount to send")
):
    """Compare our rates with competitors"""
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get our rates
    rates = await exchange_service.calculate_rates(
        from_currency.upper(), 
        to_currency.upper()
    )
    
    market_rate = rates['market_rate']
    
    # Calculate for our service
    our_fee = amount * 0.015 + 2.0  # 1.5% + $2 fixed
    our_recipient_gets = (amount - our_fee) * rates['our_rate']
    
    # Calculate for competitors
    competitors = []
    for name, data in COMPETITOR_DATA.items():
        comp_fee = amount * data['markup'] + data['fixed_fee']
        comp_rate = market_rate * (1 - data['markup'])
        comp_recipient_gets = (amount - comp_fee) * comp_rate
        
        competitors.append({
            'name': data['brand'],
            'fee': round(comp_fee, 2),
            'fee_percent': f"{(comp_fee / amount) * 100:.2f}%",
            'exchange_rate': round(comp_rate, 6),
            'recipient_gets': round(comp_recipient_gets, 2)
        })
    
    # Calculate savings vs best competitor
    best_competitor = max(competitors, key=lambda x: x['recipient_gets'])
    savings_amount = our_recipient_gets - best_competitor['recipient_gets']
    savings_percent = (savings_amount / best_competitor['recipient_gets']) * 100
    
    return RateComparisonResponse(
        amount=amount,
        from_currency=from_currency.upper(),
        to_currency=to_currency.upper(),
        our_service={
            'name': 'RemitEasy',
            'fee': round(our_fee, 2),
            'fee_percent': f"{(our_fee / amount) * 100:.2f}%",
            'exchange_rate': rates['our_rate'],
            'recipient_gets': round(our_recipient_gets, 2)
        },
        competitors=sorted(competitors, key=lambda x: x['recipient_gets'], reverse=True),
        savings={
            'amount': round(savings_amount, 2),
            'percent': f"{savings_percent:.1f}%",
            'vs_competitor': best_competitor['name']
        }
    )

@router.get("/live/{from_currency}")
async def get_live_rates(from_currency: str):
    """Get live rates for a base currency against all supported currencies"""
    
    if from_currency.upper() not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Currency {from_currency} not supported")
    
    base_currency = from_currency.upper()
    rates = {}
    
    # Get rates for all other currencies
    for currency in SUPPORTED_CURRENCIES:
        if currency != base_currency:
            rate_data = await exchange_service.calculate_rates(base_currency, currency)
            rates[currency] = {
                'market_rate': rate_data['market_rate'],
                'our_rate': rate_data['our_rate'],
                'name': SUPPORTED_CURRENCIES[currency]['name'],
                'flag': SUPPORTED_CURRENCIES[currency]['flag']
            }
    
    return {
        'base_currency': base_currency,
        'base_currency_name': SUPPORTED_CURRENCIES[base_currency]['name'],
        'rates': rates,
        'last_updated': datetime.utcnow(),
        'note': 'Our rates include 1.5% markup for sustainability'
    }

@router.get("/popular")
async def get_popular_corridors():
    """Get popular remittance corridors with rates"""
    
    popular_routes = [
        ('USD', 'PHP', 'US to Philippines'),
        ('USD', 'MXN', 'US to Mexico'),
        ('USD', 'INR', 'US to India'),
        ('EUR', 'NGN', 'Europe to Nigeria'),
        ('GBP', 'INR', 'UK to India'),
        ('CAD', 'PHP', 'Canada to Philippines'),
    ]
    
    corridors = []
    for from_curr, to_curr, description in popular_routes:
        rates = await exchange_service.calculate_rates(from_curr, to_curr)
        
        # Sample calculation for $1000
        amount = 1000
        fee = amount * 0.015 + 2.0
        recipient_gets = (amount - fee) * rates['our_rate']
        
        corridors.append({
            'route': f"{from_curr} → {to_curr}",
            'description': description,
            'from_flag': SUPPORTED_CURRENCIES[from_curr]['flag'],
            'to_flag': SUPPORTED_CURRENCIES[to_curr]['flag'],
            'exchange_rate': rates['our_rate'],
            'example_1000': {
                'send': 1000,
                'fee': round(fee, 2),
                'recipient_gets': round(recipient_gets, 2),
                'currency': to_curr
            }
        })
    
    return {
        'popular_corridors': corridors,
        'note': 'Examples based on sending $1000 equivalent',
        'last_updated': datetime.utcnow()
    }