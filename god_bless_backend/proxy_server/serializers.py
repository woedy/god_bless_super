"""
Serializers for Proxy Server and Rotation Settings
"""
from rest_framework import serializers
from .models import ProxyServer, RotationSettings


class ProxyServerSerializer(serializers.ModelSerializer):
    """Serializer for ProxyServer model"""
    proxy_url = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = ProxyServer
        fields = [
            'id', 'host', 'port', 'username', 'password', 'protocol',
            'is_active', 'is_healthy', 'last_health_check', 'health_check_failures',
            'total_requests', 'successful_requests', 'failed_requests', 'last_used',
            'is_archived', 'created_at', 'updated_at', 'proxy_url', 'success_rate'
        ]
        read_only_fields = [
            'is_healthy', 'last_health_check', 'health_check_failures',
            'total_requests', 'successful_requests', 'failed_requests', 'last_used',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def get_proxy_url(self, obj):
        """Get formatted proxy URL (without credentials for security)"""
        return f"{obj.protocol}://{obj.host}:{obj.port}"
    
    def get_success_rate(self, obj):
        """Calculate success rate"""
        if obj.total_requests > 0:
            return round((obj.successful_requests / obj.total_requests) * 100, 2)
        return 0


class RotationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for RotationSettings model"""
    
    class Meta:
        model = RotationSettings
        fields = [
            'id', 'proxy_rotation_enabled', 'proxy_rotation_strategy',
            'proxy_health_check_interval', 'proxy_max_failures',
            'smtp_rotation_enabled', 'smtp_rotation_strategy',
            'smtp_health_check_interval', 'smtp_max_failures',
            'delivery_delay_enabled', 'delivery_delay_min', 'delivery_delay_max',
            'delivery_delay_random_seed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
