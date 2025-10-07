from django.contrib.auth import get_user_model
from rest_framework import serializers

from phone_generator.models import PhoneNumber, PhoneGenerationTask


class AllPhoneNumbersSerializer(serializers.ModelSerializer):

    class Meta:
        model = PhoneNumber
        fields = "__all__"


class PhoneGenerationTaskSerializer(serializers.ModelSerializer):
    duration = serializers.ReadOnlyField()
    
    class Meta:
        model = PhoneGenerationTask
        fields = [
            'id', 'area_code', 'quantity', 'carrier_filter', 'type_filter',
            'status', 'progress', 'current_step', 'total_items', 'processed_items',
            'successful_items', 'failed_items', 'celery_task_id', 'result_data',
            'error_message', 'created_at', 'started_at', 'completed_at',
            'estimated_completion', 'duration'
        ]
