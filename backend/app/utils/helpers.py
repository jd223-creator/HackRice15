import re
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union


def generate_reference_number() -> str:
    """Generate unique reference number for transactions"""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M")
    random_part = secrets.token_hex(4).upper()
    return f"RE{timestamp}{random_part}"

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_phone_number(phone: str, country_code: str = None) -> Dict:
    """
    Validate and format phone number
    Returns dict with validation result and formatted number
    """
    try:
        if country_code:
            parsed = phonenumbers.parse(phone, country_code)
        else:
            parsed = phonenumbers.parse(phone, None)
        
        is_valid = phonenumbers.is_valid_number(parsed)
        formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        
        return {
            'valid': is_valid,
            'formatted': formatted,
            'country_code': phonenumbers.region_code_for_number(parsed),
            'carrier': phonenumbers.carrier.name_for_number(parsed, 'en') or 'Unknown'
        }
    except NumberParseException as e:
        return {
            'valid': False,
            'error': str(e),
            'formatted': None,
            'country_code': None
        }

def calculate_fees(amount: float, fee_structure: str = 'standard') -> Dict:
    """
    Calculate transaction fees based on amount and fee structure
    
    Fee structures:
    - standard: 1.5% + $2 fixed
    - premium: 1.0% + $1 fixed (for verified users)
    - bulk: 0.8% + $0.50 fixed (for amounts > $5000)
    """
    
    fee_structures = {
        'standard': {'percentage': 0.015, 'fixed': 2.0},
        'premium': {'percentage': 0.01, 'fixed': 1.0},
        'bulk': {'percentage': 0.008, 'fixed': 0.5}
    }
    
    # Auto-upgrade to bulk for large amounts
    if amount > 5000 and fee_structure == 'standard':
        fee_structure = 'bulk'
    
    structure = fee_structures.get(fee_structure, fee_structures['standard'])
    
    percentage_fee = amount * structure['percentage']
    fixed_fee = structure['fixed']
    total_fee = percentage_fee + fixed_fee
    
    return {
        'amount': amount,
        'fee_structure': fee_structure,
        'percentage_fee': round(percentage_fee, 2),
        'fixed_fee': fixed_fee,
        'total_fee': round(total_fee, 2),
        'fee_percentage': round((total_fee / amount) * 100, 2),
        'amount_after_fee': round(amount - total_fee, 2)
    }

def format_currency(amount: float, currency: str, locale: str = 'en_US') -> str:
    """Format amount as currency string"""
    
    currency_symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
        'PHP': '₱', 'MXN': '$', 'INR': '₹', 'NGN': '₦',
        'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥'
    }
    
    symbol = currency_symbols.get(currency, currency)
    
    # Format with appropriate decimal places
    if currency in ['JPY', 'KRW']:  # Currencies without decimal places
        formatted = f"{symbol}{amount:,.0f}"
    else:
        formatted = f"{symbol}{amount:,.2f}"
    
    return formatted

def get_country_info(country_code: str) -> Dict:
    """Get country information from country code"""
    try:
        country = pycountry.countries.get(alpha_2=country_code.upper())
        if country:
            return {
                'code': country.alpha_2,
                'name': country.name,
                'currency': getattr(country, 'currency', None),
                'flag': f"🇨🇳"  # Simplified - in production use proper flag mapping
            }
    except:
        pass
    
    # Fallback for common countries
    fallback_countries = {
        'US': {'code': 'US', 'name': 'United States', 'currency': 'USD', 'flag': '🇺🇸'},
        'PH': {'code': 'PH', 'name': 'Philippines', 'currency': 'PHP', 'flag': '🇵🇭'},
        'MX': {'code': 'MX', 'name': 'Mexico', 'currency': 'MXN', 'flag': '🇲🇽'},
        'IN': {'code': 'IN', 'name': 'India', 'currency': 'INR', 'flag': '🇮🇳'},
        'NG': {'code': 'NG', 'name': 'Nigeria', 'currency': 'NGN', 'flag': '🇳🇬'},
        'GB': {'code': 'GB', 'name': 'United Kingdom', 'currency': 'GBP', 'flag': '🇬🇧'},
        'CA': {'code': 'CA', 'name': 'Canada', 'currency': 'CAD', 'flag': '🇨🇦'},
    }
    
    return fallback_countries.get(country_code.upper(), {
        'code': country_code.upper(),
        'name': 'Unknown',
        'currency': None,
        'flag': '🌍'
    })

def calculate_savings_vs_competitors(amount: float, our_fee: float) -> Dict:
    """Calculate savings compared to major competitors"""
    
    competitors = {
        'Western Union': {'fee_percentage': 0.06, 'fixed_fee': 5.99},
        'MoneyGram': {'fee_percentage': 0.055, 'fixed_fee': 4.99},
        'Remitly': {'fee_percentage': 0.04, 'fixed_fee': 2.99},
        'Wise': {'fee_percentage': 0.025, 'fixed_fee': 1.50},
        'WorldRemit': {'fee_percentage': 0.045, 'fixed_fee': 3.99}
    }
    
    savings = {}
    for name, fee_structure in competitors.items():
        competitor_fee = (amount * fee_structure['fee_percentage']) + fee_structure['fixed_fee']
        savings_amount = competitor_fee - our_fee
        savings_percentage = (savings_amount / competitor_fee) * 100 if competitor_fee > 0 else 0
        
        savings[name] = {
            'competitor_fee': round(competitor_fee, 2),
            'our_fee': our_fee,
            'savings_amount': round(savings_amount, 2),
            'savings_percentage': round(savings_percentage, 1)
        }
    
    # Find best savings
    best_savings = max(savings.values(), key=lambda x: x['savings_amount'])
    
    return {
        'amount': amount,
        'our_fee': our_fee,
        'competitor_comparison': savings,
        'best_savings': {
            'amount': best_savings['savings_amount'],
            'percentage': best_savings['savings_percentage']
        },
        'average_competitor_fee': round(sum(s['competitor_fee'] for s in savings.values()) / len(savings), 2)
    }

