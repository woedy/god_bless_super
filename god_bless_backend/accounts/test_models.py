"""
Unit tests for accounts models
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.contrib.auth import get_user_model
from accounts.models import UserSubscription, SystemSettings
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


@pytest.mark.unit
class TestUserModel:
    """Test User model functionality"""
    
    def test_create_user(self, db):
        """Test creating a regular user"""
        user = User.objects.create_user(
            email='newuser@example.com',
            username='newuser',
            password='password123'
        )
        assert user.email == 'newuser@example.com'
        assert user.username == 'newuser'
        assert user.is_active is True
        assert user.staff is False
        assert user.admin is False
        assert user.check_password('password123')
    
    def test_create_superuser(self, db):
        """Test creating a superuser"""
        user = User.objects.create_superuser(
            email='admin@example.com',
            username='admin',
            password='adminpass'
        )
        assert user.is_admin is True
        assert user.is_staff is True
        assert user.is_active is True
    
    def test_user_str_representation(self, user):
        """Test user string representation"""
        assert str(user) == user.email
    
    def test_user_id_auto_generation(self, db):
        """Test that user_id is automatically generated"""
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='pass123'
        )
        assert user.user_id is not None
        assert len(user.user_id) > 0
    
    def test_auth_token_creation(self, db):
        """Test that auth token is created on user creation"""
        user = User.objects.create_user(
            email='token@example.com',
            username='tokenuser',
            password='pass123'
        )
        from rest_framework.authtoken.models import Token
        token = Token.objects.get(user=user)
        assert token is not None
        assert token.user == user
    
    def test_theme_preference_default(self, user):
        """Test default theme preference"""
        assert user.theme_preference == 'light'
    
    def test_notification_preferences_default(self, user):
        """Test default notification preferences"""
        assert user.notification_preferences == {}
    
    def test_api_rate_limit_default(self, user):
        """Test default API rate limit"""
        assert user.api_rate_limit == 1000
    
    def test_user_search(self, db):
        """Test user search functionality"""
        User.objects.create_user(
            email='search1@example.com',
            username='searchuser1',
            password='pass123'
        )
        User.objects.create_user(
            email='search2@example.com',
            username='searchuser2',
            password='pass123'
        )
        
        results = User.objects.search('search1')
        assert results.count() == 1
        assert results.first().email == 'search1@example.com'


@pytest.mark.unit
class TestUserSubscriptionModel:
    """Test UserSubscription model functionality"""
    
    def test_create_subscription(self, user):
        """Test creating a user subscription"""
        subscription = UserSubscription.objects.create(
            user=user,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_active=True,
            subscription_plan='Monthly'
        )
        assert subscription.user == user
        assert subscription.is_active is True
        assert subscription.subscription_plan == 'Monthly'
    
    def test_subscription_is_active(self, user):
        """Test subscription active status check"""
        subscription = UserSubscription.objects.create(
            user=user,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_active=True
        )
        assert subscription.is_subscription_active() is True
    
    def test_subscription_expired(self, user):
        """Test expired subscription"""
        subscription = UserSubscription.objects.create(
            user=user,
            start_date=timezone.now() - timedelta(days=60),
            end_date=timezone.now() - timedelta(days=30),
            is_active=True
        )
        assert subscription.is_subscription_active() is False
    
    def test_subscription_str_representation(self, user):
        """Test subscription string representation"""
        subscription = UserSubscription.objects.create(
            user=user,
            is_active=True
        )
        assert 'testuser' in str(subscription)
        assert 'Active' in str(subscription)


@pytest.mark.unit
class TestSystemSettingsModel:
    """Test SystemSettings model functionality"""
    
    def test_create_system_settings(self, user):
        """Test creating system settings"""
        settings = SystemSettings.objects.create(
            user=user,
            smtp_rotation_enabled=True,
            proxy_rotation_enabled=True,
            delivery_delay_min=1,
            delivery_delay_max=5,
            batch_size=100
        )
        assert settings.user == user
        assert settings.smtp_rotation_enabled is True
        assert settings.proxy_rotation_enabled is True
        assert settings.batch_size == 100
    
    def test_system_settings_defaults(self, user):
        """Test default system settings values"""
        settings = SystemSettings.objects.create(user=user)
        assert settings.smtp_rotation_enabled is True
        assert settings.proxy_rotation_enabled is True
        assert settings.delivery_delay_min == 1
        assert settings.delivery_delay_max == 5
        assert settings.batch_size == 100
        assert settings.sms_rate_limit_per_minute == 10
    
    def test_carrier_specific_rate_limits(self, user):
        """Test carrier-specific rate limits"""
        settings = SystemSettings.objects.create(
            user=user,
            carrier_specific_rate_limits={
                'verizon': 5,
                'att': 10,
                'tmobile': 8
            }
        )
        assert settings.carrier_specific_rate_limits['verizon'] == 5
        assert settings.carrier_specific_rate_limits['att'] == 10
    
    def test_system_settings_str_representation(self, user):
        """Test system settings string representation"""
        settings = SystemSettings.objects.create(user=user)
        assert 'testuser' in str(settings)
