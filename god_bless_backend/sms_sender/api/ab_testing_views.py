"""
API views for A/B testing functionality
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone

from ..models import (
    ABTestExperiment, ABTestVariant, ABTestAssignment, ABTestResult,
    CampaignOptimizationRecommendation, SMSCampaign
)
from ..serializers import (
    ABTestExperimentSerializer, ABTestVariantSerializer, ABTestResultSerializer,
    CampaignOptimizationRecommendationSerializer
)
from ..ab_testing_service import ABTestingService


class ABTestExperimentViewSet(viewsets.ModelViewSet):
    """API for managing A/B testing experiments"""
    serializer_class = ABTestExperimentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ABTestExperiment.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start an A/B test experiment"""
        ab_service = ABTestingService(request.user)
        success = ab_service.start_experiment(int(pk))
        
        if success:
            experiment = self.get_object()
            serializer = self.get_serializer(experiment)
            return Response(serializer.data)
        else:
            return Response(
                {'error': 'Failed to start experiment'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        """Stop an A/B test experiment"""
        reason = request.data.get('reason', 'manual_stop')
        ab_service = ABTestingService(request.user)
        success = ab_service.stop_experiment(int(pk), reason)
        
        if success:
            experiment = self.get_object()
            serializer = self.get_serializer(experiment)
            return Response(serializer.data)
        else:
            return Response(
                {'error': 'Failed to stop experiment'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        """Perform statistical analysis on experiment"""
        ab_service = ABTestingService(request.user)
        result = ab_service.analyze_experiment(int(pk))
        
        if result:
            result_serializer = ABTestResultSerializer(result)
            return Response(result_serializer.data)
        else:
            return Response(
                {'error': 'Failed to analyze experiment'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get comprehensive experiment summary"""
        ab_service = ABTestingService(request.user)
        summary = ab_service.get_experiment_summary(int(pk))
        
        if summary:
            return Response(summary)
        else:
            return Response(
                {'error': 'Failed to get experiment summary'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get A/B testing dashboard data"""
        experiments = self.get_queryset()
        
        # Overall statistics
        total_experiments = experiments.count()
        running_experiments = experiments.filter(status='running').count()
        completed_experiments = experiments.filter(status='completed').count()
        
        # Recent experiments
        recent_experiments = experiments.order_by('-created_at')[:5]
        recent_data = []
        
        for exp in recent_experiments:
            variants = exp.variants.all()
            total_messages = sum(v.total_messages for v in variants)
            
            exp_data = {
                'id': exp.id,
                'name': exp.name,
                'test_type': exp.test_type,
                'status': exp.status,
                'total_messages': total_messages,
                'started_at': exp.started_at,
                'winner': exp.winner,
                'primary_metric': exp.primary_metric
            }
            
            # Add results if available
            try:
                result = exp.results
                exp_data['p_value'] = result.p_value
                exp_data['effect_size'] = result.effect_size
                exp_data['is_significant'] = result.is_significant()
            except ABTestResult.DoesNotExist:
                exp_data['p_value'] = None
                exp_data['effect_size'] = None
                exp_data['is_significant'] = False
            
            recent_data.append(exp_data)
        
        # Success metrics
        significant_results = 0
        total_improvement = 0
        
        for exp in experiments.filter(status='completed'):
            try:
                result = exp.results
                if result.is_significant():
                    significant_results += 1
                    if result.effect_size:
                        total_improvement += abs(result.effect_size)
            except ABTestResult.DoesNotExist:
                pass
        
        avg_improvement = total_improvement / significant_results if significant_results > 0 else 0
        
        return Response({
            'overview': {
                'total_experiments': total_experiments,
                'running_experiments': running_experiments,
                'completed_experiments': completed_experiments,
                'significant_results': significant_results,
                'average_improvement': avg_improvement
            },
            'recent_experiments': recent_data,
            'test_types': {
                'message_content': experiments.filter(test_type='message_content').count(),
                'send_timing': experiments.filter(test_type='send_timing').count(),
                'server_config': experiments.filter(test_type='server_config').count(),
                'rate_limiting': experiments.filter(test_type='rate_limiting').count(),
                'routing_rules': experiments.filter(test_type='routing_rules').count(),
                'delivery_settings': experiments.filter(test_type='delivery_settings').count()
            }
        })
    
    @action(detail=False, methods=['post'])
    def create_quick_test(self, request):
        """Create a quick A/B test from predefined templates"""
        test_template = request.data.get('template')
        campaign_id = request.data.get('campaign_id')
        
        try:
            campaign = SMSCampaign.objects.get(id=campaign_id, user=request.user)
        except SMSCampaign.DoesNotExist:
            return Response(
                {'error': 'Campaign not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        ab_service = ABTestingService(request.user)
        
        # Define quick test templates
        templates = {
            'rate_limit_test': {
                'name': f'Rate Limit Test - {campaign.name}',
                'test_type': 'rate_limiting',
                'hypothesis': 'Higher rate limits will improve delivery speed without affecting success rate',
                'control_config': {'rate_limit': campaign.rate_limit},
                'variant_config': {'rate_limit': campaign.rate_limit * 1.5},
                'primary_metric': 'delivery_rate'
            },
            'timing_test': {
                'name': f'Send Timing Test - {campaign.name}',
                'test_type': 'send_timing',
                'hypothesis': 'Timezone-optimized sending will improve delivery rates',
                'control_config': {'timezone_optimization': False},
                'variant_config': {'timezone_optimization': True},
                'primary_metric': 'delivery_rate'
            },
            'server_rotation_test': {
                'name': f'Server Rotation Test - {campaign.name}',
                'test_type': 'server_config',
                'hypothesis': 'Smart server rotation will improve success rates',
                'control_config': {'rotation_strategy': 'round_robin'},
                'variant_config': {'rotation_strategy': 'smart_adaptive'},
                'primary_metric': 'success_rate'
            }
        }
        
        if test_template not in templates:
            return Response(
                {'error': 'Invalid test template'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        template_config = templates[test_template]
        
        try:
            experiment = ab_service.create_experiment(
                name=template_config['name'],
                test_type=template_config['test_type'],
                hypothesis=template_config['hypothesis'],
                control_config=template_config['control_config'],
                variant_config=template_config['variant_config'],
                primary_metric=template_config['primary_metric'],
                minimum_sample_size=50,  # Smaller sample for quick tests
                traffic_split=0.5
            )
            
            serializer = self.get_serializer(experiment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create experiment: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ABTestVariantViewSet(viewsets.ReadOnlyModelViewSet):
    """API for viewing A/B test variants"""
    serializer_class = ABTestVariantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ABTestVariant.objects.filter(experiment__user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Get detailed performance metrics for a variant"""
        variant = self.get_object()
        
        # Get message-level data for this variant
        assignments = ABTestAssignment.objects.filter(variant=variant)
        messages = [assignment.message for assignment in assignments]
        
        # Calculate detailed metrics
        performance_data = {
            'variant_info': {
                'id': variant.id,
                'name': variant.name,
                'is_control': variant.is_control,
                'experiment_name': variant.experiment.name
            },
            'message_metrics': {
                'total_messages': variant.total_messages,
                'successful_messages': variant.successful_messages,
                'failed_messages': variant.failed_messages,
                'delivery_rate': variant.delivery_rate,
                'success_rate': variant.success_rate,
                'error_rate': variant.error_rate
            },
            'performance_metrics': {
                'average_response_time': variant.average_response_time,
                'average_cost': variant.average_cost,
                'error_count': variant.error_count
            },
            'timeline_data': []
        }
        
        # Get timeline data (messages per hour)
        if messages:
            from django.db.models import Count
            from django.db.models.functions import TruncHour
            
            timeline = (
                ABTestAssignment.objects
                .filter(variant=variant)
                .annotate(hour=TruncHour('assigned_at'))
                .values('hour')
                .annotate(count=Count('id'))
                .order_by('hour')
            )
            
            performance_data['timeline_data'] = [
                {
                    'hour': item['hour'],
                    'message_count': item['count']
                }
                for item in timeline
            ]
        
        return Response(performance_data)


class ABTestResultViewSet(viewsets.ReadOnlyModelViewSet):
    """API for viewing A/B test results"""
    serializer_class = ABTestResultSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ABTestResult.objects.filter(experiment__user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def detailed_analysis(self, request, pk=None):
        """Get detailed statistical analysis"""
        result = self.get_object()
        experiment = result.experiment
        
        # Get variants
        variants = list(experiment.variants.all())
        control_variant = next(v for v in variants if v.is_control)
        test_variant = next(v for v in variants if not v.is_control)
        
        analysis = {
            'experiment_info': {
                'name': experiment.name,
                'test_type': experiment.test_type,
                'primary_metric': experiment.primary_metric,
                'hypothesis': experiment.hypothesis
            },
            'statistical_results': {
                'p_value': result.p_value,
                'effect_size': result.effect_size,
                'confidence_interval': [result.confidence_interval_lower, result.confidence_interval_upper],
                'is_significant': result.is_significant(),
                'practical_significance': result.practical_significance,
                'confidence_level': result.confidence_level,
                'analysis_method': result.analysis_method
            },
            'variant_comparison': {
                'control': {
                    'name': control_variant.name,
                    'mean': result.control_mean,
                    'std': result.control_std,
                    'sample_size': control_variant.total_messages,
                    'success_rate': control_variant.success_rate
                },
                'variant': {
                    'name': test_variant.name,
                    'mean': result.variant_mean,
                    'std': result.variant_std,
                    'sample_size': test_variant.total_messages,
                    'success_rate': test_variant.success_rate
                }
            },
            'interpretation': {
                'winner': result.get_winner(),
                'improvement': abs(result.effect_size) if result.effect_size else 0,
                'recommendation': result.recommendation or self._generate_interpretation(result)
            }
        }
        
        return Response(analysis)
    
    def _generate_interpretation(self, result: ABTestResult) -> str:
        """Generate interpretation text for the result"""
        if not result.is_significant():
            return "The test did not show statistically significant results. Consider running the test longer or with a larger sample size."
        
        winner = result.get_winner()
        improvement = abs(result.effect_size) if result.effect_size else 0
        
        if winner == 'variant':
            return f"The variant configuration shows a statistically significant improvement of {improvement:.1f}%. Consider implementing this change."
        elif winner == 'control':
            return f"The control configuration performs {improvement:.1f}% better. The current setup is optimal."
        else:
            return "Results are inconclusive. Consider additional testing or analysis."


class CampaignOptimizationRecommendationViewSet(viewsets.ModelViewSet):
    """API for managing optimization recommendations"""
    serializer_class = CampaignOptimizationRecommendationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CampaignOptimizationRecommendation.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a recommendation"""
        recommendation = self.get_object()
        recommendation.status = 'approved'
        recommendation.save()
        
        serializer = self.get_serializer(recommendation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def implement(self, request, pk=None):
        """Mark recommendation as implemented"""
        recommendation = self.get_object()
        recommendation.mark_implemented()
        
        # Record actual improvement if provided
        actual_improvement = request.data.get('actual_improvement')
        if actual_improvement is not None:
            recommendation.actual_improvement = float(actual_improvement)
            recommendation.save()
        
        serializer = self.get_serializer(recommendation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a recommendation"""
        recommendation = self.get_object()
        recommendation.status = 'rejected'
        recommendation.save()
        
        serializer = self.get_serializer(recommendation)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get recommendations dashboard data"""
        recommendations = self.get_queryset()
        
        # Status breakdown
        status_counts = {
            'pending': recommendations.filter(status='pending').count(),
            'approved': recommendations.filter(status='approved').count(),
            'implemented': recommendations.filter(status='implemented').count(),
            'rejected': recommendations.filter(status='rejected').count(),
            'testing': recommendations.filter(status='testing').count()
        }
        
        # Category breakdown
        category_counts = {}
        for category, _ in CampaignOptimizationRecommendation._meta.get_field('category').choices:
            category_counts[category] = recommendations.filter(category=category).count()
        
        # Top recommendations
        top_recommendations = recommendations.filter(
            status='pending'
        ).order_by('-confidence_score', '-expected_improvement')[:5]
        
        top_rec_data = []
        for rec in top_recommendations:
            top_rec_data.append({
                'id': rec.id,
                'title': rec.title,
                'expected_improvement': rec.expected_improvement,
                'confidence_score': rec.confidence_score,
                'implementation_effort': rec.implementation_effort,
                'category': rec.category
            })
        
        # Implementation success rate
        implemented_recs = recommendations.filter(status='implemented', actual_improvement__isnull=False)
        if implemented_recs.exists():
            avg_expected = implemented_recs.aggregate(Avg('expected_improvement'))['expected_improvement__avg']
            avg_actual = implemented_recs.aggregate(Avg('actual_improvement'))['actual_improvement__avg']
            success_rate = (avg_actual / avg_expected * 100) if avg_expected > 0 else 0
        else:
            success_rate = 0
        
        return Response({
            'status_breakdown': status_counts,
            'category_breakdown': category_counts,
            'top_recommendations': top_rec_data,
            'implementation_success_rate': success_rate,
            'total_recommendations': recommendations.count(),
            'total_expected_improvement': recommendations.filter(
                status__in=['approved', 'implemented']
            ).aggregate(total=models.Sum('expected_improvement'))['total'] or 0
        })
    
    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """Bulk approve recommendations"""
        recommendation_ids = request.data.get('recommendation_ids', [])
        
        updated = CampaignOptimizationRecommendation.objects.filter(
            id__in=recommendation_ids,
            user=request.user,
            status='pending'
        ).update(status='approved')
        
        return Response({
            'updated_count': updated,
            'message': f'Approved {updated} recommendations'
        })


class ABTestingDashboardViewSet(viewsets.ViewSet):
    """API for A/B testing dashboard and analytics"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get comprehensive A/B testing overview"""
        user = request.user
        
        # Get experiments
        experiments = ABTestExperiment.objects.filter(user=user)
        
        # Overall metrics
        total_experiments = experiments.count()
        running_experiments = experiments.filter(status='running').count()
        completed_experiments = experiments.filter(status='completed').count()
        
        # Success metrics
        significant_experiments = 0
        total_messages_tested = 0
        total_improvement = 0
        
        for exp in experiments.filter(status='completed'):
            variants = exp.variants.all()
            total_messages_tested += sum(v.total_messages for v in variants)
            
            try:
                result = exp.results
                if result.is_significant():
                    significant_experiments += 1
                    if result.effect_size:
                        total_improvement += abs(result.effect_size)
            except ABTestResult.DoesNotExist:
                pass
        
        # Recommendations
        recommendations = CampaignOptimizationRecommendation.objects.filter(user=user)
        pending_recommendations = recommendations.filter(status='pending').count()
        implemented_recommendations = recommendations.filter(status='implemented').count()
        
        # Recent activity
        recent_experiments = experiments.order_by('-created_at')[:3]
        recent_activity = []
        
        for exp in recent_experiments:
            recent_activity.append({
                'type': 'experiment',
                'title': exp.name,
                'status': exp.status,
                'created_at': exp.created_at,
                'test_type': exp.test_type
            })
        
        return Response({
            'overview': {
                'total_experiments': total_experiments,
                'running_experiments': running_experiments,
                'completed_experiments': completed_experiments,
                'significant_experiments': significant_experiments,
                'total_messages_tested': total_messages_tested,
                'average_improvement': total_improvement / significant_experiments if significant_experiments > 0 else 0,
                'pending_recommendations': pending_recommendations,
                'implemented_recommendations': implemented_recommendations
            },
            'recent_activity': recent_activity,
            'quick_actions': [
                {
                    'title': 'Create Rate Limit Test',
                    'description': 'Test optimal rate limiting settings',
                    'template': 'rate_limit_test'
                },
                {
                    'title': 'Test Send Timing',
                    'description': 'Optimize message send timing',
                    'template': 'timing_test'
                },
                {
                    'title': 'Server Rotation Test',
                    'description': 'Compare rotation strategies',
                    'template': 'server_rotation_test'
                }
            ]
        })