"""
Unit tests for sms_sender models
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.contrib.auth import get_user_model
from sms_sender.models import SMSCampaign, SMSMessage
from django.utils import timezone

User = get_user_model()


@pytest.mark.unit
class TestSMSCampaignModel:
    """Test SMSCampaign model functionality"""
    
    def test_create_campaign(self, user):
        """Test creating an SMS campaign"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            description='Test description',
            message_template='Hello {name}, welcome!',
            status='draft'
        )
        assert campaign.name == 'Test Campaign'
        assert campaign.user == user
        assert campaign.status == 'draft'
        assert campaign.progress == 0
    
    def test_campaign_defaults(self, user):
        """Test campaign default values"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test message'
        )
        assert campaign.status == 'draft'
        assert campaign.batch_size == 100
        assert campaign.rate_limit == 10
        assert campaign.use_proxy_rotation is True
        assert campaign.use_smtp_rotation is True
        assert campaign.progress == 0
    
    def test_campaign_custom_macros(self, user):
        """Test campaign custom macros"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Hello {name}',
            custom_macros={'company': 'ACME Corp', 'offer': '50% off'}
        )
        assert campaign.custom_macros['company'] == 'ACME Corp'
        assert campaign.custom_macros['offer'] == '50% off'
    
    def test_campaign_targeting(self, user):
        """Test campaign targeting options"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test',
            target_carrier='Verizon',
            target_type='mobile',
            target_area_codes=['123', '456', '789']
        )
        assert campaign.target_carrier == 'Verizon'
        assert campaign.target_type == 'mobile'
        assert len(campaign.target_area_codes) == 3
    
    def test_campaign_scheduling(self, user):
        """Test campaign scheduling"""
        scheduled_time = timezone.now() + timezone.timedelta(hours=2)
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Scheduled Campaign',
            message_template='Test',
            scheduled_time=scheduled_time,
            send_immediately=False
        )
        assert campaign.scheduled_time == scheduled_time
        assert campaign.send_immediately is False
    
    def test_campaign_metrics(self, user):
        """Test campaign metrics tracking"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test',
            total_recipients=1000,
            messages_sent=800,
            messages_delivered=750,
            messages_failed=50
        )
        assert campaign.total_recipients == 1000
        assert campaign.messages_sent == 800
        assert campaign.messages_delivered == 750
        assert campaign.messages_failed == 50
    
    def test_campaign_str_representation(self, user):
        """Test campaign string representation"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test',
            status='in_progress'
        )
        campaign_str = str(campaign)
        assert 'Test Campaign' in campaign_str
        assert 'in_progress' in campaign_str


@pytest.mark.unit
class TestSMSMessageModel:
    """Test SMSMessage model functionality"""
    
    def test_create_message(self, user):
        """Test creating an SMS message"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Hello John, welcome!',
            delivery_status='pending'
        )
        assert message.campaign == campaign
        assert message.phone_number == '1234567890'
        assert message.delivery_status == 'pending'
    
    def test_message_defaults(self, user):
        """Test message default values"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test message'
        )
        assert message.delivery_status == 'pending'
        assert message.send_attempts == 0
    
    def test_message_recipient_data(self, user):
        """Test message recipient data"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test',
            recipient_data={
                'name': 'John Doe',
                'location': 'New York',
                'custom_field': 'value'
            }
        )
        assert message.recipient_data['name'] == 'John Doe'
        assert message.recipient_data['location'] == 'New York'
    
    def test_message_carrier_info(self, user):
        """Test message carrier information"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test',
            carrier='Verizon',
            carrier_gateway='vtext.com'
        )
        assert message.carrier == 'Verizon'
        assert message.carrier_gateway == 'vtext.com'
    
    def test_message_delivery_tracking(self, user):
        """Test message delivery tracking"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test',
            smtp_server='smtp.gmail.com',
            proxy_used='proxy1.example.com'
        )
        assert message.smtp_server == 'smtp.gmail.com'
        assert message.proxy_used == 'proxy1.example.com'
    
    def test_message_attempt_tracking(self, user):
        """Test message send attempt tracking"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test',
            send_attempts=3,
            last_attempt_at=timezone.now(),
            error_message='Connection timeout'
        )
        assert message.send_attempts == 3
        assert message.last_attempt_at is not None
        assert message.error_message == 'Connection timeout'
    
    def test_message_timestamps(self, user):
        """Test message timestamp tracking"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        now = timezone.now()
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test',
            queued_at=now,
            sent_at=now + timezone.timedelta(seconds=5),
            delivered_at=now + timezone.timedelta(seconds=10)
        )
        assert message.queued_at is not None
        assert message.sent_at is not None
        assert message.delivered_at is not None
    
    def test_message_str_representation(self, user):
        """Test message string representation"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        message = SMSMessage.objects.create(
            campaign=campaign,
            phone_number='1234567890',
            message_content='Test',
            delivery_status='sent'
        )
        message_str = str(message)
        assert '1234567890' in message_str
        assert 'sent' in message_str
