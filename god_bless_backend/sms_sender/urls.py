from django.urls import path, include
from rest_framework.routers import DefaultRouter

from sms_sender.views import get_smtps_providers_view, single_SMS_sender_view, get_all_carrier_list_view
from sms_sender import views, campaign_views
from sms_sender.api.smart_delivery_views import SmartDeliveryViewSet
from sms_sender.api.analytics_views import PredictiveAnalyticsViewSet
from sms_sender.api.retry_views import RetryManagementViewSet, RetryAttemptViewSet
from sms_sender.api.template_views import CampaignTemplateViewSet, create_template_from_campaign, get_campaign_template_suggestions, bulk_template_operations
from sms_sender.api.monitoring_views import CampaignMonitoringViewSet, SystemMonitoringViewSet
from sms_sender.api.configuration_views import (
    RotationSettingsViewSet, 
    CampaignDeliverySettingsViewSet, 
    ServerHealthViewSet,
    BulkConfigurationViewSet
)
from sms_sender.api.optimization_views import OptimizationViewSet, ConfigurationImportViewSet
from sms_sender.api.routing_views import (
    RoutingRuleViewSet, ServerCapacityWeightViewSet, 
    GeographicRoutingPreferenceViewSet, RoutingEngineViewSet
)
from sms_sender.api.ab_testing_views import (
    ABTestExperimentViewSet, ABTestVariantViewSet, ABTestResultViewSet,
    CampaignOptimizationRecommendationViewSet, ABTestingDashboardViewSet
)

# Create router for API endpoints
router = DefaultRouter()
router.register(r'smart-delivery', SmartDeliveryViewSet, basename='smart-delivery')
router.register(r'analytics', PredictiveAnalyticsViewSet, basename='analytics')
router.register(r'retry-management', RetryManagementViewSet, basename='retry-management')
router.register(r'retry-attempts', RetryAttemptViewSet, basename='retry-attempts')
router.register(r'templates', CampaignTemplateViewSet, basename='campaign-templates')
router.register(r'monitoring', CampaignMonitoringViewSet, basename='campaign-monitoring')
router.register(r'system-monitoring', SystemMonitoringViewSet, basename='system-monitoring')
router.register(r'rotation-settings', RotationSettingsViewSet, basename='rotation-settings')
router.register(r'campaign-delivery-settings', CampaignDeliverySettingsViewSet, basename='campaign-delivery-settings')
router.register(r'server-health', ServerHealthViewSet, basename='server-health')
router.register(r'bulk-configuration', BulkConfigurationViewSet, basename='bulk-configuration')
router.register(r'optimization', OptimizationViewSet, basename='optimization')
router.register(r'configuration-import', ConfigurationImportViewSet, basename='configuration-import')
router.register(r'routing-rules', RoutingRuleViewSet, basename='routing-rules')
router.register(r'server-capacity-weights', ServerCapacityWeightViewSet, basename='server-capacity-weights')
router.register(r'geographic-preferences', GeographicRoutingPreferenceViewSet, basename='geographic-preferences')
router.register(r'routing-engine', RoutingEngineViewSet, basename='routing-engine')
router.register(r'ab-experiments', ABTestExperimentViewSet, basename='ab-experiments')
router.register(r'ab-variants', ABTestVariantViewSet, basename='ab-variants')
router.register(r'ab-results', ABTestResultViewSet, basename='ab-results')
router.register(r'optimization-recommendations', CampaignOptimizationRecommendationViewSet, basename='optimization-recommendations')
router.register(r'ab-testing-dashboard', ABTestingDashboardViewSet, basename='ab-testing-dashboard')


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
    
    # Template and macro utilities (legacy endpoints)
    path('templates/', campaign_views.get_campaign_templates, name='get_campaign_templates'),
    path('templates/<str:template_id>/', campaign_views.get_template_by_id_view, name='get_template_by_id'),
    path('macros/', campaign_views.get_available_macros, name='get_available_macros'),
    path('process-template/', campaign_views.process_message_template, name='process_message_template'),
    
    # New template management endpoints
    path('api/templates/create-from-campaign/', create_template_from_campaign, name='create_template_from_campaign'),
    path('api/templates/bulk-operations/', bulk_template_operations, name='bulk_template_operations'),
    path('campaigns/<int:campaign_id>/template-suggestions/', get_campaign_template_suggestions, name='campaign_template_suggestions'),
    
    # Rate limiting
    path('rate-limits/', campaign_views.get_rate_limit_info, name='get_rate_limit_info'),
    path('rate-limits/test/', campaign_views.test_rate_limit, name='test_rate_limit'),
    
    # Dashboard
    path('dashboard/', campaign_views.campaign_dashboard, name='campaign_dashboard'),
    
    # Carrier providers
    path('get-all-carrier-list/', get_all_carrier_list_view, name='get_all_carrier_list'),
    
    # Smart delivery API endpoints
    path('api/', include(router.urls)),
]
