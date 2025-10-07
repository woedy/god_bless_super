from django.urls import path

from sms_sender.views import get_smtps_providers_view, single_SMS_sender_view
from sms_sender import views, campaign_views


app_name = 'sms_sender'

urlpatterns = [
    # Legacy SMS endpoints
    path('get-smtps-providers/', get_smtps_providers_view, name="get_smtps_providers_view"),
    path('send-single-sms/', single_SMS_sender_view, name="single_SMS_sender_view"),
    path('send-bulk-sms/', views.bulk_SMS_sender_view, name="bulk_SMS_sender_view"),
    
    # Campaign management
    path('campaigns/', campaign_views.campaign_list_create, name='campaign_list_create'),
    path('campaigns/<int:campaign_id>/', campaign_views.campaign_detail, name='campaign_detail'),
    path('campaigns/<int:campaign_id>/start/', campaign_views.campaign_start, name='campaign_start'),
    path('campaigns/<int:campaign_id>/pause/', campaign_views.campaign_pause, name='campaign_pause'),
    path('campaigns/<int:campaign_id>/cancel/', campaign_views.campaign_cancel, name='campaign_cancel'),
    path('campaigns/<int:campaign_id>/stats/', campaign_views.campaign_stats, name='campaign_stats'),
    path('campaigns/<int:campaign_id>/messages/', campaign_views.campaign_messages, name='campaign_messages'),
    path('campaigns/<int:campaign_id>/recipients/', campaign_views.campaign_add_recipients, name='campaign_add_recipients'),
    
    # Template and macro utilities
    path('templates/', campaign_views.get_campaign_templates, name='get_campaign_templates'),
    path('templates/<str:template_id>/', campaign_views.get_template_by_id_view, name='get_template_by_id'),
    path('macros/', campaign_views.get_available_macros, name='get_available_macros'),
    path('process-template/', campaign_views.process_message_template, name='process_message_template'),
    
    # Rate limiting
    path('rate-limits/', campaign_views.get_rate_limit_info, name='get_rate_limit_info'),
    path('rate-limits/test/', campaign_views.test_rate_limit, name='test_rate_limit'),
    
    # Dashboard
    path('dashboard/', campaign_views.campaign_dashboard, name='campaign_dashboard'),
]
