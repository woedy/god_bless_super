from django.contrib.auth import get_user_model
from rest_framework import serializers

from smtps.models import SmtpManager




class SmtpManagerSerializer(serializers.ModelSerializer):

    class Meta:
        model = SmtpManager
        fields = "__all__"
        read_only_fields = [
            'id',
            'user',
            'created_at',
            'updated_at',
            'last_health_check',
            'health_check_failures',
            'total_emails_sent',
            'successful_emails',
            'failed_emails',
            'last_used',
            'average_response_time',
            'last_response_time',
            'consecutive_failures',
            'last_error_message'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
