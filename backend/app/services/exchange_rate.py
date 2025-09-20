import httpx
import asyncio
from typing import Dict

class ExchangeRateService:
    def __init__(self):
        self.base_url = "https://api.exchangerate-api.com/v4/latest"
        # Fallback rates for demo
        self.fallback_rates = {
            'USD': {'PHP': 56.50, 'MXN': 17.25, 'INR': 83.15, 'NGN': 790.00},
            'EUR': {'PHP': 61.20, 'USD': 1.08, 'INR': 89.80},
            'GBP': {'PHP': 71.30, 'USD': 1.26, 'INR': 104.50}
        }
        
    async def get_rate(self, from_currency: str, to_currency: str) -> Dict:
        """Get exchange rate with markup"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/{from_currency}")
                data = response.json()
                
                if to_currency in data['rates']:
                    market_rate = data['rates'][to_currency]
                else:
                    # Use fallback
                    market_rate = self.fallback_rates.get(from_currency, {}).get(to_currency, 1.0)
        
        except Exception:
            # Use fallback rates
            market_rate = self.fallback_rates.get(from_currency, {}).get(to_currency, 1.0)
        
        # Add 1.5% markup (our profit margin)
        our_rate = market_rate * 0.985
        
        # Calculate savings vs competitors (assume 5% markup)
        competitor_rate = market_rate * 0.95
        
        return {
            'from_currency': from_currency,
            'to_currency': to_currency,
            'market_rate': market_rate,
            'our_rate': our_rate,
            'competitor_rate': competitor_rate,
            'our_markup': '1.5%',
            'competitor_markup': '5.0%',
            'savings_percent': '3.7%'
        }

# Global instance
exchange_service = ExchangeRateService()