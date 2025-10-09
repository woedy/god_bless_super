"""
Campaign Template Service
Comprehensive template management for SMS campaigns
"""

from typing import Dict, List, Optional, Tuple
from django.db.models import Q, Avg, Count
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import CampaignTemplate, SMSCampaign, SMSMessage
from .campaign_templates import (
    get_all_templates as get_builtin_templates,
    get_template_by_id as get_builtin_template,
    serialize_template,
    AVAILABLE_MACROS
)

User = get_user_model()


class CampaignTemplateService:
    """Service for managing campaign templates"""
    
    def __init__(self, user: User):
        self.user = user
    
    def get_available_templates(self, category: Optional[str] = None, include_public: bool = True) -> List[Dict]:
        """
        Get all available templates for the user
        
        Args:
            category: Filter by category (optional)
            include_public: Include public templates from other users
            
        Returns:
            List of template dictionaries
        """
        # Build the query filter
        query_filter = Q(user=self.user)
        
        if include_public:
            # Add public templates from other users and system templates
            query_filter |= Q(is_public=True) | Q(is_system_template=True)
        
        queryset = CampaignTemplate.objects.filter(query_filter)
        
        if category:
            queryset = queryset.filter(category=category)
        
        # Order by usage count and creation date
        templates = list(queryset.order_by('-usage_count', '-created_at'))
        
        # Add built-in templates
        builtin_templates = get_builtin_templates()
        if category:
            builtin_templates = [t for t in builtin_templates if t.category == category]
        
        result = []
        
        # Add database templates
        for template in templates:
            result.append({
                'id': f"db_{template.id}",
                'name': template.name,
                'description': template.description,
                'category': template.category,
                'message_template': template.settings.get('message_template', ''),
                'suggested_macros': template.settings.get('suggested_macros', []),
                'use_case': template.settings.get('use_case', ''),
                'usage_count': template.usage_count,
                'average_success_rate': template.average_success_rate,
                'is_public': template.is_public,
                'is_system_template': template.is_system_template,
                'is_owner': template.user == self.user,
                'created_at': template.created_at,
                'source': 'database'
            })
        
        # Add built-in templates
        for template in builtin_templates:
            template_dict = serialize_template(template)
            template_dict.update({
                'usage_count': 0,
                'average_success_rate': None,
                'is_public': True,
                'is_system_template': True,
                'is_owner': False,
                'created_at': None,
                'source': 'builtin'
            })
            result.append(template_dict)
        
        return result
    
    def get_template_by_id(self, template_id: str) -> Optional[Dict]:
        """
        Get a specific template by ID
        
        Args:
            template_id: Template ID (can be builtin ID or db_<id> for database templates)
            
        Returns:
            Template dictionary or None if not found
        """
        if template_id.startswith('db_'):
            # Database template
            db_id = template_id[3:]  # Remove 'db_' prefix
            try:
                template = CampaignTemplate.objects.get(
                    Q(id=db_id) & (
                        Q(user=self.user) | 
                        Q(is_public=True) | 
                        Q(is_system_template=True)
                    )
                )
                return {
                    'id': f"db_{template.id}",
                    'name': template.name,
                    'description': template.description,
                    'category': template.category,
                    'message_template': template.settings.get('message_template', ''),
                    'suggested_macros': template.settings.get('suggested_macros', []),
                    'use_case': template.settings.get('use_case', ''),
                    'usage_count': template.usage_count,
                    'average_success_rate': template.average_success_rate,
                    'is_public': template.is_public,
                    'is_system_template': template.is_system_template,
                    'is_owner': template.user == self.user,
                    'created_at': template.created_at,
                    'source': 'database',
                    'settings': template.settings
                }
            except CampaignTemplate.DoesNotExist:
                return None
        else:
            # Built-in template
            template = get_builtin_template(template_id)
            if template:
                template_dict = serialize_template(template)
                template_dict.update({
                    'usage_count': 0,
                    'average_success_rate': None,
                    'is_public': True,
                    'is_system_template': True,
                    'is_owner': False,
                    'created_at': None,
                    'source': 'builtin'
                })
                return template_dict
            return None
    
    def create_template(self, name: str, description: str, category: str, 
                       settings: Dict, is_public: bool = False) -> CampaignTemplate:
        """
        Create a new template
        
        Args:
            name: Template name
            description: Template description
            category: Template category
            settings: Template settings dictionary
            is_public: Whether to make template public
            
        Returns:
            Created CampaignTemplate instance
        """
        # Validate category
        valid_categories = ['marketing', 'alerts', 'notifications', 'custom']
        if category not in valid_categories:
            raise ValidationError(f"Invalid category. Must be one of: {valid_categories}")
        
        # Validate required settings
        required_fields = ['message_template']
        for field in required_fields:
            if field not in settings:
                raise ValidationError(f"Missing required setting: {field}")
        
        template = CampaignTemplate.objects.create(
            user=self.user,
            name=name,
            description=description,
            category=category,
            settings=settings,
            is_public=is_public
        )
        
        return template
    
    def create_template_from_campaign(self, campaign_id: int, template_name: str, 
                                    template_description: str = "", 
                                    is_public: bool = False) -> CampaignTemplate:
        """
        Create a template from an existing successful campaign
        
        Args:
            campaign_id: ID of the campaign to create template from
            template_name: Name for the new template
            template_description: Description for the new template
            is_public: Whether to make template public
            
        Returns:
            Created CampaignTemplate instance
        """
        try:
            campaign = SMSCampaign.objects.get(id=campaign_id, user=self.user)
        except SMSCampaign.DoesNotExist:
            raise ValidationError("Campaign not found or not owned by user")
        
        # Check if campaign is successful enough to create a template
        if campaign.status != 'completed':
            raise ValidationError("Can only create templates from completed campaigns")
        
        success_rate = self._calculate_campaign_success_rate(campaign)
        if success_rate < 50.0:  # Require at least 50% success rate
            raise ValidationError(f"Campaign success rate ({success_rate:.1f}%) is too low to create a template")
        
        # Extract campaign settings
        settings = {
            'message_template': campaign.message_template,
            'suggested_macros': list(campaign.custom_macros.keys()) if campaign.custom_macros else [],
            'use_case': f"Based on successful campaign: {campaign.name}",
            'campaign_settings': {
                'batch_size': campaign.batch_size,
                'rate_limit': campaign.rate_limit,
                'use_proxy_rotation': campaign.use_proxy_rotation,
                'use_smtp_rotation': campaign.use_smtp_rotation,
                'target_carrier': campaign.target_carrier,
                'target_type': campaign.target_type,
                'target_area_codes': campaign.target_area_codes,
            }
        }
        
        # Add delivery settings if available
        if hasattr(campaign, 'delivery_settings'):
            delivery_settings = campaign.delivery_settings
            settings['delivery_settings'] = {
                'proxy_rotation_strategy': delivery_settings.proxy_rotation_strategy,
                'smtp_rotation_strategy': delivery_settings.smtp_rotation_strategy,
                'custom_delay_enabled': delivery_settings.custom_delay_enabled,
                'custom_delay_min': delivery_settings.custom_delay_min,
                'custom_delay_max': delivery_settings.custom_delay_max,
                'adaptive_optimization_enabled': delivery_settings.adaptive_optimization_enabled,
                'carrier_optimization_enabled': delivery_settings.carrier_optimization_enabled,
                'timezone_optimization_enabled': delivery_settings.timezone_optimization_enabled,
            }
        
        # Determine category based on campaign characteristics
        category = self._determine_template_category(campaign)
        
        template = self.create_template(
            name=template_name,
            description=template_description or f"Template created from campaign '{campaign.name}' with {success_rate:.1f}% success rate",
            category=category,
            settings=settings,
            is_public=is_public
        )
        
        # Set initial success rate
        template.average_success_rate = success_rate
        template.save()
        
        return template
    
    def update_template(self, template_id: str, **kwargs) -> CampaignTemplate:
        """
        Update an existing template
        
        Args:
            template_id: Template ID (must be db_<id> format)
            **kwargs: Fields to update
            
        Returns:
            Updated CampaignTemplate instance
        """
        if not template_id.startswith('db_'):
            raise ValidationError("Can only update database templates")
        
        db_id = template_id[3:]
        try:
            template = CampaignTemplate.objects.get(id=db_id, user=self.user)
        except CampaignTemplate.DoesNotExist:
            raise ValidationError("Template not found or not owned by user")
        
        # Update allowed fields
        allowed_fields = ['name', 'description', 'category', 'settings', 'is_public']
        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(template, field, value)
        
        template.save()
        return template
    
    def delete_template(self, template_id: str) -> bool:
        """
        Delete a template
        
        Args:
            template_id: Template ID (must be db_<id> format)
            
        Returns:
            True if deleted successfully
        """
        if not template_id.startswith('db_'):
            raise ValidationError("Can only delete database templates")
        
        db_id = template_id[3:]
        try:
            template = CampaignTemplate.objects.get(id=db_id, user=self.user)
            template.delete()
            return True
        except CampaignTemplate.DoesNotExist:
            raise ValidationError("Template not found or not owned by user")
    
    def use_template(self, template_id: str, campaign_data: Dict) -> Dict:
        """
        Apply a template to create campaign configuration
        
        Args:
            template_id: Template ID
            campaign_data: Additional campaign data to merge
            
        Returns:
            Complete campaign configuration dictionary
        """
        template = self.get_template_by_id(template_id)
        if not template:
            raise ValidationError("Template not found")
        
        # Increment usage count for database templates
        if template_id.startswith('db_'):
            db_id = template_id[3:]
            try:
                db_template = CampaignTemplate.objects.get(id=db_id)
                db_template.increment_usage()
            except CampaignTemplate.DoesNotExist:
                pass
        
        # Build campaign configuration
        config = {
            'message_template': template['message_template'],
            'custom_macros': template.get('settings', {}).get('custom_macros', {}),
        }
        
        # Add campaign settings if available
        if 'campaign_settings' in template.get('settings', {}):
            campaign_settings = template['settings']['campaign_settings']
            config.update({
                'batch_size': campaign_settings.get('batch_size', 100),
                'rate_limit': campaign_settings.get('rate_limit', 10),
                'use_proxy_rotation': campaign_settings.get('use_proxy_rotation', True),
                'use_smtp_rotation': campaign_settings.get('use_smtp_rotation', True),
                'target_carrier': campaign_settings.get('target_carrier'),
                'target_type': campaign_settings.get('target_type'),
                'target_area_codes': campaign_settings.get('target_area_codes', []),
            })
        
        # Merge with provided campaign data (user overrides)
        config.update(campaign_data)
        
        return config
    
    def get_template_performance_stats(self, template_id: str) -> Dict:
        """
        Get performance statistics for a template
        
        Args:
            template_id: Template ID
            
        Returns:
            Performance statistics dictionary
        """
        if not template_id.startswith('db_'):
            return {
                'usage_count': 0,
                'average_success_rate': None,
                'campaigns_created': 0,
                'total_messages_sent': 0,
                'performance_trend': []
            }
        
        db_id = template_id[3:]
        try:
            template = CampaignTemplate.objects.get(id=db_id)
        except CampaignTemplate.DoesNotExist:
            return {}
        
        # Find campaigns that might have used this template
        # This is approximate since we don't track template usage directly in campaigns
        similar_campaigns = SMSCampaign.objects.filter(
            user=template.user,
            message_template=template.settings.get('message_template', '')
        )
        
        total_messages = 0
        success_rates = []
        
        for campaign in similar_campaigns:
            if campaign.status == 'completed':
                success_rate = self._calculate_campaign_success_rate(campaign)
                success_rates.append(success_rate)
                total_messages += campaign.messages.count()
        
        return {
            'usage_count': template.usage_count,
            'average_success_rate': template.average_success_rate,
            'campaigns_created': similar_campaigns.count(),
            'completed_campaigns': len(success_rates),
            'total_messages_sent': total_messages,
            'success_rate_range': {
                'min': min(success_rates) if success_rates else None,
                'max': max(success_rates) if success_rates else None,
                'avg': sum(success_rates) / len(success_rates) if success_rates else None
            }
        }
    
    def get_public_template_library(self, category: Optional[str] = None) -> List[Dict]:
        """
        Get public templates from the template library
        
        Args:
            category: Filter by category (optional)
            
        Returns:
            List of public template dictionaries
        """
        queryset = CampaignTemplate.objects.filter(
            Q(is_public=True) | Q(is_system_template=True)
        )
        
        if category:
            queryset = queryset.filter(category=category)
        
        # Order by usage count and success rate
        templates = queryset.annotate(
            avg_success=Avg('average_success_rate')
        ).order_by('-usage_count', '-avg_success')
        
        result = []
        for template in templates:
            result.append({
                'id': f"db_{template.id}",
                'name': template.name,
                'description': template.description,
                'category': template.category,
                'usage_count': template.usage_count,
                'average_success_rate': template.average_success_rate,
                'is_system_template': template.is_system_template,
                'created_by': template.user.username if not template.is_system_template else 'System',
                'created_at': template.created_at,
                'use_case': template.settings.get('use_case', ''),
                'suggested_macros': template.settings.get('suggested_macros', [])
            })
        
        return result
    
    def share_template(self, template_id: str, make_public: bool = True) -> CampaignTemplate:
        """
        Share a template by making it public
        
        Args:
            template_id: Template ID (must be db_<id> format)
            make_public: Whether to make template public
            
        Returns:
            Updated CampaignTemplate instance
        """
        if not template_id.startswith('db_'):
            raise ValidationError("Can only share database templates")
        
        db_id = template_id[3:]
        try:
            template = CampaignTemplate.objects.get(id=db_id, user=self.user)
        except CampaignTemplate.DoesNotExist:
            raise ValidationError("Template not found or not owned by user")
        
        template.is_public = make_public
        template.save()
        
        return template
    
    def _calculate_campaign_success_rate(self, campaign: SMSCampaign) -> float:
        """Calculate success rate for a campaign"""
        total_messages = campaign.messages.count()
        if total_messages == 0:
            return 0.0
        
        successful_messages = campaign.messages.filter(
            delivery_status__in=['sent', 'delivered']
        ).count()
        
        return (successful_messages / total_messages) * 100
    
    def _determine_template_category(self, campaign: SMSCampaign) -> str:
        """Determine template category based on campaign characteristics"""
        message = campaign.message_template.lower()
        
        # Marketing indicators
        marketing_keywords = ['sale', 'discount', 'offer', 'promo', 'deal', 'save', '%', 'limited time']
        if any(keyword in message for keyword in marketing_keywords):
            return 'marketing'
        
        # Alert indicators
        alert_keywords = ['alert', 'urgent', 'important', 'notice', 'warning', 'reminder']
        if any(keyword in message for keyword in alert_keywords):
            return 'alerts'
        
        # Notification indicators
        notification_keywords = ['confirmation', 'update', 'status', 'receipt', 'thank you']
        if any(keyword in message for keyword in notification_keywords):
            return 'notifications'
        
        return 'custom'