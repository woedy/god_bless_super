"""
Conditional Routing Rules Engine
Advanced routing logic based on phone number patterns, carrier detection, and geographic preferences
"""
import re
import logging
from typing import Optional, Dict, Any, List, Tuple
from django.db import models
from django.db.models import Q, F, Case, When, IntegerField
from django.core.cache import cache
from django.utils import timezone

from proxy_server.models import ProxyServer
from smtps.models import SmtpManager
from .models import SMSMessage, CampaignDeliverySettings


logger = logging.getLogger(__name__)


class RoutingRule:
    """Individual routing rule definition"""
    
    def __init__(self, name: str, conditions: Dict[str, Any], actions: Dict[str, Any], priority: int = 0):
        self.name = name
        self.conditions = conditions
        self.actions = actions
        self.priority = priority
        self.enabled = True
    
    def matches(self, phone_number: str, carrier: str, geographic_info: Dict[str, Any]) -> bool:
        """Check if this rule matches the given criteria"""
        
        # Check phone number pattern conditions
        if 'phone_pattern' in self.conditions:
            pattern = self.conditions['phone_pattern']
            if not re.match(pattern, phone_number):
                return False
        
        # Check area code conditions
        if 'area_codes' in self.conditions:
            area_codes = self.conditions['area_codes']
            phone_area_code = self._extract_area_code(phone_number)
            if phone_area_code not in area_codes:
                return False
        
        # Check carrier conditions
        if 'carriers' in self.conditions:
            carriers = self.conditions['carriers']
            if carrier not in carriers:
                return False
        
        # Check geographic conditions
        if 'states' in self.conditions:
            states = self.conditions['states']
            phone_state = geographic_info.get('state', '')
            if phone_state not in states:
                return False
        
        if 'timezones' in self.conditions:
            timezones = self.conditions['timezones']
            phone_timezone = geographic_info.get('timezone', '')
            if phone_timezone not in timezones:
                return False
        
        # Check time-based conditions
        if 'time_range' in self.conditions:
            time_range = self.conditions['time_range']
            current_hour = timezone.now().hour
            start_hour, end_hour = time_range
            if not (start_hour <= current_hour <= end_hour):
                return False
        
        return True
    
    def _extract_area_code(self, phone_number: str) -> str:
        """Extract area code from phone number"""
        cleaned_number = re.sub(r'[^\d]', '', phone_number)
        if len(cleaned_number) >= 10:
            return cleaned_number[-10:-7]  # Extract area code from 10-digit number
        return ''


class LoadBalancingWeights:
    """Manage load balancing weights for server capacity"""
    
    def __init__(self, user):
        self.user = user
        self.logger = logging.getLogger(f"{__name__}.LoadBalancing.{user.id}")
    
    def get_weighted_server_selection(self, server_type: str, available_servers: List) -> Optional[Any]:
        """Select server based on capacity weights and current load"""
        
        if not available_servers:
            return None
        
        # Get current load for each server
        server_loads = self._calculate_server_loads(server_type, available_servers)
        
        # Calculate weighted scores (higher is better)
        weighted_servers = []
        for server in available_servers:
            base_weight = self._get_server_weight(server)
            current_load = server_loads.get(server.id, 0)
            
            # Adjust weight based on current load (lower load = higher effective weight)
            load_factor = max(0.1, 1.0 - (current_load / 100.0))  # Normalize load to 0-1
            effective_weight = base_weight * load_factor
            
            weighted_servers.append((server, effective_weight))
        
        # Sort by effective weight (descending)
        weighted_servers.sort(key=lambda x: x[1], reverse=True)
        
        # Select server using weighted random selection
        import random
        total_weight = sum(weight for _, weight in weighted_servers)
        
        if total_weight <= 0:
            # Fallback to first available server
            return available_servers[0]
        
        random_value = random.uniform(0, total_weight)
        cumulative_weight = 0
        
        for server, weight in weighted_servers:
            cumulative_weight += weight
            if random_value <= cumulative_weight:
                self.logger.debug(f"Selected {server_type} server {server.id} with weight {weight:.2f}")
                return server
        
        # Fallback to last server
        return weighted_servers[-1][0]
    
    def _get_server_weight(self, server) -> float:
        """Get configured weight for server (default 1.0)"""
        # Check if server has custom weight configuration
        if hasattr(server, 'capacity_weight'):
            return float(server.capacity_weight)
        
        # Default weight based on server performance
        if hasattr(server, 'success_rate') and server.success_rate:
            return server.success_rate / 100.0  # Convert percentage to 0-1
        
        return 1.0  # Default weight
    
    def _calculate_server_loads(self, server_type: str, servers: List) -> Dict[int, float]:
        """Calculate current load percentage for each server"""
        server_ids = [server.id for server in servers]
        
        # Count active messages per server in the last hour
        recent_cutoff = timezone.now() - timezone.timedelta(hours=1)
        
        if server_type == 'proxy':
            active_counts = SMSMessage.objects.filter(
                proxy_server_id__in=server_ids,
                created_at__gte=recent_cutoff,
                delivery_status__in=['pending', 'queued', 'sending']
            ).values('proxy_server_id').annotate(count=models.Count('id'))
        else:  # smtp
            active_counts = SMSMessage.objects.filter(
                smtp_server_id__in=server_ids,
                created_at__gte=recent_cutoff,
                delivery_status__in=['pending', 'queued', 'sending']
            ).values('smtp_server_id').annotate(count=models.Count('id'))
        
        # Convert to dictionary
        load_dict = {}
        for item in active_counts:
            server_id = item[f'{server_type}_server_id']
            count = item['count']
            
            # Calculate load percentage (assuming max capacity of 100 concurrent messages)
            max_capacity = 100  # This could be configurable per server
            load_percentage = min(100.0, (count / max_capacity) * 100)
            load_dict[server_id] = load_percentage
        
        return load_dict


