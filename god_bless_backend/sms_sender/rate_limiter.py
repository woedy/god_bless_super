"""
Carrier-Specific Rate Limiting System
Prevents spam detection by implementing intelligent rate limits per carrier
"""

from typing import Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import time


# Carrier-specific rate limits (messages per minute)
CARRIER_RATE_LIMITS = {
    "AT&T": 10,
    "Verizon": 12,
    "T-Mobile": 15,
    "Sprint": 10,
    "Metro by T-Mobile": 15,
    "Cricket Wireless": 8,
    "Boost Mobile": 10,
    "Virgin Mobile": 10,
    "U.S. Cellular": 8,
    "Google Fi": 12,
    "Mint Mobile": 10,
    "Visible": 12,
    "Xfinity Mobile": 10,
    "Consumer Cellular": 8,
    "TracFone": 8,
    "Total Wireless": 8,
    "Simple Mobile": 10,
    "default": 10,  # Default rate limit for unknown carriers
}


# Recommended delays between messages (seconds)
CARRIER_DELAYS = {
    "AT&T": 6,
    "Verizon": 5,
    "T-Mobile": 4,
    "Sprint": 6,
    "Metro by T-Mobile": 4,
    "Cricket Wireless": 8,
    "Boost Mobile": 6,
    "Virgin Mobile": 6,
    "U.S. Cellular": 8,
    "Google Fi": 5,
    "Mint Mobile": 6,
    "Visible": 5,
    "Xfinity Mobile": 6,
    "Consumer Cellular": 8,
    "TracFone": 8,
    "Total Wireless": 8,
    "Simple Mobile": 6,
    "default": 6,
}


class RateLimiter:
    """Rate limiter for SMS campaigns with carrier-specific limits"""
    
    def __init__(self):
        """Initialize the rate limiter"""
        self.message_history: Dict[str, list] = defaultdict(list)
        self.last_send_time: Dict[str, datetime] = {}
    
    def can_send(self, carrier: str, campaign_id: Optional[str] = None) -> bool:
        """
        Check if a message can be sent to a specific carrier
        
        Args:
            carrier: Carrier name
            campaign_id: Optional campaign ID for tracking
        
        Returns:
            True if message can be sent, False otherwise
        """
        key = f"{campaign_id}:{carrier}" if campaign_id else carrier
        rate_limit = self.get_rate_limit(carrier)
        
        # Clean up old entries (older than 1 minute)
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)
        self.message_history[key] = [
            ts for ts in self.message_history[key] if ts > cutoff
        ]
        
        # Check if we're under the rate limit
        return len(self.message_history[key]) < rate_limit
    
    def record_send(self, carrier: str, campaign_id: Optional[str] = None):
        """
        Record a message send
        
        Args:
            carrier: Carrier name
            campaign_id: Optional campaign ID for tracking
        """
        key = f"{campaign_id}:{carrier}" if campaign_id else carrier
        now = datetime.now()
        self.message_history[key].append(now)
        self.last_send_time[key] = now
    
    def get_wait_time(self, carrier: str, campaign_id: Optional[str] = None) -> float:
        """
        Get the recommended wait time before sending next message
        
        Args:
            carrier: Carrier name
            campaign_id: Optional campaign ID for tracking
        
        Returns:
            Wait time in seconds
        """
        key = f"{campaign_id}:{carrier}" if campaign_id else carrier
        delay = self.get_delay(carrier)
        
        if key in self.last_send_time:
            elapsed = (datetime.now() - self.last_send_time[key]).total_seconds()
            if elapsed < delay:
                return delay - elapsed
        
        return 0
    
    def wait_if_needed(self, carrier: str, campaign_id: Optional[str] = None):
        """
        Wait if necessary to respect rate limits
        
        Args:
            carrier: Carrier name
            campaign_id: Optional campaign ID for tracking
        """
        wait_time = self.get_wait_time(carrier, campaign_id)
        if wait_time > 0:
            time.sleep(wait_time)
    
    def get_rate_limit(self, carrier: str) -> int:
        """Get rate limit for a specific carrier"""
        return CARRIER_RATE_LIMITS.get(carrier, CARRIER_RATE_LIMITS["default"])
    
    def get_delay(self, carrier: str) -> int:
        """Get recommended delay for a specific carrier"""
        return CARRIER_DELAYS.get(carrier, CARRIER_DELAYS["default"])
    
    def get_stats(self, carrier: str, campaign_id: Optional[str] = None) -> Dict:
        """
        Get rate limiting statistics
        
        Args:
            carrier: Carrier name
            campaign_id: Optional campaign ID for tracking
        
        Returns:
            Dictionary with statistics
        """
        key = f"{campaign_id}:{carrier}" if campaign_id else carrier
        rate_limit = self.get_rate_limit(carrier)
        
        # Clean up old entries
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)
        self.message_history[key] = [
            ts for ts in self.message_history[key] if ts > cutoff
        ]
        
        current_count = len(self.message_history[key])
        
        return {
            "carrier": carrier,
            "rate_limit": rate_limit,
            "current_count": current_count,
            "available_slots": rate_limit - current_count,
            "can_send": current_count < rate_limit,
            "recommended_delay": self.get_delay(carrier),
            "wait_time": self.get_wait_time(carrier, campaign_id)
        }
    
    def reset(self, carrier: Optional[str] = None, campaign_id: Optional[str] = None):
        """
        Reset rate limiter for a carrier or campaign
        
        Args:
            carrier: Optional carrier name (resets all if None)
            campaign_id: Optional campaign ID
        """
        if carrier and campaign_id:
            key = f"{campaign_id}:{carrier}"
            if key in self.message_history:
                del self.message_history[key]
            if key in self.last_send_time:
                del self.last_send_time[key]
        elif carrier:
            # Reset all entries for this carrier
            keys_to_delete = [k for k in self.message_history.keys() if carrier in k]
            for key in keys_to_delete:
                del self.message_history[key]
                if key in self.last_send_time:
                    del self.last_send_time[key]
        else:
            # Reset everything
            self.message_history.clear()
            self.last_send_time.clear()


# Singleton instance
rate_limiter = RateLimiter()


def can_send(carrier: str, campaign_id: Optional[str] = None) -> bool:
    """Convenience function to check if message can be sent"""
    return rate_limiter.can_send(carrier, campaign_id)


def record_send(carrier: str, campaign_id: Optional[str] = None):
    """Convenience function to record a send"""
    rate_limiter.record_send(carrier, campaign_id)


def wait_if_needed(carrier: str, campaign_id: Optional[str] = None):
    """Convenience function to wait if needed"""
    rate_limiter.wait_if_needed(carrier, campaign_id)


def get_rate_limit(carrier: str) -> int:
    """Convenience function to get rate limit"""
    return rate_limiter.get_rate_limit(carrier)