def generate_mock_blockchain_explorer_url(tx_hash: str, network: str = 'polygon') -> str:
    """Generate blockchain explorer URL for mock transactions"""
    explorers = {
        'ethereum': 'https://etherscan.io/tx/',
        'polygon': 'https://polygonscan.com/tx/',
        'bsc': 'https://bscscan.com/tx/',
        'avalanche': 'https://snowtrace.io/tx/'
    }
    
    base_url = explorers.get(network, explorers['polygon'])
    return f"{base_url}{tx_hash}"

def sanitize_input(input_string: str, max_length: int = 255) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not input_string:
        return ""
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', str(input_string))
    
    # Limit length
    sanitized = sanitized[:max_length]
    
    # Strip whitespace
    return sanitized.strip()

def generate_api_key() -> str:
    """Generate API key for webhook integrations"""
    return f"rk_{secrets.token_urlsafe(32)}"

def time_ago(datetime_obj: datetime) -> str:
    """Convert datetime to human readable 'time ago' format"""
    now = datetime.utcnow()
    diff = now - datetime_obj
    
    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years != 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months != 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    else:
        return "Just now"

def calculate_exchange_rate_margin(market_rate: float, our_rate: float) -> Dict:
    """Calculate exchange rate margin and markup"""
    if market_rate == 0:
        return {'margin': 0, 'markup_percentage': 0}
    
    margin = market_rate - our_rate
    markup_percentage = (margin / market_rate) * 100
    
    return {
        'market_rate': market_rate,
        'our_rate': our_rate,
        'margin': round(margin, 6),
        'markup_percentage': round(markup_percentage, 2),
        'competitive': markup_percentage < 3.0  # Less than 3% is competitive
    }

def mask_sensitive_data(data: str, mask_char: str = '*', visible_chars: int = 4) -> str:
    """Mask sensitive data like email or phone numbers"""
    if not data or len(data) <= visible_chars:
        return data
    
    if '@' in data:  # Email
        local, domain = data.split('@')
        if len(local) <= visible_chars:
            return data
        masked_local = local[:2] + mask_char * (len(local) - 4) + local[-2:]
        return f"{masked_local}@{domain}"
    else:  # Phone or other
        return data[:visible_chars] + mask_char * (len(data) - visible_chars * 2) + data[-visible_chars:]

def create_webhook_payload(event_type: str, data: Dict, timestamp: datetime = None) -> Dict:
    """Create standardized webhook payload"""
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    return {
        'event': event_type,
        'timestamp': timestamp.isoformat(),
        'data': data,
        'signature': hashlib.sha256(f"{event_type}:{timestamp.isoformat()}:{str(data)}".encode()).hexdigest()[:16]
    }

def validate_transaction_limits(amount: float, user_tier: str = 'standard') -> Dict:
    """Validate transaction against user limits"""
    
    limits = {
        'standard': {'daily': 2500, 'monthly': 10000, 'per_transaction': 2000},
        'verified': {'daily': 10000, 'monthly': 50000, 'per_transaction': 10000},
        'premium': {'daily': 25000, 'monthly': 100000, 'per_transaction': 25000}
    }
    
    user_limits = limits.get(user_tier, limits['standard'])
    
    validation_result = {
        'amount': amount,
        'user_tier': user_tier,
        'limits': user_limits,
        'valid': True,
        'violations': []
    }
    
    if amount > user_limits['per_transaction']:
        validation_result['valid'] = False
        validation_result['violations'].append(f"Amount exceeds per-transaction limit of {format_currency(user_limits['per_transaction'], 'USD')}")
    
    return validation_result

# Demo data generators for hackathon
def generate_demo_transactions(user_id: int, count: int = 5) -> List[Dict]:
    """Generate demo transaction data for testing"""
    
    recipients = [
        {'name': 'Maria Santos', 'email': 'maria.santos@email.com', 'country': 'PH'},
        {'name': 'Juan Rodriguez', 'email': 'juan.rodriguez@email.com', 'country': 'MX'},
        {'name': 'Priya Sharma', 'email': 'priya.sharma@email.com', 'country': 'IN'},
        {'name': 'James Wilson', 'email': 'james.wilson@email.com', 'country': 'GB'},
        {'name': 'Sarah Johnson', 'email': 'sarah.johnson@email.com', 'country': 'CA'}
    ]
    
    currencies = {'PH': 'PHP', 'MX': 'MXN', 'IN': 'INR', 'GB': 'GBP', 'CA': 'CAD'}
    amounts = [500, 750, 1200, 2000, 850, 1500, 3000]
    
    transactions = []
    for i in range(count):
        recipient = recipients[i % len(recipients)]
        amount = amounts[i % len(amounts)]
        
        transaction = {
            'id': i + 1,
            'sender_id': user_id,
            'recipient_name': recipient['name'],
            'recipient_email': recipient['email'],
            'amount': amount,
            'source_currency': 'USD',
            'target_currency': currencies[recipient['country']],
            'reference_number': generate_reference_number(),
            'status': 'completed' if i < count - 2 else 'pending',
            'created_at': datetime.utcnow() - timedelta(days=i * 2, hours=i * 3)
        }
        
        transactions.append(transaction)
    
    return transactions