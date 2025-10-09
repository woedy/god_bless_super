from django.contrib.auth import get_user_model
from rest_framework import serializers
from accounts.models import SystemSettings


User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password2']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def save(self):
        user = User(
            email=self.validated_data['email'].lower(),
            username=self.validated_data['username'],

        )
        password = self.validated_data['password']
        # password2 = self.validated_data['password2']
        # if password != password2:
        #     raise serializers.ValidationError({'password': 'Passwords must match.'})
        user.set_password(password)
        user.is_active = True
        user.save()

        return user




class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)



class ListAllUsersSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['user_id', 'email', 'username',]


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user preferences (theme, notifications)"""
    
    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'username',
            'theme_preference', 'notification_preferences',
            'api_rate_limit', 'last_activity'
        ]
        read_only_fields = ['user_id', 'email', 'username', 'last_activity']


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings"""
    
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'smtp_rotation_enabled', 'proxy_rotation_enabled',
            'delivery_delay_min', 'delivery_delay_max', 'delivery_delay_seed',
            'batch_size', 'sms_rate_limit_per_minute', 'carrier_specific_rate_limits',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']




