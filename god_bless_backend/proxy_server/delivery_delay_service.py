"""
Delivery Delay Service
Handles configurable delivery delays with random seeds
"""
import random
import time
from .models import RotationSettings


class DeliveryDelayService:
    """Service for managing delivery delays"""
    
    def __init__(self, user):
        self.user = user
        self.settings = self._get_or_create_settings()
        self._initialize_random()
    
    def _get_or_create_settings(self):
        """Get or create rotation settings for user"""
        settings, created = RotationSettings.objects.get_or_create(
            user=self.user,
            defaults={
                'delivery_delay_enabled': True,
                'delivery_delay_min': 1,
                'delivery_delay_max': 5,
                'delivery_delay_random_seed': None
            }
        )
        return settings
    
    def _initialize_random(self):
        """Initialize random generator with seed if configured"""
        if self.settings.delivery_delay_random_seed is not None:
            random.seed(self.settings.delivery_delay_random_seed)
    
    def get_delay(self) -> float:
        """Get random delay based on settings"""
        if not self.settings.delivery_delay_enabled:
            return 0
        
        min_delay = self.settings.delivery_delay_min
        max_delay = self.settings.delivery_delay_max
        
        # Ensure min is not greater than max
        if min_delay > max_delay:
            min_delay, max_delay = max_delay, min_delay
        
        # Generate random delay
        delay = random.uniform(min_delay, max_delay)
        return delay
    
    def apply_delay(self):
        """Apply delay by sleeping"""
        delay = self.get_delay()
        if delay > 0:
            time.sleep(delay)
        return delay
    
    def get_delay_settings(self):
        """Get current delay settings"""
        return {
            'enabled': self.settings.delivery_delay_enabled,
            'min_delay': self.settings.delivery_delay_min,
            'max_delay': self.settings.delivery_delay_max,
            'random_seed': self.settings.delivery_delay_random_seed
        }
    
    def update_delay_settings(self, enabled=None, min_delay=None, max_delay=None, random_seed=None):
        """Update delay settings"""
        if enabled is not None:
            self.settings.delivery_delay_enabled = enabled
        
        if min_delay is not None:
            self.settings.delivery_delay_min = max(0, min_delay)
        
        if max_delay is not None:
            self.settings.delivery_delay_max = max(0, max_delay)
        
        if random_seed is not None:
            self.settings.delivery_delay_random_seed = random_seed
            self._initialize_random()
        
        self.settings.save()
        return self.get_delay_settings()