class GeographicRouter:
    """Handle geographic routing preferences"""
    
    # US state to timezone mapping
    STATE_TIMEZONES = {
        'AL': 'central', 'AK': 'alaska', 'AZ': 'mountain', 'AR': 'central',
        'CA': 'pacific', 'CO': 'mountain', 'CT': 'eastern', 'DE': 'eastern',
        'FL': 'eastern', 'GA': 'eastern', 'HI': 'hawaii', 'ID': 'mountain',
        'IL': 'central', 'IN': 'eastern', 'IA': 'central', 'KS': 'central',
        'KY': 'eastern', 'LA': 'central', 'ME': 'eastern', 'MD': 'eastern',
        'MA': 'eastern', 'MI': 'eastern', 'MN': 'central', 'MS': 'central',
        'MO': 'central', 'MT': 'mountain', 'NE': 'central', 'NV': 'pacific',
        'NH': 'eastern', 'NJ': 'eastern', 'NM': 'mountain', 'NY': 'eastern',
        'NC': 'eastern', 'ND': 'central', 'OH': 'eastern', 'OK': 'central',
        'OR': 'pacific', 'PA': 'eastern', 'RI': 'eastern', 'SC': 'eastern',
        'SD': 'central', 'TN': 'central', 'TX': 'central', 'UT': 'mountain',
        'VT': 'eastern', 'VA': 'eastern', 'WA': 'pacific', 'WV': 'eastern',
        'WI': 'central', 'WY': 'mountain'
    }
    
    # Area code to state mapping (simplified)
    AREA_CODE_STATES = {
        '205': 'AL', '251': 'AL', '256': 'AL', '334': 'AL', '938': 'AL',
        '907': 'AK',
        '480': 'AZ', '520': 'AZ', '602': 'AZ', '623': 'AZ', '928': 'AZ',
        '479': 'AR', '501': 'AR', '870': 'AR',
        '209': 'CA', '213': 'CA', '279': 'CA', '310': 'CA', '323': 'CA',
        '408': 'CA', '415': 'CA', '424': 'CA', '442': 'CA', '510': 'CA',
        '530': 'CA', '559': 'CA', '562': 'CA', '619': 'CA', '626': 'CA',
        '628': 'CA', '650': 'CA', '657': 'CA', '661': 'CA', '669': 'CA',
        '707': 'CA', '714': 'CA', '747': 'CA', '760': 'CA', '805': 'CA',
        '818': 'CA', '831': 'CA', '858': 'CA', '909': 'CA', '916': 'CA',
        '925': 'CA', '949': 'CA', '951': 'CA',
        '303': 'CO', '719': 'CO', '720': 'CO', '970': 'CO',
        '203': 'CT', '475': 'CT', '860': 'CT', '959': 'CT',
        '302': 'DE',
        '202': 'DC',
        '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL',
        '407': 'FL', '561': 'FL', '689': 'FL', '727': 'FL', '754': 'FL',
        '772': 'FL', '786': 'FL', '813': 'FL', '850': 'FL', '863': 'FL',
        '904': 'FL', '941': 'FL', '954': 'FL',
        # Add more mappings as needed...
    }
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.GeographicRouter")
    
    def get_geographic_info(self, phone_number: str) -> Dict[str, str]:
        """Get geographic information from phone number"""
        area_code = self._extract_area_code(phone_number)
        state = self.AREA_CODE_STATES.get(area_code, 'unknown')
        timezone = self.STATE_TIMEZONES.get(state, 'eastern')
        
        return {
            'area_code': area_code,
            'state': state,
            'timezone': timezone
        }
    
    def find_geographically_preferred_servers(self, phone_number: str, available_servers: List, server_type: str) -> List:
        """Find servers that are geographically closer to the phone number"""
        geographic_info = self.get_geographic_info(phone_number)
        phone_timezone = geographic_info['timezone']
        
        # Group servers by their geographic location (if available)
        preferred_servers = []
        other_servers = []
        
        for server in available_servers:
            server_timezone = self._get_server_timezone(server)
            
            if server_timezone == phone_timezone:
                preferred_servers.append(server)
            else:
                other_servers.append(server)
        
        # Return preferred servers first, then others
        return preferred_servers + other_servers
    
    def _extract_area_code(self, phone_number: str) -> str:
        """Extract area code from phone number"""
        cleaned_number = re.sub(r'[^\d]', '', phone_number)
        if len(cleaned_number) >= 10:
            return cleaned_number[-10:-7]
        return ''
    
    def _get_server_timezone(self, server) -> str:
        """Get server timezone (would be configured in server settings)"""
        # This would typically be stored in server configuration
        # For now, return a default or try to infer from server location
        if hasattr(server, 'timezone'):
            return server.timezone
        
        # Default to eastern timezone
        return 'eastern'


