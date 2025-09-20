import secrets
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
import asyncio
import json

class BlockchainService:
    """
    Mock blockchain service for hackathon demo
    Simulates blockchain transactions with realistic delays and confirmations
    """
    
    def __init__(self):
        # Mock network configurations
        self.networks = {
            'ethereum': {
                'name': 'Ethereum Mainnet',
                'explorer_url': 'https://etherscan.io/tx/',
                'avg_confirmation_time': 15,  # seconds
                'gas_fee_range': (5, 25)  # USD
            },
            'polygon': {
                'name': 'Polygon (MATIC)',
                'explorer_url': 'https://polygonscan.com/tx/',
                'avg_confirmation_time': 3,
                'gas_fee_range': (0.01, 0.5)
            },
            'bsc': {
                'name': 'Binance Smart Chain',
                'explorer_url': 'https://bscscan.com/tx/',
                'avg_confirmation_time': 5,
                'gas_fee_range': (0.1, 2)
            }
        }
        
        # Mock transaction storage (in production, this would be a database)
        self.pending_transactions = {}
        self.confirmed_transactions = {}
    
    def generate_transaction_hash(self, transaction_data: Dict) -> str:
        """Generate a realistic-looking transaction hash"""
        # Create a unique identifier based on transaction data and timestamp
        data_string = f"{transaction_data['amount']}_{transaction_data['sender']}_{transaction_data['recipient']}_{time.time()}"
        hash_input = data_string.encode('utf-8')
        
        # Generate SHA-256 hash and take first 64 characters (like Ethereum)
        tx_hash = hashlib.sha256(hash_input).hexdigest()
        return f"0x{tx_hash}"
    
    def estimate_gas_fee(self, network: str = 'polygon', amount: float = None) -> Dict:
        """Estimate gas fees for transaction"""
        if network not in self.networks:
            network = 'polygon'  # Default to cheapest option
        
        net_config = self.networks[network]
        
        # Simulate dynamic gas pricing
        base_fee = net_config['gas_fee_range'][0]
        max_fee = net_config['gas_fee_range'][1]
        
        # Higher amounts might need slightly more gas (very simplified)
        if amount and amount > 10000:
            multiplier = 1.2
        elif amount and amount > 5000:
            multiplier = 1.1
        else:
            multiplier = 1.0
        
        estimated_fee = base_fee * multiplier
        
        return {
            'network': net_config['name'],
            'estimated_fee_usd': round(estimated_fee, 4),
            'max_fee_usd': round(max_fee * multiplier, 4),
            'confirmation_time_seconds': net_config['avg_confirmation_time'],
            'currency': 'USD'
        }
    
    async def initiate_transaction(self, 
                                 amount: float,
                                 sender_address: str,
                                 recipient_address: str,
                                 network: str = 'polygon',
                                 memo: Optional[str] = None) -> Dict:
        """Initiate a blockchain transaction"""
        
        transaction_data = {
            'amount': amount,
            'sender': sender_address,
            'recipient': recipient_address,
            'network': network,
            'memo': memo or f"Remittance ${amount}",
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Generate transaction hash
        tx_hash = self.generate_transaction_hash(transaction_data)
        
        # Get network config
        net_config = self.networks.get(network, self.networks['polygon'])
        
        # Calculate gas fees
        gas_info = self.estimate_gas_fee(network, amount)
        
        # Create transaction record
        transaction_record = {
            'hash': tx_hash,
            'status': 'pending',
            'network': net_config['name'],
            'amount': amount,
            'sender_address': sender_address,
            'recipient_address': recipient_address,
            'gas_fee': gas_info['estimated_fee_usd'],
            'confirmation_time': net_config['avg_confirmation_time'],
            'confirmations': 0,
            'required_confirmations': 12,  # Standard for most networks
            'initiated_at': datetime.utcnow(),
            'memo': transaction_data['memo'],
            'explorer_url': f"{net_config['explorer_url']}{tx_hash}"
        }
        
        # Store as pending
        self.pending_transactions[tx_hash] = transaction_record
        
        # Simulate blockchain processing delay
        asyncio.create_task(self._simulate_confirmation(tx_hash))
        
        return {
            'transaction_hash': tx_hash,
            'status': 'pending',
            'network': net_config['name'],
            'estimated_confirmation_time': f"{net_config['avg_confirmation_time']} seconds",
            'gas_fee_usd': gas_info['estimated_fee_usd'],
            'explorer_url': transaction_record['explorer_url'],
            'initiated_at': transaction_record['initiated_at']
        }
    
    async def _simulate_confirmation(self, tx_hash: str):
        """Simulate blockchain confirmation process"""
        if tx_hash not in self.pending_transactions:
            return
        
        transaction = self.pending_transactions[tx_hash]
        confirmation_time = transaction['confirmation_time']
        
        # Wait for "blockchain confirmation"
        await asyncio.sleep(confirmation_time)
        
        # Move to confirmed
        transaction['status'] = 'confirmed'
        transaction['confirmations'] = transaction['required_confirmations']
        transaction['confirmed_at'] = datetime.utcnow()
        
        self.confirmed_transactions[tx_hash] = transaction
        
        # Remove from pending (in production, you'd keep a full history)
        if tx_hash in self.pending_transactions:
            del self.pending_transactions[tx_hash]
    
    def get_transaction_status(self, tx_hash: str) -> Dict:
        """Get current status of a transaction"""
        
        # Check pending transactions
        if tx_hash in self.pending_transactions:
            tx = self.pending_transactions[tx_hash]
            elapsed_time = (datetime.utcnow() - tx['initiated_at']).total_seconds()
            
            return {
                'transaction_hash': tx_hash,
                'status': 'pending',
                'network': tx['network'],
                'confirmations': f"{min(int(elapsed_time / 2), tx['required_confirmations'] - 1)}/{tx['required_confirmations']}",
                'estimated_completion': tx['initiated_at'] + timedelta(seconds=tx['confirmation_time']),
                'explorer_url': tx['explorer_url'],
                'gas_fee_usd': tx['gas_fee']
            }
        
        # Check confirmed transactions
        if tx_hash in self.confirmed_transactions:
            tx = self.confirmed_transactions[tx_hash]
            return {
                'transaction_hash': tx_hash,
                'status': 'confirmed',
                'network': tx['network'],
                'confirmations': f"{tx['confirmations']}/{tx['required_confirmations']}",
                'confirmed_at': tx['confirmed_at'],
                'explorer_url': tx['explorer_url'],
                'gas_fee_usd': tx['gas_fee'],
                'final': True
            }
        
        # Transaction not found
        return {
            'transaction_hash': tx_hash,
            'status': 'not_found',
            'error': 'Transaction hash not found in our records'
        }
    
    def generate_wallet_address(self, user_id: int, currency: str = 'ETH') -> str:
        """Generate a mock wallet address for a user"""
        # Create deterministic but unique address based on user_id
        seed = f"user_{user_id}_{currency}_{secrets.token_hex(8)}"
        hash_result = hashlib.sha256(seed.encode()).hexdigest()
        
        # Format like Ethereum address
        return f"0x{hash_result[:40]}"
    
    def get_wallet_balance(self, address: str, network: str = 'polygon') -> Dict:
        """Get mock wallet balance"""
        # For demo purposes, generate some realistic balances
        balance_seed = int(address[-8:], 16) % 10000
        
        balances = {
            'native_token': round(balance_seed / 100, 4),  # ETH, MATIC, BNB
            'usdc': round(balance_seed / 10, 2),  # USDC stablecoin
            'usdt': round(balance_seed / 12, 2),  # USDT stablecoin
        }
        
        network_tokens = {
            'ethereum': 'ETH',
            'polygon': 'MATIC', 
            'bsc': 'BNB'
        }
        
        return {
            'address': address,
            'network': self.networks.get(network, self.networks['polygon'])['name'],
            'balances': {
                network_tokens.get(network, 'MATIC'): balances['native_token'],
                'USDC': balances['usdc'],
                'USDT': balances['usdt']
            },
            'total_value_usd': sum(balances.values()),
            'last_updated': datetime.utcnow()
        }
    
    def get_network_stats(self) -> Dict:
        """Get current network statistics for demo"""
        return {
            'supported_networks': list(self.networks.keys()),
            'total_pending_transactions': len(self.pending_transactions),
            'total_confirmed_transactions': len(self.confirmed_transactions),
            'recommended_network': 'polygon',  # Cheapest and fastest
            'network_details': {
                name: {
                    'name': config['name'],
                    'avg_confirmation_time_seconds': config['avg_confirmation_time'],
                    'gas_fee_range_usd': config['gas_fee_range']
                }
                for name, config in self.networks.items()
            }
        }

# Global service instance
blockchain_service = BlockchainService()

# Convenience functions for easy import
async def send_blockchain_transaction(amount: float, sender: str, recipient: str, network: str = 'polygon') -> Dict:
    """Send a transaction on the blockchain"""
    return await blockchain_service.initiate_transaction(amount, sender, recipient, network)

def get_transaction_status(tx_hash: str) -> Dict:
    """Get transaction status"""
    return blockchain_service.get_transaction_status(tx_hash)

def create_wallet_address(user_id: int) -> str:
    """Create wallet address for user"""
    return blockchain_service.generate_wallet_address(user_id)

def estimate_transaction_fee(network: str = 'polygon', amount: float = None) -> Dict:
    """Estimate transaction fees"""
    return blockchain_service.estimate_gas_fee(network, amount)