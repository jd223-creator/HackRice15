# app/__init__.py

"""
RemitEasy - Low-fee remittance platform with fraud detection
A hackathon project demonstrating blockchain-based international money transfers
"""

__version__ = "1.0.0"
__author__ = "RemitEasy Team"
__description__ = "Low-fee remittance platform with transparent rates and fraud detection"

# Import key components for easy access
from .models import Base, engine, SessionLocal, get_db, User, Transaction
from .services.fraud_detection import fraud_detector
from .services.exchange_rate import exchange_service
from .services.blockchain import blockchain_service

# Configuration constants
APP_NAME = "RemitEasy"
API_VERSION = "v1"
DEFAULT_CURRENCY = "USD"

# Supported currencies (for easy import)
SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD',
    'PHP', 'MXN', 'INR', 'NGN'
]

# Popular remittance corridors
POPULAR_CORRIDORS = [
    ('USD', 'PHP', 'US → Philippines'),
    ('USD', 'MXN', 'US → Mexico'), 
    ('USD', 'INR', 'US → India'),
    ('EUR', 'NGN', 'Europe → Nigeria'),
    ('GBP', 'INR', 'UK → India'),
    ('CAD', 'PHP', 'Canada → Philippines')
]

# Fee structure constants
FEE_STRUCTURES = {
    'standard': {'percentage': 0.015, 'fixed': 2.0},
    'premium': {'percentage': 0.01, 'fixed': 1.0},
    'bulk': {'percentage': 0.008, 'fixed': 0.5}
}

# Initialize database tables on import
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

# Demo/development helper
def get_app_info():
    """Get application information for health checks"""
    return {
        'name': APP_NAME,
        'version': __version__,
        'description': __description__,
        'api_version': API_VERSION,
        'supported_currencies': len(SUPPORTED_CURRENCIES),
        'popular_corridors': len(POPULAR_CORRIDORS)
    }