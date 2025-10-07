from rest_framework import serializers
from sms_sender.models import SMSCampaign, SMSMessage, SentSMS


class SMSMessageSerializer(serializers.ModelSerializer):
    """Serializer for individual SMS messages"""
    
    class Meta:
        model = SMSMessage
        fields = [
            'id', 'campaign', 'phone_number', 'message_content',
            'carrier', 'carrier_gateway', 'delivery_status',
            'smtp_server', 'proxy_used', 'send_attempts',
            'last_attempt_at', 'error_message', 'created_at',
            'queued_at', 'sent_at', 'delivered_at'
        ]
        read_only_fields = ['id', 'created_at', 'queued_at', 'sent_at', 'delivered_at']


class SMSCampaignSerializer(serializers.ModelSerializer):
    """Serializer for SMS campaigns"""
    messages = SMSMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SMSCampaign
        fields = [
            'id', 'user', 'name', 'description', 'message_template',
            'target_carrier', 'target_type', 'target_area_codes',
            'scheduled_time', 'send_immediately', 'batch_size', 'rate_limit',
            'use_proxy_rotation', 'use_smtp_rotation', 'status', 'progress',
            'total_recipients', 'messages_sent', 'messages_delivered', 'messages_failed',
            'celery_task_id', 'created_at', 'updated_at', 'started_at', 'completed_at',
            'messages', 'message_count'
        ]
        read_only_fields = [
            'id', 'progress', 'messages_sent', 'messages_delivered', 'messages_failed',
            'celery_task_id', 'created_at', 'updated_at', 'started_at', 'completed_at'
        ]
    
    def get_message_count(self, obj):
        return obj.messages.count()


class SMSCampaignCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SMS campaigns"""
    recipients = serializers.ListField(
        child=serializers.CharField(max_length=15),
        write_only=True,
        required=False,
        help_text="List of phone numbers to send to"
    )
    
    class Meta:
        model = SMSCampaign
        fields = [
            'name', 'description', 'message_template',
            'target_carrier', 'target_type', 'target_area_codes',
            'scheduled_time', 'send_immediately', 'batch_size', 'rate_limit',
            'use_proxy_rotation', 'use_smtp_rotation', 'recipients'
        ]


class SMSCampaignListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing campaigns"""
    
    class Meta:
        model = SMSCampaign
        fields = [
            'id', 'name', 'description', 'status', 'progress',
            'total_recipients', 'messages_sent', 'messages_delivered', 'messages_failed',
            'created_at', 'scheduled_time', 'started_at', 'completed_at'
        ]


class SentSMSSerializer(serializers.ModelSerializer):
    """Legacy SMS serializer for backward compatibility"""
    
    class Meta:
        model = SentSMS
        fields = ['id', 'user', 'number', 'provider', 'subject', 'message', 'sent']
        read_only_fields = ['id']
