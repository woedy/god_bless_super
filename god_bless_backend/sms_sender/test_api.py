"""
API endpoint tests for sms_sender
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.urls import reverse
from rest_framework import status
from sms_sender.models import SMSCampaign, SMSMessage


@pytest.mark.api
class TestSMSCampaignAPI:
    """Test SMS campaign API endpoints"""
    
    def test_create_campaign(self, authenticated_client, user):
        """Test creating an SMS campaign"""
        url = reverse('sms-campaigns-list')
        data = {
            'name': 'Test Campaign',
            'description': 'Test description',
            'message_template': 'Hello {name}, welcome!',
            'target_carrier': 'Verizon',
            'batch_size': 100
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert SMSCampaign.objects.filter(name='Test Campaign').exists()
    
    def test_list_campaigns(self, authenticated_client, user):
        """Test listing SMS campaigns"""
        for i in range(3):
            SMSCampaign.objects.create(
                user=user,
                name=f'Campaign {i}',
                message_template='Test message'
            )
        
        url = reverse('sms-campaigns-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 3 or len(response.data) >= 3
    
    def test_get_campaign_detail(self, authenticated_client, user):
        """Test getting campaign details"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        
        url = reverse('sms-campaign-detail', kwargs={'pk': campaign.id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Campaign'
    
    def test_update_campaign(self, authenticated_client, user):
        """Test updating a campaign"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        
        url = reverse('sms-campaign-detail', kwargs={'pk': campaign.id})
        data = {
            'name': 'Updated Campaign',
            'status': 'scheduled'
        }
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        campaign.refresh_from_db()
        assert campaign.name == 'Updated Campaign'
    
    def test_delete_campaign(self, authenticated_client, user):
        """Test deleting a campaign"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test'
        )
        
        url = reverse('sms-campaign-detail', kwargs={'pk': campaign.id})
        response = authenticated_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SMSCampaign.objects.filter(id=campaign.id).exists()


@pytest.mark.api
class TestSMSSendingAPI:
    """Test SMS sending API endpoints"""
    
    def test_send_single_sms(self, authenticated_client, user):
        """Test sending a single SMS"""
        url = reverse('send-single-sms')
        data = {
            'phone_number': '1234567890',
            'message': 'Test message',
            'carrier': 'Verizon'
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
    
    def test_send_bulk_sms(self, authenticated_client, user):
        """Test sending bulk SMS"""
        url = reverse('send-bulk-sms')
        data = {
            'phone_numbers': ['1111111111', '2222222222', '3333333333'],
            'message': 'Bulk test message',
            'carrier': 'Verizon'
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
    
    def test_start_campaign(self, authenticated_client, user):
        """Test starting an SMS campaign"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test',
            status='draft'
        )
        
        url = reverse('start-sms-campaign', kwargs={'pk': campaign.id})
        response = authenticated_client.post(url)
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
    
    def test_pause_campaign(self, authenticated_client, user):
        """Test pausing a campaign"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test',
            status='in_progress'
        )
        
        url = reverse('pause-sms-campaign', kwargs={'pk': campaign.id})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.api
class TestSMSTemplatesAPI:
    """Test SMS templates API endpoints"""
    
    def test_list_templates(self, authenticated_client):
        """Test listing SMS templates"""
        url = reverse('sms-templates-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list) or 'results' in response.data
    
    def test_get_template_by_category(self, authenticated_client):
        """Test getting templates by category"""
        url = reverse('sms-templates-list')
        response = authenticated_client.get(url, {'category': 'marketing'})
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.api
class TestSMSDeliveryStatusAPI:
    """Test SMS delivery status API endpoints"""
    
    def test_get_campaign_status(self, authenticated_client, user):
        """Test getting campaign delivery status"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Test Campaign',
            message_template='Test',
            total_recipients=100,
            messages_sent=80,
            messages_delivered=75
        )
        
        url = reverse('sms-campaign-status', kwargs={'pk': campaign.id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_recipients' in response.data
        assert 'messages_sent' in response.data
    
    def test_get_message_status(self, authenticated_client, user):
        """Test getting individual message status"""
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
        
        url = reverse('sms-message-status', kwargs={'pk': message.id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['delivery_status'] == 'sent'
