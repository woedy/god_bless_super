"""
Management command to test the Predictive Analytics Service
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from sms_sender.analytics_service import PredictiveAnalyticsService
from sms_sender.models import SMSCampaign
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the Predictive Analytics Service functionality'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to test analytics for',
            required=True
        )
        parser.add_argument(
            '--campaign-id',
            type=int,
            help='Campaign ID to analyze (optional)',
        )
        parser.add_argument(
            '--server-id',
            type=int,
            help='Server ID for failure prediction test',
        )
        parser.add_argument(
            '--server-type',
            type=str,
            choices=['proxy', 'smtp'],
            help='Server type for failure prediction test',
        )
    
    def handle(self, *args, **options):
        user_id = options['user_id']
        campaign_id = options.get('campaign_id')
        server_id = options.get('server_id')
        server_type = options.get('server_type')
        
        try:
            user = User.objects.get(id=user_id)
            self.stdout.write(f"Testing analytics for user: {user.username}")
            
            # Initialize analytics service
            analytics_service = PredictiveAnalyticsService(user)
            
            # Test 1: Server failure prediction
            if server_id and server_type:
                self.stdout.write(f"\n=== Testing Server Failure Prediction ===")
                failure_prob = analytics_service.predict_server_failure(server_id, server_type)
                self.stdout.write(f"Server {server_type} {server_id} failure probability: {failure_prob:.3f}")
                
                risk_level = 'HIGH' if failure_prob > 0.7 else 'MEDIUM' if failure_prob > 0.4 else 'LOW'
                self.stdout.write(f"Risk level: {risk_level}")
            
            # Test 2: Optimization recommendations
            self.stdout.write(f"\n=== Testing Optimization Recommendations ===")
            recommendations = analytics_service.recommend_server_configuration('marketing')
            self.stdout.write("Recommendations:")
            self.stdout.write(json.dumps(recommendations, indent=2))
            
            # Test 3: System-wide suggestions
            self.stdout.write(f"\n=== Testing System Suggestions ===")
            suggestions = analytics_service.generate_optimization_suggestions()
            self.stdout.write(f"Found {len(suggestions)} suggestions:")
            for i, suggestion in enumerate(suggestions[:3], 1):  # Show top 3
                self.stdout.write(f"{i}. [{suggestion['priority'].upper()}] {suggestion['title']}")
                self.stdout.write(f"   {suggestion['description']}")
                self.stdout.write(f"   Action: {suggestion['action']}")
            
            # Test 4: Anomaly detection
            self.stdout.write(f"\n=== Testing Anomaly Detection ===")
            anomalies = analytics_service.detect_anomalies(campaign_id)
            self.stdout.write(f"Found {len(anomalies)} anomalies:")
            for anomaly in anomalies:
                self.stdout.write(f"- [{anomaly['severity'].upper()}] {anomaly['description']}")
            
            # Test 5: Campaign analysis (if campaign_id provided)
            if campaign_id:
                self.stdout.write(f"\n=== Testing Campaign Analysis ===")
                try:
                    campaign = SMSCampaign.objects.get(id=campaign_id, user=user)
                    analysis = analytics_service.analyze_campaign_performance(campaign_id)
                    
                    if 'error' not in analysis:
                        self.stdout.write(f"Campaign: {campaign.name}")
                        self.stdout.write(f"Performance Score: {analysis['performance_score']:.3f}")
                        self.stdout.write(f"Bottlenecks: {len(analysis['bottlenecks'])}")
                        self.stdout.write(f"Optimization Opportunities: {len(analysis['optimization_opportunities'])}")
                        
                        # Show server performance
                        if analysis['server_performance']:
                            self.stdout.write("Server Performance:")
                            for server_key, perf in analysis['server_performance'].items():
                                self.stdout.write(f"  {server_key}: {perf['success_rate']:.1f}% success, "
                                                f"failure risk: {perf['failure_prediction']:.3f}")
                    else:
                        self.stdout.write(f"Campaign analysis error: {analysis['error']}")
                        
                except SMSCampaign.DoesNotExist:
                    self.stdout.write(f"Campaign {campaign_id} not found for user {user.username}")
            
            # Test 6: Completion time forecast (if campaign is active)
            if campaign_id:
                self.stdout.write(f"\n=== Testing Completion Time Forecast ===")
                forecast = analytics_service.forecast_completion_time(campaign_id)
                
                if 'error' not in forecast:
                    self.stdout.write(f"Current Rate: {forecast['current_rate']:.2f} messages/minute")
                    self.stdout.write(f"Messages Remaining: {forecast['messages_remaining']}")
                    self.stdout.write(f"Estimated Completion: {forecast['adjusted_forecast']}")
                    self.stdout.write(f"Confidence: {forecast['confidence']:.2f}")
                else:
                    self.stdout.write(f"Forecast error: {forecast['error']}")
            
            self.stdout.write(f"\n=== Analytics Testing Complete ===")
            self.stdout.write(self.style.SUCCESS("All tests completed successfully!"))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"User with ID {user_id} not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during testing: {str(e)}"))
            import traceback
            self.stdout.write(traceback.format_exc())