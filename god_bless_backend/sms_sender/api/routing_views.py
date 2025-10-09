"""
API views for routing rules management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from ..models import RoutingRule, ServerCapacityWeight, GeographicRoutingPreference
from ..serializers import (
    RoutingRuleSerializer, ServerCapacityWeightSerializer, 
    GeographicRoutingPreferenceSerializer
)
from ..routing_rules_engine import RoutingRulesEngine


class RoutingRuleViewSet(viewsets.ModelViewSet):
    """API for managing conditional routing rules"""
    serializer_class = RoutingRuleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return RoutingRule.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def test_rule(self, request):
        """Test a routing rule against sample data"""
        phone_number = request.data.get('phone_number', '+1234567890')
        carrier = request.data.get('carrier', 'verizon')
        rule_data = request.data.get('rule', {})
        
        try:
            # Create temporary rule for testing
            from ..routing_rules_engine import RoutingRule as RuleClass
            test_rule = RuleClass(
                name="Test Rule",
                conditions=rule_data.get('conditions', {}),
                actions=rule_data.get('actions', {}),
                priority=rule_data.get('priority', 0)
            )
            
            # Test if rule matches
            from ..routing_rules_engine import GeographicRouter
            geo_router = GeographicRouter()
            geographic_info = geo_router.get_geographic_info(phone_number)
            
            matches = test_rule.matches(phone_number, carrier, geographic_info)
            
            return Response({
                'matches': matches,
                'phone_number': phone_number,
                'carrier': carrier,
                'geographic_info': geographic_info,
                'rule_conditions': rule_data.get('conditions', {}),
                'rule_actions': rule_data.get('actions', {})
            })
            
        except Exception as e:
            return Response(
                {'error': f'Rule test failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get routing rule statistics"""
        rules = self.get_queryset()
        
        total_rules = rules.count()
        enabled_rules = rules.filter(enabled=True).count()
        total_matches = sum(rule.match_count for rule in rules)
        total_successes = sum(rule.success_count for rule in rules)
        
        # Calculate overall success rate
        overall_success_rate = (total_successes / total_matches * 100) if total_matches > 0 else 0
        
        # Get top performing rules
        top_rules = rules.filter(match_count__gt=0).order_by('-success_count')[:5]
        top_rules_data = [
            {
                'id': rule.id,
                'name': rule.name,
                'match_count': rule.match_count,
                'success_count': rule.success_count,
                'success_rate': rule.get_success_rate()
            }
            for rule in top_rules
        ]
        
        return Response({
            'total_rules': total_rules,
            'enabled_rules': enabled_rules,
            'total_matches': total_matches,
            'total_successes': total_successes,
            'overall_success_rate': overall_success_rate,
            'top_performing_rules': top_rules_data
        })
    
    @action(detail=False, methods=['post'])
    def create_default_rules(self, request):
        """Create default routing rules for the user"""
        user = request.user
        
        # Check if user already has rules
        if RoutingRule.objects.filter(user=user).exists():
            return Response(
                {'error': 'User already has routing rules'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create default rules
        default_rules = [
            {
                'name': 'Verizon Optimization',
                'description': 'Optimized routing for Verizon carrier',
                'conditions': {'carriers': ['verizon']},
                'actions': {'prefer_server_tags': ['verizon_optimized'], 'rate_limit_multiplier': 0.8},
                'priority': 10
            },
            {
                'name': 'AT&T Optimization',
                'description': 'Optimized routing for AT&T carrier',
                'conditions': {'carriers': ['att']},
                'actions': {'prefer_server_tags': ['att_optimized'], 'rate_limit_multiplier': 0.9},
                'priority': 10
            },
            {
                'name': 'T-Mobile Optimization',
                'description': 'Optimized routing for T-Mobile/Sprint carrier',
                'conditions': {'carriers': ['tmobile', 'sprint']},
                'actions': {'prefer_server_tags': ['tmobile_optimized'], 'rate_limit_multiplier': 1.0},
                'priority': 10
            },
            {
                'name': 'Business Hours High Volume',
                'description': 'Increased capacity during business hours',
                'conditions': {'time_range': [9, 17]},
                'actions': {'rate_limit_multiplier': 1.2, 'prefer_high_capacity': True},
                'priority': 5
            },
            {
                'name': 'Off Hours Conservative',
                'description': 'Conservative routing during off hours',
                'conditions': {'time_range': [22, 6]},
                'actions': {'rate_limit_multiplier': 0.5, 'prefer_reliable_servers': True},
                'priority': 5
            }
        ]
        
        created_rules = []
        for rule_data in default_rules:
            rule = RoutingRule.objects.create(
                user=user,
                name=rule_data['name'],
                description=rule_data['description'],
                conditions=rule_data['conditions'],
                actions=rule_data['actions'],
                priority=rule_data['priority']
            )
            created_rules.append(rule)
        
        serializer = self.get_serializer(created_rules, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ServerCapacityWeightViewSet(viewsets.ModelViewSet):
    """API for managing server capacity weights"""
    serializer_class = ServerCapacityWeightSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ServerCapacityWeight.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def server_loads(self, request):
        """Get current server load information"""
        from ..routing_rules_engine import LoadBalancingWeights
        
        load_balancer = LoadBalancingWeights(request.user)
        
        # Get proxy servers
        from proxy_server.models import ProxyServer
        proxy_servers = ProxyServer.objects.filter(user=request.user, is_active=True)
        proxy_loads = load_balancer._calculate_server_loads('proxy', proxy_servers)
        
        # Get SMTP servers
        from smtps.models import SmtpManager
        smtp_servers = SmtpManager.objects.filter(user=request.user, active=True)
        smtp_loads = load_balancer._calculate_server_loads('smtp', smtp_servers)
        
        # Combine with capacity weights
        proxy_data = []
        for server in proxy_servers:
            weight_obj = ServerCapacityWeight.objects.filter(
                user=request.user, server_type='proxy', server_id=server.id
            ).first()
            
            proxy_data.append({
                'id': server.id,
                'host': server.host,
                'port': server.port,
                'current_load': proxy_loads.get(server.id, 0),
                'capacity_weight': weight_obj.capacity_weight if weight_obj else 1.0,
                'max_concurrent': weight_obj.max_concurrent_requests if weight_obj else 100,
                'success_rate': getattr(server, 'success_rate', 0)
            })
        
        smtp_data = []
        for server in smtp_servers:
            weight_obj = ServerCapacityWeight.objects.filter(
                user=request.user, server_type='smtp', server_id=server.id
            ).first()
            
            smtp_data.append({
                'id': server.id,
                'host': server.host,
                'port': server.port,
                'current_load': smtp_loads.get(server.id, 0),
                'capacity_weight': weight_obj.capacity_weight if weight_obj else 1.0,
                'max_concurrent': weight_obj.max_concurrent_requests if weight_obj else 100,
                'success_rate': getattr(server, 'success_rate', 0)
            })
        
        return Response({
            'proxy_servers': proxy_data,
            'smtp_servers': smtp_data,
            'timestamp': timezone.now()
        })
    
    @action(detail=False, methods=['post'])
    def auto_configure_weights(self, request):
        """Automatically configure server weights based on performance"""
        user = request.user
        
        # Get server performance data
        from proxy_server.models import ProxyServer
        from smtps.models import SmtpManager
        
        proxy_servers = ProxyServer.objects.filter(user=user, is_active=True)
        smtp_servers = SmtpManager.objects.filter(user=user, active=True)
        
        created_weights = []
        
        # Configure proxy weights
        for server in proxy_servers:
            success_rate = getattr(server, 'success_rate', 80.0)
            response_time = getattr(server, 'avg_response_time', 2.0)
            
            # Calculate weight based on performance
            weight = min(2.0, max(0.1, success_rate / 100.0))
            
            weight_obj, created = ServerCapacityWeight.objects.get_or_create(
                user=user,
                server_type='proxy',
                server_id=server.id,
                defaults={
                    'capacity_weight': weight,
                    'max_concurrent_requests': 100,
                    'min_success_rate': 70.0,
                    'max_response_time': 10.0
                }
            )
            
            if not created:
                weight_obj.capacity_weight = weight
                weight_obj.save()
            
            created_weights.append(weight_obj)
        
        # Configure SMTP weights
        for server in smtp_servers:
            success_rate = getattr(server, 'success_rate', 80.0)
            
            # Calculate weight based on performance
            weight = min(2.0, max(0.1, success_rate / 100.0))
            
            weight_obj, created = ServerCapacityWeight.objects.get_or_create(
                user=user,
                server_type='smtp',
                server_id=server.id,
                defaults={
                    'capacity_weight': weight,
                    'max_concurrent_requests': 50,
                    'min_success_rate': 70.0,
                    'max_response_time': 15.0
                }
            )
            
            if not created:
                weight_obj.capacity_weight = weight
                weight_obj.save()
            
            created_weights.append(weight_obj)
        
        serializer = self.get_serializer(created_weights, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GeographicRoutingPreferenceViewSet(viewsets.ModelViewSet):
    """API for managing geographic routing preferences"""
    serializer_class = GeographicRoutingPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return GeographicRoutingPreference.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def test_geographic_routing(self, request):
        """Test geographic routing for a phone number"""
        phone_number = request.data.get('phone_number', '+1234567890')
        
        try:
            from ..routing_rules_engine import GeographicRouter
            geo_router = GeographicRouter()
            
            # Get geographic info
            geographic_info = geo_router.get_geographic_info(phone_number)
            
            # Get available servers
            from proxy_server.models import ProxyServer
            from smtps.models import SmtpManager
            
            proxy_servers = list(ProxyServer.objects.filter(
                user=request.user, is_active=True, is_healthy=True
            ))
            smtp_servers = list(SmtpManager.objects.filter(
                user=request.user, active=True, is_healthy=True
            ))
            
            # Apply geographic preferences
            preferred_proxies = geo_router.find_geographically_preferred_servers(
                phone_number, proxy_servers, 'proxy'
            )
            preferred_smtps = geo_router.find_geographically_preferred_servers(
                phone_number, smtp_servers, 'smtp'
            )
            
            return Response({
                'phone_number': phone_number,
                'geographic_info': geographic_info,
                'total_proxy_servers': len(proxy_servers),
                'preferred_proxy_servers': len(preferred_proxies),
                'total_smtp_servers': len(smtp_servers),
                'preferred_smtp_servers': len(preferred_smtps),
                'proxy_server_ids': [s.id for s in preferred_proxies[:5]],  # Top 5
                'smtp_server_ids': [s.id for s in preferred_smtps[:5]]  # Top 5
            })
            
        except Exception as e:
            return Response(
                {'error': f'Geographic routing test failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def area_code_coverage(self, request):
        """Get area code coverage statistics"""
        preferences = self.get_queryset()
        
        # Collect all area codes from preferences
        all_area_codes = set()
        for pref in preferences:
            all_area_codes.update(pref.area_codes)
        
        # Get geographic distribution
        from ..routing_rules_engine import GeographicRouter
        geo_router = GeographicRouter()
        
        coverage_stats = {}
        for area_code in all_area_codes:
            # Create sample phone number
            sample_phone = f"+1{area_code}5551234"
            geo_info = geo_router.get_geographic_info(sample_phone)
            
            state = geo_info['state']
            timezone = geo_info['timezone']
            
            if state not in coverage_stats:
                coverage_stats[state] = {
                    'area_codes': [],
                    'timezone': timezone,
                    'preferences_count': 0
                }
            
            coverage_stats[state]['area_codes'].append(area_code)
        
        # Count preferences per state
        for pref in preferences:
            for area_code in pref.area_codes:
                sample_phone = f"+1{area_code}5551234"
                geo_info = geo_router.get_geographic_info(sample_phone)
                state = geo_info['state']
                
                if state in coverage_stats:
                    coverage_stats[state]['preferences_count'] += 1
        
        return Response({
            'total_area_codes': len(all_area_codes),
            'total_states': len(coverage_stats),
            'coverage_by_state': coverage_stats,
            'total_preferences': preferences.count()
        })


class RoutingEngineViewSet(viewsets.ViewSet):
    """API for routing engine operations"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def test_routing(self, request):
        """Test complete routing engine for a phone number"""
        phone_number = request.data.get('phone_number', '+1234567890')
        carrier = request.data.get('carrier', 'auto')
        campaign_id = request.data.get('campaign_id')
        
        try:
            # Get or create a test campaign
            from ..models import SMSCampaign
            if campaign_id:
                campaign = SMSCampaign.objects.get(id=campaign_id, user=request.user)
            else:
                # Use the most recent campaign or create a dummy one
                campaign = SMSCampaign.objects.filter(user=request.user).first()
                if not campaign:
                    return Response(
                        {'error': 'No campaign found. Please provide a campaign_id or create a campaign first.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Initialize routing engine
            routing_engine = RoutingRulesEngine(request.user, campaign)
            
            # Auto-detect carrier if needed
            if carrier == 'auto':
                from ..smart_delivery_engine import SmartDeliveryEngine
                smart_engine = SmartDeliveryEngine(request.user, campaign)
                carrier = smart_engine.detect_carrier_from_phone(phone_number)
            
            # Get optimal servers
            proxy_server, smtp_server = routing_engine.get_optimal_servers(phone_number, carrier)
            
            # Get routing statistics
            routing_stats = routing_engine.get_routing_statistics()
            
            return Response({
                'phone_number': phone_number,
                'detected_carrier': carrier,
                'selected_proxy': {
                    'id': proxy_server.id if proxy_server else None,
                    'host': proxy_server.host if proxy_server else None,
                    'port': proxy_server.port if proxy_server else None
                } if proxy_server else None,
                'selected_smtp': {
                    'id': smtp_server.id if smtp_server else None,
                    'host': smtp_server.host if smtp_server else None,
                    'port': smtp_server.port if smtp_server else None
                } if smtp_server else None,
                'routing_statistics': routing_stats,
                'campaign_id': campaign.id,
                'campaign_name': campaign.name
            })
            
        except Exception as e:
            return Response(
                {'error': f'Routing test failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def engine_status(self, request):
        """Get routing engine status and configuration"""
        user = request.user
        
        # Count routing components
        routing_rules_count = RoutingRule.objects.filter(user=user, enabled=True).count()
        capacity_weights_count = ServerCapacityWeight.objects.filter(user=user).count()
        geographic_prefs_count = GeographicRoutingPreference.objects.filter(user=user, enabled=True).count()
        
        # Get server counts
        from proxy_server.models import ProxyServer
        from smtps.models import SmtpManager
        
        active_proxies = ProxyServer.objects.filter(user=user, is_active=True, is_healthy=True).count()
        active_smtps = SmtpManager.objects.filter(user=user, active=True, is_healthy=True).count()
        
        return Response({
            'routing_rules': {
                'enabled': routing_rules_count,
                'total': RoutingRule.objects.filter(user=user).count()
            },
            'capacity_weights': {
                'configured': capacity_weights_count,
                'proxy_servers': active_proxies,
                'smtp_servers': active_smtps
            },
            'geographic_preferences': {
                'enabled': geographic_prefs_count,
                'total': GeographicRoutingPreference.objects.filter(user=user).count()
            },
            'engine_features': {
                'conditional_routing': routing_rules_count > 0,
                'load_balancing': capacity_weights_count > 0,
                'geographic_routing': geographic_prefs_count > 0
            }
        })