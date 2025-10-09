"""
Smart Delivery Engine
Intelligent delivery optimization based on carrier and performance data
"""
import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from django.utils import timezone
from django.db.models import Q, Avg, Count
from django.core.cache import cache

from proxy_server.models import ProxyServer
from smtps.models import SmtpManager
from .models import CarrierPerformanceLog, SMSMessage, CampaignDeliverySettings


logger = logging.getLogger(__name__)


class SmartDeliveryEngine:
    """Intelligent delivery optimization based on carrier and performance data"""
    
    # US carrier patterns for phone number detection
    CARRIER_PATTERNS = {
        'verizon': [
            # Verizon Wireless area codes (major ones)
            '201', '202', '203', '205', '206', '207', '208', '209', '210',
            '212', '213', '214', '215', '216', '217', '218', '219', '224',
            '225', '228', '229', '231', '234', '239', '240', '248', '251',
            '252', '253', '254', '256', '260', '262', '267', '269', '270',
            '276', '281', '301', '302', '303', '304', '305', '307', '308',
            '309', '310', '312', '313', '314', '315', '316', '317', '318',
            '319', '320', '321', '323', '325', '330', '331', '334', '336',
            '337', '339', '347', '351', '352', '360', '361', '386', '401',
            '402', '404', '405', '406', '407', '408', '409', '410', '412',
            '413', '414', '415', '417', '419', '423', '424', '425', '430',
            '432', '434', '435', '440', '443', '445', '464', '469', '470',
            '475', '478', '479', '480', '484', '501', '502', '503', '504',
            '505', '507', '508', '509', '510', '512', '513', '515', '516',
            '517', '518', '520', '530', '540', '541', '551', '559', '561',
            '562', '563', '564', '567', '570', '571', '573', '574', '575',
            '580', '585', '586', '601', '602', '603', '605', '606', '607',
            '608', '609', '610', '612', '614', '615', '616', '617', '618',
            '619', '620', '623', '626', '628', '629', '630', '631', '636',
            '641', '646', '650', '651', '657', '660', '661', '662', '667',
            '678', '681', '682', '701', '702', '703', '704', '706', '707',
            '708', '712', '713', '714', '715', '716', '717', '718', '719',
            '720', '724', '725', '727', '731', '732', '734', '737', '740',
            '747', '754', '757', '760', '762', '763', '765', '770', '772',
            '773', '774', '775', '781', '785', '786', '787', '801', '802',
            '803', '804', '805', '806', '808', '810', '812', '813', '814',
            '815', '816', '817', '818', '828', '830', '831', '832', '843',
            '845', '847', '848', '850', '856', '857', '858', '859', '860',
            '862', '863', '864', '865', '870', '872', '878', '901', '903',
            '904', '906', '907', '908', '909', '910', '912', '913', '914',
            '915', '916', '917', '918', '919', '920', '925', '928', '929',
            '931', '934', '936', '937', '940', '941', '947', '949', '951',
            '952', '954', '956', '959', '970', '971', '972', '973', '978',
            '979', '980', '984', '985', '989'
        ],
        'att': [
            # AT&T area codes (major ones)
            '205', '251', '256', '334', '938', '907', '480', '520', '602',
            '623', '928', '479', '501', '870', '209', '213', '310', '323',
            '408', '415', '424', '442', '510', '530', '559', '562', '619',
            '626', '628', '650', '657', '661', '669', '707', '714', '747',
            '760', '805', '818', '831', '858', '909', '916', '925', '949',
            '951', '303', '719', '720', '970', '203', '475', '860', '959',
            '202', '302', '239', '305', '321', '352', '386', '407', '561',
            '689', '727', '754', '772', '786', '813', '850', '863', '904',
            '941', '954', '229', '404', '470', '478', '678', '706', '762',
            '770', '912', '808', '208', '986', '217', '224', '309', '312',
            '331', '618', '630', '708', '773', '815', '847', '872', '219',
            '260', '317', '463', '574', '765', '812', '319', '515', '563',
            '641', '712', '316', '620', '785', '913', '270', '364', '502',
            '606', '859', '225', '318', '337', '504', '985', '207', '227',
            '240', '301', '410', '443', '667', '339', '351', '413', '508',
            '617', '774', '781', '857', '978', '231', '248', '269', '313',
            '517', '586', '616', '679', '734', '810', '906', '947', '989',
            '218', '320', '507', '612', '651', '763', '952', '228', '601',
            '662', '769', '314', '417', '573', '636', '660', '816', '975',
            '406', '308', '402', '531', '702', '725', '775', '603', '201',
            '551', '609', '732', '848', '856', '862', '908', '973', '505',
            '575', '212', '315', '347', '516', '518', '585', '607', '631',
            '646', '680', '716', '718', '845', '914', '917', '929', '934',
            '252', '336', '704', '828', '910', '919', '980', '984', '701',
            '216', '220', '234', '330', '419', '440', '513', '567', '614',
            '740', '937', '405', '539', '580', '918', '458', '503', '541',
            '971', '215', '267', '272', '412', '484', '570', '610', '717',
            '724', '814', '878', '401', '803', '843', '854', '864', '605',
            '423', '615', '629', '731', '865', '901', '931', '214', '254',
            '281', '409', '430', '432', '469', '512', '713', '737', '806',
            '817', '832', '903', '915', '936', '940', '956', '972', '979',
            '385', '435', '801', '802', '276', '434', '540', '571', '703',
            '757', '804', '206', '253', '360', '425', '509', '564', '206',
            '304', '681', '262', '414', '534', '608', '715', '920', '307'
        ],
        'tmobile': [
            # T-Mobile area codes (major ones)
            '205', '251', '256', '334', '659', '938', '907', '480', '520',
            '602', '623', '928', '479', '501', '870', '209', '213', '279',
            '310', '323', '408', '415', '424', '442', '510', '530', '559',
            '562', '619', '626', '628', '650', '657', '661', '669', '707',
            '714', '747', '760', '805', '818', '831', '858', '909', '916',
            '925', '949', '951', '303', '719', '720', '970', '203', '475',
            '860', '959', '202', '302', '239', '305', '321', '352', '386',
            '407', '561', '689', '727', '754', '772', '786', '813', '850',
            '863', '904', '941', '954', '229', '404', '470', '478', '678',
            '706', '762', '770', '912', '808', '208', '986', '217', '224',
            '309', '312', '331', '618', '630', '708', '773', '815', '847',
            '872', '219', '260', '317', '463', '574', '765', '812', '319',
            '515', '563', '641', '712', '316', '620', '785', '913', '270',
            '364', '502', '606', '859', '225', '318', '337', '504', '985',
            '207', '227', '240', '301', '410', '443', '667', '339', '351',
            '413', '508', '617', '774', '781', '857', '978', '231', '248',
            '269', '313', '517', '586', '616', '679', '734', '810', '906',
            '947', '989', '218', '320', '507', '612', '651', '763', '952',
            '228', '601', '662', '769', '314', '417', '573', '636', '660',
            '816', '975', '406', '308', '402', '531', '702', '725', '775',
            '603', '201', '551', '609', '732', '848', '856', '862', '908',
            '973', '505', '575', '212', '315', '347', '516', '518', '585',
            '607', '631', '646', '680', '716', '718', '845', '914', '917',
            '929', '934', '252', '336', '704', '828', '910', '919', '980',
            '984', '701', '216', '220', '234', '330', '419', '440', '513',
            '567', '614', '740', '937', '405', '539', '580', '918', '458',
            '503', '541', '971', '215', '267', '272', '412', '484', '570',
            '610', '717', '724', '814', '878', '401', '803', '843', '854',
            '864', '605', '423', '615', '629', '731', '865', '901', '931',
            '214', '254', '281', '409', '430', '432', '469', '512', '713',
            '737', '806', '817', '832', '903', '915', '936', '940', '956',
            '972', '979', '385', '435', '801', '802', '276', '434', '540',
            '571', '703', '757', '804', '206', '253', '360', '425', '509',
            '564', '206', '304', '681', '262', '414', '534', '608', '715',
            '920', '307'
        ],
        'sprint': [
            # Sprint/T-Mobile (merged) area codes
            '205', '251', '256', '334', '659', '938', '907', '480', '520',
            '602', '623', '928', '479', '501', '870', '209', '213', '279',
            '310', '323', '408', '415', '424', '442', '510', '530', '559',
            '562', '619', '626', '628', '650', '657', '661', '669', '707',
            '714', '747', '760', '805', '818', '831', '858', '909', '916',
            '925', '949', '951'
        ]
    }
    
    # Timezone mapping for US area codes (simplified)
    TIMEZONE_MAP = {
        # Eastern Time
        'eastern': [
            '201', '202', '203', '207', '212', '215', '216', '217', '240',
            '267', '301', '302', '304', '305', '315', '321', '339', '347',
            '351', '352', '386', '401', '404', '407', '410', '412', '413',
            '423', '443', '470', '478', '484', '508', '513', '516', '518',
            '561', '567', '570', '571', '585', '607', '610', '614', '617',
            '631', '646', '667', '678', '680', '689', '703', '706', '716',
            '717', '718', '724', '727', '732', '734', '740', '754', '757',
            '762', '770', '772', '774', '781', '786', '803', '804', '813',
            '828', '843', '845', '848', '850', '854', '856', '857', '859',
            '862', '863', '864', '878', '904', '908', '910', '912', '914',
            '917', '919', '929', '934', '937', '941', '947', '954', '973',
            '978', '980', '984'
        ],
        # Central Time
        'central': [
            '205', '214', '218', '224', '225', '228', '251', '254', '256',
            '260', '262', '269', '270', '281', '309', '312', '314', '316',
            '317', '318', '319', '320', '331', '334', '337', '361', '364',
            '409', '414', '417', '430', '432', '434', '463', '469', '479',
            '501', '502', '504', '507', '512', '515', '563', '573', '574',
            '580', '601', '606', '608', '612', '615', '618', '620', '629',
            '630', '636', '641', '651', '660', '662', '708', '712', '713',
            '715', '731', '737', '763', '765', '769', '773', '785', '806',
            '812', '815', '816', '817', '832', '847', '870', '872', '901',
            '903', '913', '915', '918', '920', '931', '936', '940', '952',
            '956', '972', '975', '979', '985', '989'
        ],
        # Mountain Time
        'mountain': [
            '208', '303', '307', '385', '406', '435', '480', '505', '520',
            '575', '602', '623', '719', '720', '801', '928', '970', '986'
        ],
        # Pacific Time
        'pacific': [
            '206', '209', '213', '253', '279', '310', '323', '360', '408',
            '415', '424', '442', '458', '503', '510', '530', '541', '559',
            '562', '564', '619', '626', '628', '650', '657', '661', '669',
            '702', '707', '714', '725', '747', '760', '775', '805', '818',
            '831', '858', '909', '916', '925', '949', '951', '971'
        ]
    }
    
    def __init__(self, user, campaign):
        self.user = user
        self.campaign = campaign
        self.logger = logging.getLogger(f"{__name__}.{user.id}.{campaign.id}")
        
        # Get campaign delivery settings
        try:
            self.delivery_settings = CampaignDeliverySettings.objects.get(campaign=campaign)
        except CampaignDeliverySettings.DoesNotExist:
            # Create default settings if they don't exist
            self.delivery_settings = CampaignDeliverySettings.objects.create(
                campaign=campaign,
                adaptive_optimization_enabled=True,
                carrier_optimization_enabled=True,
                timezone_optimization_enabled=True
            )
    
    def detect_carrier_from_phone(self, phone_number: str) -> str:
        """
        Detect carrier from phone number using area code patterns
        This is a simplified implementation - in production, you'd use a carrier lookup service
        """
        # Clean phone number to extract area code
        cleaned_number = re.sub(r'[^\d]', '', phone_number)
        
        if len(cleaned_number) >= 10:
            area_code = cleaned_number[-10:-7]  # Extract area code from 10-digit number
            
            # Check each carrier's area codes
            for carrier, area_codes in self.CARRIER_PATTERNS.items():
                if area_code in area_codes:
                    return carrier
        
        # Default to 'unknown' if no match found
        return 'unknown'
    
    def get_timezone_from_phone(self, phone_number: str) -> str:
        """
        Get timezone from phone number using area code
        """
        # Clean phone number to extract area code
        cleaned_number = re.sub(r'[^\d]', '', phone_number)
        
        if len(cleaned_number) >= 10:
            area_code = cleaned_number[-10:-7]  # Extract area code from 10-digit number
            
            # Check each timezone's area codes
            for tz, area_codes in self.TIMEZONE_MAP.items():
                if area_code in area_codes:
                    return tz
        
        # Default to 'eastern' if no match found
        return 'eastern'
    
    def get_optimal_server_combination(self, carrier: str, phone_number: str) -> Tuple[Optional[ProxyServer], Optional[SmtpManager]]:
        """
        Get optimal server combination based on carrier performance data
        """
        if not self.delivery_settings.carrier_optimization_enabled:
            self.logger.debug("Carrier optimization disabled, using standard rotation")
            return None, None
        
        cache_key = f"optimal_servers_{self.user.id}_{carrier}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            proxy_id, smtp_id = cached_result
            try:
                proxy = ProxyServer.objects.get(id=proxy_id, user=self.user, is_active=True, is_healthy=True)
                smtp = SmtpManager.objects.get(id=smtp_id, user=self.user, active=True, is_healthy=True)
                self.logger.debug(f"Using cached optimal combination for carrier {carrier}")
                return proxy, smtp
            except (ProxyServer.DoesNotExist, SmtpManager.DoesNotExist):
                # Cache is stale, continue to find new combination
                cache.delete(cache_key)
        
        # Find the best performing combination for this carrier
        best_performance = CarrierPerformanceLog.objects.filter(
            carrier=carrier,
            proxy_server__user=self.user,
            smtp_server__user=self.user,
            proxy_server__is_active=True,
            smtp_server__active=True,
            proxy_server__is_healthy=True,
            smtp_server__is_healthy=True,
            messages_sent__gte=10  # Only consider combinations with at least 10 messages
        ).order_by('-success_rate', '-messages_sent').first()
        
        if best_performance and best_performance.success_rate >= 80:
            # Cache the result for 5 minutes
            cache.set(cache_key, (best_performance.proxy_server.id, best_performance.smtp_server.id), 300)
            
            self.logger.info(f"Using optimized combination for carrier {carrier}: "
                           f"Proxy {best_performance.proxy_server.id}, SMTP {best_performance.smtp_server.id} "
                           f"(success rate: {best_performance.success_rate:.1f}%)")
            
            return best_performance.proxy_server, best_performance.smtp_server
        
        # If no optimal combination found, try to find servers with good general performance
        best_proxy = ProxyServer.objects.filter(
            user=self.user,
            is_active=True,
            is_healthy=True
        ).order_by('-success_rate', '-total_requests').first()
        
        best_smtp = SmtpManager.objects.filter(
            user=self.user,
            active=True,
            is_healthy=True
        ).order_by('-success_rate', '-total_sent').first()
        
        if best_proxy and best_smtp:
            self.logger.debug(f"Using best general performance servers for carrier {carrier}")
            return best_proxy, best_smtp
        
        self.logger.warning(f"No optimal servers found for carrier {carrier}")
        return None, None
    
    def calculate_adaptive_rate_limit(self, carrier: str) -> int:
        """
        Calculate adaptive rate limit based on real-time delivery feedback
        """
        if not self.delivery_settings.adaptive_optimization_enabled:
            return self.campaign.rate_limit
        
        # Get recent performance data for this carrier (last hour)
        recent_cutoff = timezone.now() - timedelta(hours=1)
        
        recent_messages = SMSMessage.objects.filter(
            campaign__user=self.user,
            carrier=carrier,
            created_at__gte=recent_cutoff
        )
        
        if not recent_messages.exists():
            # No recent data, use default rate limit
            return self.campaign.rate_limit
        
        # Calculate success rate for recent messages
        total_recent = recent_messages.count()
        successful_recent = recent_messages.filter(
            delivery_status__in=['sent', 'delivered']
        ).count()
        
        if total_recent == 0:
            return self.campaign.rate_limit
        
        success_rate = (successful_recent / total_recent) * 100
        
        # Adjust rate limit based on success rate
        base_rate = self.campaign.rate_limit
        
        if success_rate >= 95:
            # Very high success rate, increase rate limit by 50%
            adaptive_rate = int(base_rate * 1.5)
        elif success_rate >= 85:
            # Good success rate, increase rate limit by 25%
            adaptive_rate = int(base_rate * 1.25)
        elif success_rate >= 70:
            # Moderate success rate, keep current rate
            adaptive_rate = base_rate
        elif success_rate >= 50:
            # Low success rate, decrease rate limit by 25%
            adaptive_rate = int(base_rate * 0.75)
        else:
            # Very low success rate, decrease rate limit by 50%
            adaptive_rate = int(base_rate * 0.5)
        
        # Ensure minimum rate limit of 1
        adaptive_rate = max(1, adaptive_rate)
        
        self.logger.info(f"Adaptive rate limit for carrier {carrier}: {adaptive_rate} "
                        f"(base: {base_rate}, success rate: {success_rate:.1f}%)")
        
        return adaptive_rate
    
    def predict_optimal_send_time(self, phone_number: str) -> datetime:
        """
        Predict optimal send time based on timezone and delivery patterns
        """
        if not self.delivery_settings.timezone_optimization_enabled:
            return timezone.now()
        
        # Get timezone for the phone number
        phone_timezone = self.get_timezone_from_phone(phone_number)
        
        # Define optimal sending hours for each timezone (in local time)
        optimal_hours = {
            'eastern': (9, 18),    # 9 AM - 6 PM Eastern
            'central': (9, 18),    # 9 AM - 6 PM Central
            'mountain': (9, 18),   # 9 AM - 6 PM Mountain
            'pacific': (9, 18),    # 9 AM - 6 PM Pacific
        }
        
        # Get current time
        now = timezone.now()
        
        # Calculate timezone offset from UTC
        timezone_offsets = {
            'eastern': -5,   # EST (ignoring DST for simplicity)
            'central': -6,   # CST
            'mountain': -7,  # MST
            'pacific': -8,   # PST
        }
        
        offset = timezone_offsets.get(phone_timezone, -5)  # Default to Eastern
        local_time = now + timedelta(hours=offset)
        local_hour = local_time.hour
        
        start_hour, end_hour = optimal_hours.get(phone_timezone, (9, 18))
        
        if start_hour <= local_hour <= end_hour:
            # Current time is within optimal hours, send now
            optimal_time = now
        elif local_hour < start_hour:
            # Too early, schedule for start of optimal window
            optimal_time = now.replace(
                hour=start_hour - offset,
                minute=0,
                second=0,
                microsecond=0
            )
            # Adjust for timezone offset
            optimal_time = optimal_time - timedelta(hours=offset)
        else:
            # Too late, schedule for next day's optimal window
            next_day = now + timedelta(days=1)
            optimal_time = next_day.replace(
                hour=start_hour - offset,
                minute=0,
                second=0,
                microsecond=0
            )
            # Adjust for timezone offset
            optimal_time = optimal_time - timedelta(hours=offset)
        
        self.logger.debug(f"Optimal send time for {phone_number} ({phone_timezone}): {optimal_time}")
        return optimal_time
    
    def analyze_delivery_patterns(self) -> Dict[str, Any]:
        """
        Analyze delivery patterns for optimization insights
        """
        # Get campaign messages for analysis
        messages = SMSMessage.objects.filter(campaign=self.campaign)
        
        if not messages.exists():
            return {
                'total_messages': 0,
                'carrier_breakdown': {},
                'timezone_breakdown': {},
                'performance_insights': []
            }
        
        # Analyze by carrier
        carrier_stats = {}
        timezone_stats = {}
        
        for message in messages:
            carrier = message.carrier or self.detect_carrier_from_phone(message.phone_number)
            timezone_name = self.get_timezone_from_phone(message.phone_number)
            
            # Carrier stats
            if carrier not in carrier_stats:
                carrier_stats[carrier] = {
                    'total': 0,
                    'sent': 0,
                    'delivered': 0,
                    'failed': 0,
                    'avg_response_time': 0
                }
            
            carrier_stats[carrier]['total'] += 1
            
            if message.delivery_status == 'sent':
                carrier_stats[carrier]['sent'] += 1
            elif message.delivery_status == 'delivered':
                carrier_stats[carrier]['delivered'] += 1
            elif message.delivery_status == 'failed':
                carrier_stats[carrier]['failed'] += 1
            
            if message.total_processing_time:
                carrier_stats[carrier]['avg_response_time'] += message.total_processing_time
            
            # Timezone stats
            if timezone_name not in timezone_stats:
                timezone_stats[timezone_name] = {
                    'total': 0,
                    'sent': 0,
                    'delivered': 0,
                    'failed': 0
                }
            
            timezone_stats[timezone_name]['total'] += 1
            
            if message.delivery_status == 'sent':
                timezone_stats[timezone_name]['sent'] += 1
            elif message.delivery_status == 'delivered':
                timezone_stats[timezone_name]['delivered'] += 1
            elif message.delivery_status == 'failed':
                timezone_stats[timezone_name]['failed'] += 1
        
        # Calculate averages and success rates
        for carrier, stats in carrier_stats.items():
            if stats['total'] > 0:
                stats['success_rate'] = ((stats['sent'] + stats['delivered']) / stats['total']) * 100
                stats['avg_response_time'] = stats['avg_response_time'] / stats['total']
        
        for tz, stats in timezone_stats.items():
            if stats['total'] > 0:
                stats['success_rate'] = ((stats['sent'] + stats['delivered']) / stats['total']) * 100
        
        # Generate performance insights
        insights = []
        
        # Find best and worst performing carriers
        if carrier_stats:
            best_carrier = max(carrier_stats.items(), key=lambda x: x[1]['success_rate'])
            worst_carrier = min(carrier_stats.items(), key=lambda x: x[1]['success_rate'])
            
            insights.append(f"Best performing carrier: {best_carrier[0]} ({best_carrier[1]['success_rate']:.1f}% success rate)")
            insights.append(f"Worst performing carrier: {worst_carrier[0]} ({worst_carrier[1]['success_rate']:.1f}% success rate)")
        
        # Find best and worst performing timezones
        if timezone_stats:
            best_tz = max(timezone_stats.items(), key=lambda x: x[1]['success_rate'])
            worst_tz = min(timezone_stats.items(), key=lambda x: x[1]['success_rate'])
            
            insights.append(f"Best performing timezone: {best_tz[0]} ({best_tz[1]['success_rate']:.1f}% success rate)")
            insights.append(f"Worst performing timezone: {worst_tz[0]} ({worst_tz[1]['success_rate']:.1f}% success rate)")
        
        return {
            'total_messages': messages.count(),
            'carrier_breakdown': carrier_stats,
            'timezone_breakdown': timezone_stats,
            'performance_insights': insights,
            'optimization_enabled': {
                'carrier_optimization': self.delivery_settings.carrier_optimization_enabled,
                'adaptive_rate_limiting': self.delivery_settings.adaptive_optimization_enabled,
                'timezone_optimization': self.delivery_settings.timezone_optimization_enabled
            }
        }
    
    def get_delivery_recommendations(self) -> List[Dict[str, Any]]:
        """
        Generate delivery optimization recommendations
        """
        recommendations = []
        
        # Analyze current performance
        analysis = self.analyze_delivery_patterns()
        
        if analysis['total_messages'] < 10:
            recommendations.append({
                'type': 'info',
                'title': 'Insufficient Data',
                'message': 'Send more messages to get personalized optimization recommendations.',
                'priority': 'low'
            })
            return recommendations
        
        # Check carrier performance
        carrier_breakdown = analysis['carrier_breakdown']
        if carrier_breakdown:
            avg_success_rate = sum(stats['success_rate'] for stats in carrier_breakdown.values()) / len(carrier_breakdown)
            
            if avg_success_rate < 70:
                recommendations.append({
                    'type': 'warning',
                    'title': 'Low Overall Success Rate',
                    'message': f'Your average success rate is {avg_success_rate:.1f}%. Consider enabling carrier optimization.',
                    'priority': 'high',
                    'action': 'Enable carrier optimization in campaign settings'
                })
            
            # Find underperforming carriers
            for carrier, stats in carrier_breakdown.items():
                if stats['success_rate'] < 60 and stats['total'] >= 5:
                    recommendations.append({
                        'type': 'warning',
                        'title': f'Poor {carrier.title()} Performance',
                        'message': f'{carrier.title()} has only {stats["success_rate"]:.1f}% success rate. Consider different server combinations.',
                        'priority': 'medium',
                        'action': f'Review server performance for {carrier} carrier'
                    })
        
        # Check if optimizations are disabled
        if not self.delivery_settings.carrier_optimization_enabled:
            recommendations.append({
                'type': 'info',
                'title': 'Carrier Optimization Disabled',
                'message': 'Enable carrier optimization to automatically use the best server combinations for each carrier.',
                'priority': 'medium',
                'action': 'Enable carrier optimization'
            })
        
        if not self.delivery_settings.adaptive_optimization_enabled:
            recommendations.append({
                'type': 'info',
                'title': 'Adaptive Rate Limiting Disabled',
                'message': 'Enable adaptive rate limiting to automatically adjust sending speed based on performance.',
                'priority': 'medium',
                'action': 'Enable adaptive optimization'
            })
        
        if not self.delivery_settings.timezone_optimization_enabled:
            recommendations.append({
                'type': 'info',
                'title': 'Timezone Optimization Disabled',
                'message': 'Enable timezone optimization to send messages at optimal times for each recipient.',
                'priority': 'low',
                'action': 'Enable timezone optimization'
            })
        
        return recommendations
    
    def update_carrier_performance(self, carrier: str, proxy_server: ProxyServer, smtp_server: SmtpManager, 
                                 success: bool, delivery_time: float = None):
        """
        Update carrier performance data for future optimization
        """
        try:
            performance_log, created = CarrierPerformanceLog.objects.get_or_create(
                carrier=carrier,
                proxy_server=proxy_server,
                smtp_server=smtp_server,
                defaults={
                    'success_rate': 100.0 if success else 0.0,
                    'messages_sent': 1,
                    'successful_deliveries': 1 if success else 0,
                    'failed_deliveries': 0 if success else 1,
                    'average_delivery_time': delivery_time
                }
            )
            
            if not created:
                # Update existing performance log
                performance_log.update_performance(success, delivery_time)
            
            self.logger.debug(f"Updated carrier performance for {carrier}: success={success}, "
                            f"delivery_time={delivery_time}")
            
        except Exception as e:
            self.logger.error(f"Error updating carrier performance: {e}")