from rest_framework import serializers
from sms_sender.models import SMSCampaign, SMSMessage, SentSMS, RetryAttempt, CampaignDeliverySettings, CampaignTemplate


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


class RetryAttemptSerializer(serializers.ModelSerializer):
    """Serializer for retry attempts"""
    message_phone_number = serializers.CharField(source='message.phone_number', read_only=True)
    campaign_name = serializers.CharField(source='message.campaign.name', read_only=True)
    retry_proxy_host = serializers.CharField(source='retry_proxy_server.host', read_only=True)
    retry_smtp_host = serializers.CharField(source='retry_smtp_server.host', read_only=True)
    
    class Meta:
        model = RetryAttempt
        fields = [
            'id', 'message', 'attempt_number', 'error_type', 'error_message',
            'retry_delay', 'scheduled_retry_time', 'completed', 'success',
            'completion_time', 'retry_proxy_server', 'retry_smtp_server',
            'created_at', 'message_phone_number', 'campaign_name',
            'retry_proxy_host', 'retry_smtp_host'
        ]
        read_only_fields = [
            'id', 'created_at', 'message_phone_number', 'campaign_name',
            'retry_proxy_host', 'retry_smtp_host'
        ]


class RetryStatsSerializer(serializers.Serializer):
    """Serializer for retry statistics"""
    messages_with_retries = serializers.IntegerField()
    total_retry_attempts = serializers.IntegerField()
    successful_retries = serializers.IntegerField()
    failed_retries = serializers.IntegerField()
    pending_retries = serializers.IntegerField()
    retry_success_rate = serializers.FloatField()
    retry_by_error_type = serializers.DictField()
    
    # Additional fields for global stats
    total_messages = serializers.IntegerField(required=False)
    retry_rate = serializers.FloatField(required=False)
    common_error_types = serializers.ListField(required=False)


class MessageRetryHistorySerializer(serializers.Serializer):
    """Serializer for message retry history"""
    attempt_number = serializers.IntegerField()
    error_type = serializers.CharField()
    error_message = serializers.CharField()
    retry_delay = serializers.IntegerField()
    scheduled_retry_time = serializers.DateTimeField()
    completed = serializers.BooleanField()
    success = serializers.BooleanField()
    completion_time = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()


class RetryConfigurationSerializer(serializers.Serializer):
    """Serializer for retry configuration settings"""
    max_retry_attempts = serializers.IntegerField()
    base_retry_delay = serializers.IntegerField()
    max_retry_delay = serializers.IntegerField()
    carrier_configs = serializers.DictField()
    error_classifications = serializers.DictField()


class CampaignDeliverySettingsSerializer(serializers.ModelSerializer):
    """Serializer for campaign delivery settings"""
    
    class Meta:
        model = CampaignDeliverySettings
        fields = [
            'id', 'campaign', 'use_proxy_rotation', 'proxy_rotation_strategy',
            'use_smtp_rotation', 'smtp_rotation_strategy', 'custom_delay_enabled',
            'custom_delay_min', 'custom_delay_max', 'custom_random_seed',
            'adaptive_optimization_enabled', 'carrier_optimization_enabled',
            'timezone_optimization_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CampaignTemplateSerializer(serializers.ModelSerializer):
    """Serializer for campaign templates"""
    is_owner = serializers.SerializerMethodField()
    template_id = serializers.SerializerMethodField()
    
    class Meta:
        model = CampaignTemplate
        fields = [
            'id', 'template_id', 'name', 'description', 'category', 'settings',
            'usage_count', 'average_success_rate', 'is_public', 'is_system_template',
            'is_owner', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'usage_count', 'average_success_rate', 'created_at', 'updated_at'
        ]
    
    def get_is_owner(self, obj):
        """Check if current user owns this template"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.user == request.user
        return False
    
    def get_template_id(self, obj):
        """Get template ID in the format expected by the frontend"""
        return f"db_{obj.id}"


class CampaignTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating campaign templates"""
    
    class Meta:
        model = CampaignTemplate
        fields = [
            'name', 'description', 'category', 'settings', 'is_public'
        ]
    
    def validate_category(self, value):
        """Validate template category"""
        valid_categories = ['marketing', 'alerts', 'notifications', 'custom']
        if value not in valid_categories:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {valid_categories}"
            )
        return value
    
    def validate_settings(self, value):
        """Validate template settings"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Settings must be a dictionary")
        
        # Require message_template
        if 'message_template' not in value:
            raise serializers.ValidationError("Settings must include 'message_template'")
        
        return value


class CampaignTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing templates"""
    template_id = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    message_template = serializers.SerializerMethodField()
    
    class Meta:
        model = CampaignTemplate
        fields = [
            'id', 'template_id', 'name', 'description', 'category',
            'usage_count', 'average_success_rate', 'is_public',
            'is_system_template', 'is_owner', 'created_at', 'message_template'
        ]
    
    def get_template_id(self, obj):
        return f"db_{obj.id}"
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.user == request.user
        return False
    
    def get_message_template(self, obj):
        """Get message template from settings"""
        return obj.settings.get('message_template', '')