class RoutingRulesEngine:
    """Main routing rules engine that coordinates all routing logic"""
    
    def __init__(self, user, campaign):
        self.user = user
        self.campaign = campaign
        self.logger = logging.getLogger(f"{__name__}.{user.id}.{campaign.id}")
        
        # Initialize sub-components
        self.load_balancer = LoadBalancingWeights(user)
        self.geographic_router = GeographicRouter()
        
        # Load routing rules
        self.routing_rules = self._load_routing_rules()
    
    def get_optimal_servers(self, phone_number: str, carrier: str) -> Tuple[Optional[ProxyServer], Optional[SmtpManager]]:
        """Get optimal servers based on routing rules and preferences"""
        
        # Get geographic information
        geographic_info = self.geographic_router.get_geographic_info(phone_number)
        
        # Find matching routing rules
        matching_rules = self._find_matching_rules(phone_number, carrier, geographic_info)
        
        # Get available servers
        available_proxies = self._get_available_proxies()
        available_smtps = self._get_available_smtps()
        
        # Apply routing rules to filter servers
        filtered_proxies, filtered_smtps = self._apply_routing_rules(
            matching_rules, available_proxies, available_smtps, phone_number, carrier, geographic_info
        )
        
        # Apply geographic preferences
        geo_preferred_proxies = self.geographic_router.find_geographically_preferred_servers(
            phone_number, filtered_proxies, 'proxy'
        )
        geo_preferred_smtps = self.geographic_router.find_geographically_preferred_servers(
            phone_number, filtered_smtps, 'smtp'
        )
        
        # Apply load balancing weights
        selected_proxy = self.load_balancer.get_weighted_server_selection('proxy', geo_preferred_proxies)
        selected_smtp = self.load_balancer.get_weighted_server_selection('smtp', geo_preferred_smtps)
        
        self.logger.info(f"Selected servers for {phone_number} ({carrier}): "
                        f"Proxy {selected_proxy.id if selected_proxy else 'None'}, "
                        f"SMTP {selected_smtp.id if selected_smtp else 'None'}")
        
        return selected_proxy, selected_smtp
    
    def _load_routing_rules(self) -> List[RoutingRule]:
        """Load routing rules for the user/campaign"""
        # This would typically load from database or configuration
        # For now, return some default rules
        
        default_rules = [
            # High-priority carrier-specific rules
            RoutingRule(
                name="Verizon Optimization",
                conditions={'carriers': ['verizon']},
                actions={'prefer_server_tags': ['verizon_optimized'], 'rate_limit_multiplier': 0.8},
                priority=10
            ),
            RoutingRule(
                name="AT&T Optimization",
                conditions={'carriers': ['att']},
                actions={'prefer_server_tags': ['att_optimized'], 'rate_limit_multiplier': 0.9},
                priority=10
            ),
            RoutingRule(
                name="T-Mobile Optimization",
                conditions={'carriers': ['tmobile', 'sprint']},
                actions={'prefer_server_tags': ['tmobile_optimized'], 'rate_limit_multiplier': 1.0},
                priority=10
            ),
            
            # Geographic rules
            RoutingRule(
                name="West Coast Routing",
                conditions={'states': ['CA', 'OR', 'WA', 'NV']},
                actions={'prefer_server_tags': ['west_coast'], 'geographic_preference': 'pacific'},
                priority=5
            ),
            RoutingRule(
                name="East Coast Routing",
                conditions={'states': ['NY', 'NJ', 'CT', 'MA', 'FL']},
                actions={'prefer_server_tags': ['east_coast'], 'geographic_preference': 'eastern'},
                priority=5
            ),
            
            # Time-based rules
            RoutingRule(
                name="Business Hours High Volume",
                conditions={'time_range': (9, 17)},  # 9 AM to 5 PM
                actions={'rate_limit_multiplier': 1.2, 'prefer_high_capacity': True},
                priority=3
            ),
            RoutingRule(
                name="Off Hours Conservative",
                conditions={'time_range': (22, 6)},  # 10 PM to 6 AM
                actions={'rate_limit_multiplier': 0.5, 'prefer_reliable_servers': True},
                priority=3
            ),
            
            # Area code specific rules
            RoutingRule(
                name="NYC Area Codes",
                conditions={'area_codes': ['212', '646', '917', '347', '718', '929', '934']},
                actions={'prefer_server_tags': ['nyc_optimized'], 'rate_limit_multiplier': 0.7},
                priority=7
            ),
            RoutingRule(
                name="LA Area Codes",
                conditions={'area_codes': ['213', '323', '310', '424', '747', '818']},
                actions={'prefer_server_tags': ['la_optimized'], 'rate_limit_multiplier': 0.8},
                priority=7
            ),
        ]
        
        return default_rules
    
    def _find_matching_rules(self, phone_number: str, carrier: str, geographic_info: Dict[str, Any]) -> List[RoutingRule]:
        """Find routing rules that match the given criteria"""
        matching_rules = []
        
        for rule in self.routing_rules:
            if rule.enabled and rule.matches(phone_number, carrier, geographic_info):
                matching_rules.append(rule)
        
        # Sort by priority (higher priority first)
        matching_rules.sort(key=lambda r: r.priority, reverse=True)
        
        self.logger.debug(f"Found {len(matching_rules)} matching rules for {phone_number}")
        return matching_rules
    
    def _apply_routing_rules(self, rules: List[RoutingRule], proxies: List[ProxyServer], 
                           smtps: List[SmtpManager], phone_number: str, carrier: str, 
                           geographic_info: Dict[str, Any]) -> Tuple[List[ProxyServer], List[SmtpManager]]:
        """Apply routing rules to filter and prioritize servers"""
        
        filtered_proxies = proxies.copy()
        filtered_smtps = smtps.copy()
        
        for rule in rules:
            actions = rule.actions
            
            # Apply server tag preferences
            if 'prefer_server_tags' in actions:
                preferred_tags = actions['prefer_server_tags']
                
                # Filter proxies by tags (if they have tag support)
                tagged_proxies = [p for p in filtered_proxies if self._server_has_tags(p, preferred_tags)]
                if tagged_proxies:
                    filtered_proxies = tagged_proxies
                
                # Filter SMTPs by tags
                tagged_smtps = [s for s in filtered_smtps if self._server_has_tags(s, preferred_tags)]
                if tagged_smtps:
                    filtered_smtps = tagged_smtps
            
            # Apply high capacity preference
            if actions.get('prefer_high_capacity'):
                # Sort by capacity/performance metrics
                filtered_proxies.sort(key=lambda p: getattr(p, 'max_concurrent_requests', 0), reverse=True)
                filtered_smtps.sort(key=lambda s: getattr(s, 'max_concurrent_sends', 0), reverse=True)
            
            # Apply reliability preference
            if actions.get('prefer_reliable_servers'):
                # Sort by success rate
                filtered_proxies.sort(key=lambda p: getattr(p, 'success_rate', 0), reverse=True)
                filtered_smtps.sort(key=lambda s: getattr(s, 'success_rate', 0), reverse=True)
        
        return filtered_proxies, filtered_smtps
    
    def _server_has_tags(self, server, tags: List[str]) -> bool:
        """Check if server has any of the specified tags"""
        # This would check server tags/labels if implemented
        # For now, return True to not filter out servers
        return True
    
    def _get_available_proxies(self) -> List[ProxyServer]:
        """Get available proxy servers for the user"""
        return list(ProxyServer.objects.filter(
            user=self.user,
            is_active=True,
            is_healthy=True
        ).order_by('-success_rate', '-total_requests'))
    
    def _get_available_smtps(self) -> List[SmtpManager]:
        """Get available SMTP servers for the user"""
        return list(SmtpManager.objects.filter(
            user=self.user,
            active=True,
            is_healthy=True
        ).order_by('-success_rate', '-total_sent'))
    
    def get_routing_statistics(self) -> Dict[str, Any]:
        """Get statistics about routing decisions"""
        # Get recent routing decisions
        recent_cutoff = timezone.now() - timezone.timedelta(hours=24)
        
        recent_messages = SMSMessage.objects.filter(
            campaign__user=self.user,
            created_at__gte=recent_cutoff
        )
        
        # Analyze routing patterns
        proxy_usage = {}
        smtp_usage = {}
        carrier_routing = {}
        
        for message in recent_messages:
            # Proxy usage
            if message.proxy_server:
                proxy_id = message.proxy_server.id
                if proxy_id not in proxy_usage:
                    proxy_usage[proxy_id] = {'total': 0, 'successful': 0}
                proxy_usage[proxy_id]['total'] += 1
                if message.delivery_status in ['sent', 'delivered']:
                    proxy_usage[proxy_id]['successful'] += 1
            
            # SMTP usage
            if message.smtp_server:
                smtp_id = message.smtp_server.id
                if smtp_id not in smtp_usage:
                    smtp_usage[smtp_id] = {'total': 0, 'successful': 0}
                smtp_usage[smtp_id]['total'] += 1
                if message.delivery_status in ['sent', 'delivered']:
                    smtp_usage[smtp_id]['successful'] += 1
            
            # Carrier routing
            carrier = message.carrier or 'unknown'
            if carrier not in carrier_routing:
                carrier_routing[carrier] = {'total': 0, 'successful': 0}
            carrier_routing[carrier]['total'] += 1
            if message.delivery_status in ['sent', 'delivered']:
                carrier_routing[carrier]['successful'] += 1
        
        # Calculate success rates
        for stats in proxy_usage.values():
            stats['success_rate'] = (stats['successful'] / stats['total']) * 100 if stats['total'] > 0 else 0
        
        for stats in smtp_usage.values():
            stats['success_rate'] = (stats['successful'] / stats['total']) * 100 if stats['total'] > 0 else 0
        
        for stats in carrier_routing.values():
            stats['success_rate'] = (stats['successful'] / stats['total']) * 100 if stats['total'] > 0 else 0
        
        return {
            'total_messages': recent_messages.count(),
            'proxy_usage': proxy_usage,
            'smtp_usage': smtp_usage,
            'carrier_routing': carrier_routing,
            'active_rules': len([r for r in self.routing_rules if r.enabled]),
            'total_rules': len(self.routing_rules)
        }