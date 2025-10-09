"""
SMS Campaign Serializers
"""

from rest_framework import serializers
from .models import (
    SMSCampaign, SMSMessage, RoutingRule, ServerCapacityWeight, 
    GeographicRoutingPreference, ABTestExperiment, ABTestVariant, 
    ABTestAssignment, ABTestResult, CampaignOptimizationRecommendation
)


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


class RoutingRuleSerializer(serializers.ModelSerializer):
    """Serializer for routing rules"""
    
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = RoutingRule
        fields = [
            'id',
            'name',
            'description',
            'conditions',
            'actions',
            'priority',
            'enabled',
            'match_count',
            'success_count',
            'success_rate',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'match_count',
            'success_count',
            'success_rate',
            'created_at',
            'updated_at'
        ]
    
    def get_success_rate(self, obj):
        return obj.get_success_rate()
    
    def validate_conditions(self, value):
        """Validate routing rule conditions"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Conditions must be a dictionary")
        
        # Validate known condition types
        valid_condition_keys = [
            'phone_pattern', 'area_codes', 'carriers', 'states', 
            'timezones', 'time_range'
        ]
        
        for key in value.keys():
            if key not in valid_condition_keys:
                raise serializers.ValidationError(f"Unknown condition key: {key}")
        
        # Validate time_range format
        if 'time_range' in value:
            time_range = value['time_range']
            if not isinstance(time_range, list) or len(time_range) != 2:
                raise serializers.ValidationError("time_range must be a list of two integers [start_hour, end_hour]")
            
            start_hour, end_hour = time_range
            if not (0 <= start_hour <= 23) or not (0 <= end_hour <= 23):
                raise serializers.ValidationError("Hours must be between 0 and 23")
        
        return value
    
    def validate_actions(self, value):
        """Validate routing rule actions"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Actions must be a dictionary")
        
        # Validate known action types
        valid_action_keys = [
            'prefer_server_tags', 'rate_limit_multiplier', 'prefer_high_capacity',
            'prefer_reliable_servers', 'geographic_preference'
        ]
        
        for key in value.keys():
            if key not in valid_action_keys:
                raise serializers.ValidationError(f"Unknown action key: {key}")
        
        # Validate rate_limit_multiplier
        if 'rate_limit_multiplier' in value:
            multiplier = value['rate_limit_multiplier']
            if not isinstance(multiplier, (int, float)) or multiplier <= 0:
                raise serializers.ValidationError("rate_limit_multiplier must be a positive number")
        
        return value
    
    def validate_priority(self, value):
        """Validate priority value"""
        if value < 0 or value > 100:
            raise serializers.ValidationError("Priority must be between 0 and 100")
        return value


class ServerCapacityWeightSerializer(serializers.ModelSerializer):
    """Serializer for server capacity weights"""
    
    server_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ServerCapacityWeight
        fields = [
            'id',
            'server_type',
            'server_id',
            'capacity_weight',
            'max_concurrent_requests',
            'timezone',
            'tags',
            'min_success_rate',
            'max_response_time',
            'server_info',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'server_info',
            'created_at',
            'updated_at'
        ]
    
    def get_server_info(self, obj):
        """Get server information"""
        try:
            if obj.server_type == 'proxy':
                from proxy_server.models import ProxyServer
                server = ProxyServer.objects.get(id=obj.server_id, user=obj.user)
                return {
                    'host': server.host,
                    'port': server.port,
                    'is_active': server.is_active,
                    'is_healthy': getattr(server, 'is_healthy', True),
                    'success_rate': getattr(server, 'success_rate', 0)
                }
            elif obj.server_type == 'smtp':
                from smtps.models import SmtpManager
                server = SmtpManager.objects.get(id=obj.server_id, user=obj.user)
                return {
                    'host': server.host,
                    'port': server.port,
                    'is_active': server.active,
                    'is_healthy': getattr(server, 'is_healthy', True),
                    'success_rate': getattr(server, 'success_rate', 0)
                }
        except Exception:
            return None
        
        return None
    
    def validate_capacity_weight(self, value):
        """Validate capacity weight"""
        if value <= 0 or value > 10:
            raise serializers.ValidationError("Capacity weight must be between 0.1 and 10")
        return value
    
    def validate_max_concurrent_requests(self, value):
        """Validate max concurrent requests"""
        if value < 1 or value > 1000:
            raise serializers.ValidationError("Max concurrent requests must be between 1 and 1000")
        return value
    
    def validate_min_success_rate(self, value):
        """Validate minimum success rate"""
        if value < 0 or value > 100:
            raise serializers.ValidationError("Minimum success rate must be between 0 and 100")
        return value
    
    def validate_max_response_time(self, value):
        """Validate maximum response time"""
        if value <= 0 or value > 60:
            raise serializers.ValidationError("Maximum response time must be between 0.1 and 60 seconds")
        return value


class GeographicRoutingPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for geographic routing preferences"""
    
    coverage_stats = serializers.SerializerMethodField()
    
    class Meta:
        model = GeographicRoutingPreference
        fields = [
            'id',
            'area_codes',
            'states',
            'timezones',
            'preferred_proxy_servers',
            'preferred_smtp_servers',
            'strategy',
            'geographic_weight',
            'performance_weight',
            'enabled',
            'coverage_stats',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'coverage_stats',
            'created_at',
            'updated_at'
        ]
    
    def get_coverage_stats(self, obj):
        """Get coverage statistics"""
        return {
            'area_codes_count': len(obj.area_codes),
            'states_count': len(obj.states),
            'timezones_count': len(obj.timezones),
            'proxy_servers_count': len(obj.preferred_proxy_servers),
            'smtp_servers_count': len(obj.preferred_smtp_servers)
        }
    
    def validate_geographic_weight(self, value):
        """Validate geographic weight"""
        if value < 0 or value > 1:
            raise serializers.ValidationError("Geographic weight must be between 0 and 1")
        return value
    
    def validate_performance_weight(self, value):
        """Validate performance weight"""
        if value < 0 or value > 1:
            raise serializers.ValidationError("Performance weight must be between 0 and 1")
        return value
    
    def validate(self, data):
        """Validate that weights sum to 1.0"""
        geographic_weight = data.get('geographic_weight', 0.3)
        performance_weight = data.get('performance_weight', 0.7)
        
        total_weight = geographic_weight + performance_weight
        if abs(total_weight - 1.0) > 0.01:  # Allow small floating point differences
            raise serializers.ValidationError(
                "Geographic weight and performance weight must sum to 1.0"
            )
        
        return data
    
    def validate_area_codes(self, value):
        """Validate area codes format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Area codes must be a list")
        
        for area_code in value:
            if not isinstance(area_code, str) or len(area_code) != 3 or not area_code.isdigit():
                raise serializers.ValidationError(f"Invalid area code format: {area_code}")
        
        return value
    
    def validate_states(self, value):
        """Validate states format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("States must be a list")
        
        valid_states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
        ]
        
        for state in value:
            if state not in valid_states:
                raise serializers.ValidationError(f"Invalid state code: {state}")
        
        return value


class ABTestExperimentSerializer(serializers.ModelSerializer):
    """Serializer for A/B test experiments"""
    
    duration_days = serializers.SerializerMethodField()
    is_statistically_significant = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()
    total_messages = serializers.SerializerMethodField()
    
    class Meta:
        model = ABTestExperiment
        fields = [
            'id',
            'name',
            'description',
            'test_type',
            'hypothesis',
            'traffic_split',
            'minimum_sample_size',
            'confidence_level',
            'control_config',
            'variant_config',
            'primary_metric',
            'secondary_metrics',
            'status',
            'statistical_significance',
            'confidence_interval',
            'effect_size',
            'winner',
            'duration_days',
            'is_statistically_significant',
            'variant_count',
            'total_messages',
            'created_at',
            'started_at',
            'ended_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'statistical_significance',
            'confidence_interval',
            'effect_size',
            'winner',
            'duration_days',
            'is_statistically_significant',
            'variant_count',
            'total_messages',
            'created_at',
            'started_at',
            'ended_at',
            'updated_at'
        ]
    
    def get_duration_days(self, obj):
        return obj.get_duration_days()
    
    def get_is_statistically_significant(self, obj):
        return obj.is_statistically_significant()
    
    def get_variant_count(self, obj):
        return obj.variants.count()
    
    def get_total_messages(self, obj):
        return sum(variant.total_messages for variant in obj.variants.all())
    
    def validate_traffic_split(self, value):
        """Validate traffic split is between 0 and 1"""
        if not 0 < value < 1:
            raise serializers.ValidationError("Traffic split must be between 0 and 1")
        return value
    
    def validate_minimum_sample_size(self, value):
        """Validate minimum sample size"""
        if value < 10:
            raise serializers.ValidationError("Minimum sample size must be at least 10")
        if value > 10000:
            raise serializers.ValidationError("Minimum sample size cannot exceed 10,000")
        return value
    
    def validate_confidence_level(self, value):
        """Validate confidence level"""
        if not 0.8 <= value <= 0.99:
            raise serializers.ValidationError("Confidence level must be between 0.8 and 0.99")
        return value


class ABTestVariantSerializer(serializers.ModelSerializer):
    """Serializer for A/B test variants"""
    
    experiment_name = serializers.CharField(source='experiment.name', read_only=True)
    
    class Meta:
        model = ABTestVariant
        fields = [
            'id',
            'experiment',
            'experiment_name',
            'name',
            'is_control',
            'configuration',
            'traffic_allocation',
            'total_messages',
            'successful_messages',
            'failed_messages',
            'average_response_time',
            'average_cost',
            'error_count',
            'delivery_rate',
            'success_rate',
            'error_rate',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'experiment_name',
            'total_messages',
            'successful_messages',
            'failed_messages',
            'average_response_time',
            'average_cost',
            'error_count',
            'delivery_rate',
            'success_rate',
            'error_rate',
            'created_at',
            'updated_at'
        ]


class ABTestAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for A/B test assignments"""
    
    experiment_name = serializers.CharField(source='experiment.name', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True)
    phone_number = serializers.CharField(source='message.phone_number', read_only=True)
    
    class Meta:
        model = ABTestAssignment
        fields = [
            'id',
            'experiment',
            'experiment_name',
            'variant',
            'variant_name',
            'message',
            'phone_number',
            'assigned_at',
            'assignment_method',
            'result_recorded',
            'result_recorded_at'
        ]
        read_only_fields = [
            'id',
            'experiment_name',
            'variant_name',
            'phone_number',
            'assigned_at',
            'result_recorded',
            'result_recorded_at'
        ]


