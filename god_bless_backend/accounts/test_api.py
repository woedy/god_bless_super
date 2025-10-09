"""
API endpoint tests for accounts
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.api
class TestAuthenticationAPI:
    """Test authentication API endpoints"""
    
    def test_user_registration(self, api_client):
        """Test user registration endpoint"""
        url = reverse('register')
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'securepass123',
            'password2': 'securepass123'
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]
        assert User.objects.filter(email='newuser@example.com').exists()
    
    def test_user_login(self, api_client, user):
        """Test user login endpoint"""
        url = reverse('login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data or 'key' in response.data
    
    def test_user_login_invalid_credentials(self, api_client, user):
        """Test login with invalid credentials"""
        url = reverse('login')
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]
    
    def test_user_logout(self, authenticated_client):
        """Test user logout endpoint"""
        url = reverse('logout')
        response = authenticated_client.post(url)
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]
    
    def test_get_user_profile(self, authenticated_client, user):
        """Test getting user profile"""
        url = reverse('user-profile')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
    
    def test_update_user_profile(self, authenticated_client, user):
        """Test updating user profile"""
        url = reverse('user-profile')
        data = {
            'theme_preference': 'dark',
            'notification_preferences': {'email': True, 'sms': False}
        }
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.theme_preference == 'dark'


@pytest.mark.api
class TestSystemSettingsAPI:
    """Test system settings API endpoints"""
    
    def test_get_system_settings(self, authenticated_client, user):
        """Test getting system settings"""
        from accounts.models import SystemSettings
        SystemSettings.objects.create(user=user)
        
        url = reverse('system-settings')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'smtp_rotation_enabled' in response.data
    
    def test_update_system_settings(self, authenticated_client, user):
        """Test updating system settings"""
        from accounts.models import SystemSettings
        settings = SystemSettings.objects.create(user=user)
        
        url = reverse('system-settings')
        data = {
            'smtp_rotation_enabled': False,
            'batch_size': 200,
            'delivery_delay_min': 2
        }
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        settings.refresh_from_db()
        assert settings.smtp_rotation_enabled is False
        assert settings.batch_size == 200
    
    def test_unauthorized_access(self, api_client):
        """Test unauthorized access to settings"""
        url = reverse('system-settings')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
