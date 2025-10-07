#!/usr/bin/env python
"""
Integration verification script for God Bless America platform.
Tests all core functionality end-to-end.
"""
import os
import sys
import django
import time

# Try to import colorama, fallback to no colors if not available
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    # Fallback: no colors
    class Fore:
        GREEN = RED = YELLOW = BLUE = CYAN = ''
    class Style:
        RESET_ALL = ''
    HAS_COLOR = False

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.authtoken.models import Token
from phone_generator.models import PhoneNumber
from sms_sender.models import SMSCampaign

User = get_user_model()


class IntegrationVerifier:
    """Verify platform integration and functionality."""
    
    def __init__(self):
        self.client = Client()
        self.user = None
        self.token = None
        self.passed = 0
        self.failed = 0
        self.warnings = 0
    
    def print_header(self, text):
        """Print section header."""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}{text}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    
    def print_success(self, text):
        """Print success message."""
        print(f"{Fore.GREEN}✓ {text}{Style.RESET_ALL}")
        self.passed += 1
    
    def print_error(self, text):
        """Print error message."""
        print(f"{Fore.RED}✗ {text}{Style.RESET_ALL}")
        self.failed += 1
    
    def print_warning(self, text):
        """Print warning message."""
        print(f"{Fore.YELLOW}⚠ {text}{Style.RESET_ALL}")
        self.warnings += 1
    
    def print_info(self, text):
        """Print info message."""
        print(f"{Fore.BLUE}ℹ {text}{Style.RESET_ALL}")
    
    def setup_test_user(self):
        """Create test user and authentication token."""
        self.print_header("Setting Up Test Environment")
        
        try:
            # Clean up existing test user and tokens
            try:
                existing_user = User.objects.filter(username='integration_test').first()
                if existing_user:
                    # Delete token first
                    Token.objects.filter(user=existing_user).delete()
                    # Then delete user
                    existing_user.delete()
                    self.print_info("Cleaned up existing test user")
            except Exception as cleanup_error:
                self.print_warning(f"Cleanup warning: {str(cleanup_error)}")
            
            # Create test user
            self.user = User.objects.create_user(
                username='integration_test',
                email='integration@test.com',
                password='TestPass123!',
                is_active=True
            )
            
            # Get or create token
            self.token, created = Token.objects.get_or_create(user=self.user)
            
            self.print_success("Test user created successfully")
            self.print_info(f"Username: {self.user.username}")
            self.print_info(f"Token: {self.token.key[:20]}...")
            
            return True
        except Exception as e:
            self.print_error(f"Failed to create test user: {str(e)}")
            import traceback
            self.print_error(traceback.format_exc())
            return False
    
    def test_authentication(self):
        """Test authentication endpoints."""
        self.print_header("Testing Authentication")
        
        # Test login
        try:
            response = self.client.post('/api/accounts/login/', {
                'username': 'integration_test',
                'password': 'TestPass123!'
            })
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data:
                    self.print_success("Login endpoint working")
                else:
                    self.print_error("Login response missing token")
            else:
                self.print_error(f"Login failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Login test failed: {str(e)}")
        
        # Test authenticated request
        try:
            response = self.client.get(
                '/api/phone-generator/numbers/',
                HTTP_AUTHORIZATION=f'Token {self.token.key}'
            )
            
            if response.status_code == 200:
                self.print_success("Token authentication working")
            else:
                self.print_error(f"Token auth failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Token auth test failed: {str(e)}")
        
        # Test unauthorized access
        try:
            response = self.client.get('/api/phone-generator/numbers/')
            
            if response.status_code == 401:
                self.print_success("Unauthorized access properly blocked")
            else:
                self.print_warning(f"Unauthorized access returned {response.status_code}")
        except Exception as e:
            self.print_error(f"Unauthorized test failed: {str(e)}")
    
    def test_phone_generation(self):
        """Test phone number generation."""
        self.print_header("Testing Phone Number Generation")
        
        try:
            # Test generation endpoint
            response = self.client.post(
                '/api/phone-generator/generate/',
                {
                    'area_code': '555',
                    'quantity': 10,
                    'carrier': 'Verizon'
                },
                HTTP_AUTHORIZATION=f'Token {self.token.key}',
                content_type='application/json'
            )
            
            if response.status_code in [200, 201]:
                self.print_success("Phone generation endpoint accessible")
                data = response.json()
                
                if 'task_id' in data:
                    self.print_success("Background task created for generation")
                    self.print_info(f"Task ID: {data['task_id']}")
                else:
                    self.print_warning("No task_id in response (may be synchronous)")
            else:
                self.print_error(f"Generation failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Phone generation test failed: {str(e)}")
        
        # Test retrieval
        try:
            response = self.client.get(
                '/api/phone-generator/numbers/',
                HTTP_AUTHORIZATION=f'Token {self.token.key}'
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data:
                    self.print_success("Phone number retrieval working")
                    self.print_info(f"Total numbers: {data.get('count', 0)}")
                else:
                    self.print_warning("Unexpected response format")
            else:
                self.print_error(f"Retrieval failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Phone retrieval test failed: {str(e)}")
    
    def test_phone_validation(self):
        """Test phone number validation."""
        self.print_header("Testing Phone Number Validation")
        
        # Create test numbers
        try:
            test_numbers = []
            for i in range(3):
                number = PhoneNumber.objects.create(
                    number=f'555999{i:04d}',
                    area_code='555',
                    carrier='Verizon',
                    number_type='mobile',
                    created_by=self.user,
                    is_valid=False
                )
                test_numbers.append(number.number)
            
            self.print_success(f"Created {len(test_numbers)} test numbers")
        except Exception as e:
            self.print_error(f"Failed to create test numbers: {str(e)}")
            return
        
        # Test validation endpoint
        try:
            response = self.client.post(
                '/api/phone-validator/validate-bulk/',
                {
                    'phone_numbers': test_numbers
                },
                HTTP_AUTHORIZATION=f'Token {self.token.key}',
                content_type='application/json'
            )
            
            if response.status_code == 200:
                self.print_success("Validation endpoint accessible")
                data = response.json()
                
                if 'task_id' in data:
                    self.print_success("Background validation task created")
                else:
                    self.print_warning("No task_id in response")
            else:
                self.print_error(f"Validation failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Validation test failed: {str(e)}")
    
    def test_sms_campaigns(self):
        """Test SMS campaign functionality."""
        self.print_header("Testing SMS Campaign Management")
        
        # Test campaign creation
        try:
            response = self.client.post(
                '/api/sms-campaigns/',
                {
                    'name': 'Integration Test Campaign',
                    'message_template': 'Hello {{name}}, this is a test.',
                    'status': 'draft'
                },
                HTTP_AUTHORIZATION=f'Token {self.token.key}',
                content_type='application/json'
            )
            
            if response.status_code in [200, 201]:
                self.print_success("Campaign creation working")
                data = response.json()
                campaign_id = data.get('id')
                
                if campaign_id:
                    self.print_info(f"Campaign ID: {campaign_id}")
                    
                    # Test campaign retrieval
                    response = self.client.get(
                        f'/api/sms-campaigns/{campaign_id}/',
                        HTTP_AUTHORIZATION=f'Token {self.token.key}'
                    )
                    
                    if response.status_code == 200:
                        self.print_success("Campaign retrieval working")
                    else:
                        self.print_error("Campaign retrieval failed")
            else:
                self.print_error(f"Campaign creation failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"SMS campaign test failed: {str(e)}")
        
        # Test campaign list
        try:
            response = self.client.get(
                '/api/sms-campaigns/',
                HTTP_AUTHORIZATION=f'Token {self.token.key}'
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data:
                    self.print_success("Campaign listing working")
                    self.print_info(f"Total campaigns: {data.get('count', 0)}")
                else:
                    self.print_warning("Unexpected response format")
            else:
                self.print_error(f"Campaign list failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Campaign list test failed: {str(e)}")
    
    def test_data_export(self):
        """Test data export functionality."""
        self.print_header("Testing Data Export")
        
        try:
            response = self.client.post(
                '/api/phone-generator/export/',
                {
                    'format': 'csv',
                    'filters': {'area_code': '555'}
                },
                HTTP_AUTHORIZATION=f'Token {self.token.key}',
                content_type='application/json'
            )
            
            if response.status_code == 200:
                self.print_success("Export endpoint working")
                
                # Check content type
                content_type = response.get('Content-Type', '')
                if 'csv' in content_type or 'text' in content_type:
                    self.print_success("Export returns correct content type")
                else:
                    self.print_warning(f"Unexpected content type: {content_type}")
            else:
                self.print_error(f"Export failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Export test failed: {str(e)}")
    
    def test_settings_management(self):
        """Test settings endpoints."""
        self.print_header("Testing Settings Management")
        
        try:
            response = self.client.get(
                '/api/settings/',
                HTTP_AUTHORIZATION=f'Token {self.token.key}'
            )
            
            if response.status_code == 200:
                self.print_success("Settings retrieval working")
                data = response.json()
                
                # Check for expected settings
                if 'theme' in data or 'smtp_servers' in data:
                    self.print_success("Settings contain expected fields")
                else:
                    self.print_warning("Settings may be incomplete")
            else:
                self.print_error(f"Settings retrieval failed with status {response.status_code}")
        except Exception as e:
            self.print_error(f"Settings test failed: {str(e)}")
    
    def test_error_handling(self):
        """Test error handling."""
        self.print_header("Testing Error Handling")
        
        # Test invalid request
        try:
            response = self.client.post(
                '/api/phone-generator/generate/',
                {
                    'area_code': 'invalid',
                    'quantity': -1
                },
                HTTP_AUTHORIZATION=f'Token {self.token.key}',
                content_type='application/json'
            )
            
            if response.status_code == 400:
                self.print_success("Invalid requests properly rejected")
                data = response.json()
                
                if 'error' in data or 'message' in data:
                    self.print_success("Error responses include helpful messages")
                else:
                    self.print_warning("Error response format could be improved")
            else:
                self.print_warning(f"Invalid request returned {response.status_code}")
        except Exception as e:
            self.print_error(f"Error handling test failed: {str(e)}")
        
        # Test non-existent resource
        try:
            response = self.client.get(
                '/api/sms-campaigns/99999/',
                HTTP_AUTHORIZATION=f'Token {self.token.key}'
            )
            
            if response.status_code == 404:
                self.print_success("Non-existent resources return 404")
            else:
                self.print_warning(f"Non-existent resource returned {response.status_code}")
        except Exception as e:
            self.print_error(f"404 test failed: {str(e)}")
    
    def test_database_models(self):
        """Test database models and relationships."""
        self.print_header("Testing Database Models")
        
        try:
            # Test PhoneNumber model
            phone = PhoneNumber.objects.create(
                number='5551112222',
                area_code='555',
                carrier='Verizon',
                number_type='mobile',
                created_by=self.user,
                is_valid=True
            )
            self.print_success("PhoneNumber model working")
            
            # Test relationships
            user_phones = PhoneNumber.objects.filter(created_by=self.user)
            self.print_success(f"User relationships working ({user_phones.count()} numbers)")
            
            # Clean up
            phone.delete()
        except Exception as e:
            self.print_error(f"Database model test failed: {str(e)}")
    
    def cleanup(self):
        """Clean up test data."""
        self.print_header("Cleaning Up Test Data")
        
        try:
            # Delete test user and related data
            if self.user:
                PhoneNumber.objects.filter(created_by=self.user).delete()
                SMSCampaign.objects.filter(user=self.user).delete()
                self.user.delete()
                self.print_success("Test data cleaned up")
        except Exception as e:
            self.print_error(f"Cleanup failed: {str(e)}")
    
    def print_summary(self):
        """Print test summary."""
        self.print_header("Test Summary")
        
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0
        
        print(f"\n{Fore.GREEN}Passed: {self.passed}{Style.RESET_ALL}")
        print(f"{Fore.RED}Failed: {self.failed}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Warnings: {self.warnings}{Style.RESET_ALL}")
        print(f"\n{Fore.CYAN}Pass Rate: {pass_rate:.1f}%{Style.RESET_ALL}")
        
        if self.failed == 0:
            print(f"\n{Fore.GREEN}{'='*60}")
            print(f"{Fore.GREEN}✓ All integration tests passed!{Style.RESET_ALL}")
            print(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}\n")
            return 0
        else:
            print(f"\n{Fore.RED}{'='*60}")
            print(f"{Fore.RED}✗ Some tests failed. Please review the errors above.{Style.RESET_ALL}")
            print(f"{Fore.RED}{'='*60}{Style.RESET_ALL}\n")
            return 1
    
    def run_all_tests(self):
        """Run all integration tests."""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}God Bless America Platform - Integration Verification")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")
        
        if not self.setup_test_user():
            print(f"\n{Fore.RED}Failed to set up test environment. Aborting.{Style.RESET_ALL}\n")
            return 1
        
        # Run all tests
        self.test_authentication()
        self.test_phone_generation()
        self.test_phone_validation()
        self.test_sms_campaigns()
        self.test_data_export()
        self.test_settings_management()
        self.test_error_handling()
        self.test_database_models()
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        return self.print_summary()


if __name__ == '__main__':
    verifier = IntegrationVerifier()
    exit_code = verifier.run_all_tests()
    sys.exit(exit_code)