class ABTestResultSerializer(serializers.ModelSerializer):
    """Serializer for A/B test results"""
    
    experiment_name = serializers.CharField(source='experiment.name', read_only=True)
    is_significant = serializers.SerializerMethodField()
    winner = serializers.SerializerMethodField()
    
    class Meta:
        model = ABTestResult
        fields = [
            'id',
            'experiment',
            'experiment_name',
            'control_mean',
            'variant_mean',
            'control_std',
            'variant_std',
            't_statistic',
            'p_value',
            'degrees_of_freedom',
            'effect_size',
            'confidence_interval_lower',
            'confidence_interval_upper',
            'minimum_detectable_effect',
            'practical_significance',
            'recommendation',
            'confidence_level',
            'analysis_method',
            'is_significant',
            'winner',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'experiment_name',
            'is_significant',
            'winner',
            'created_at',
            'updated_at'
        ]
    
    def get_is_significant(self, obj):
        return obj.is_significant()
    
    def get_winner(self, obj):
        return obj.get_winner()


class CampaignOptimizationRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for optimization recommendations"""
    
    experiment_name = serializers.CharField(source='experiment.name', read_only=True, allow_null=True)
    
    class Meta:
        model = CampaignOptimizationRecommendation
        fields = [
            'id',
            'experiment',
            'experiment_name',
            'title',
            'description',
            'category',
            'expected_improvement',
            'confidence_score',
            'implementation_effort',
            'configuration_changes',
            'implementation_steps',
            'status',
            'implemented_at',
            'actual_improvement',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'experiment_name',
            'implemented_at',
            'created_at',
            'updated_at'
        ]
    
    def validate_expected_improvement(self, value):
        """Validate expected improvement percentage"""
        if value < 0 or value > 100:
            raise serializers.ValidationError("Expected improvement must be between 0 and 100 percent")
        return value
    
    def validate_confidence_score(self, value):
        """Validate confidence score"""
        if not 0 <= value <= 1:
            raise serializers.ValidationError("Confidence score must be between 0 and 1")
        return value
    
    def validate_actual_improvement(self, value):
        """Validate actual improvement percentage"""
        if value is not None and (value < -100 or value > 100):
            raise serializers.ValidationError("Actual improvement must be between -100 and 100 percent")
        return value
