"""
SMS Campaign Serializers
"""

from rest_framework import serializers
from .models import SMSCampaign, SMSMessage


class SMSMessageSerializer(serializers.ModelSerializer):
    """Serializer for SMS messages"""
    
    class Meta:
        model = SMSMessage
        fields = [
            'id',
            'campaign',
            'phone_number',
            'carrier',
            'message_content',
            'recipient_data',
            'delivery_status',
            'sent_at',
            'error_message',
            'send_attempts',
            'last_attempt_at',
            'smtp_server',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'delivery_status',
            'sent_at',
            'error_message',
            'send_attempts',
            'last_attempt_at',
            'smtp_server',
            'created_at',
        ]


class SMSCampaignSerializer(serializers.ModelSerializer):
    """Serializer for SMS campaigns"""
    
    message_count = serializers.SerializerMethodField()
    sent_count = serializers.SerializerMethodField()
    failed_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SMSCampaign
        fields = [
            'id',
            'user',
            'name',
            'description',
            'message_template',
            'custom_macros',
            'status',
            'progress',
            'messages_sent',
            'messages_failed',
            'target_carrier',
            'use_smtp_rotation',
            'use_proxy_rotation',
            'batch_size',
            'scheduled_time',
            'created_at',
            'started_at',
            'completed_at',
            'celery_task_id',
            'message_count',
            'sent_count',
            'failed_count',
            'pending_count',
        ]
        read_only_fields = [
            'id',
            'user',
            'status',
            'progress',
            'messages_sent',
            'messages_failed',
            'created_at',
            'started_at',
            'completed_at',
            'celery_task_id',
        ]
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_sent_count(self, obj):
        return obj.messages.filter(delivery_status='sent').count()
    
    def get_failed_count(self, obj):
        return obj.messages.filter(delivery_status='failed').count()
    
    def get_pending_count(self, obj):
        return obj.messages.filter(delivery_status='pending').count()


class SMSCampaignCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating SMS campaigns"""
    
    class Meta:
        model = SMSCampaign
        fields = [
            'name',
            'description',
            'message_template',
            'custom_macros',
            'target_carrier',
            'use_smtp_rotation',
            'use_proxy_rotation',
            'batch_size',
            'scheduled_time',
        ]
    
    def validate_message_template(self, value):
        """Validate that the message template is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Message template cannot be empty")
        return value
    
    def validate_batch_size(self, value):
        """Validate batch size"""
        if value < 1:
            raise serializers.ValidationError("Batch size must be at least 1")
        if value > 1000:
            raise serializers.ValidationError("Batch size cannot exceed 1000")
        return value


class CampaignStatsSerializer(serializers.Serializer):
    """Serializer for campaign statistics"""
    
    campaign_id = serializers.IntegerField()
    campaign_name = serializers.CharField()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    messages_sent = serializers.IntegerField()
    messages_failed = serializers.IntegerField()
    pending_messages = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    scheduled_time = serializers.DateTimeField(allow_null=True)
    status_breakdown = serializers.DictField()
    carrier_breakdown = serializers.DictField()
