"""
A/B Testing Service
Manages A/B testing experiments for campaign optimization
"""
import hashlib
import random
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q
from django.core.cache import cache
import numpy as np
from scipy import stats

from .models import (
    ABTestExperiment, ABTestVariant, ABTestAssignment, ABTestResult,
    CampaignOptimizationRecommendation, SMSMessage, SMSCampaign
)


logger = logging.getLogger(__name__)


class ABTestingService:
    """Service for managing A/B testing experiments"""
    
    def __init__(self, user):
        self.user = user
        self.logger = logging.getLogger(f"{__name__}.{user.id}")
    
    def create_experiment(self, name: str, test_type: str, hypothesis: str, 
                         control_config: Dict[str, Any], variant_config: Dict[str, Any],
                         **kwargs) -> ABTestExperiment:
        """Create a new A/B testing experiment"""
        
        experiment = ABTestExperiment.objects.create(
            user=self.user,
            name=name,
            test_type=test_type,
            hypothesis=hypothesis,
            control_config=control_config,
            variant_config=variant_config,
            traffic_split=kwargs.get('traffic_split', 0.5),
            minimum_sample_size=kwargs.get('minimum_sample_size', 100),
            confidence_level=kwargs.get('confidence_level', 0.95),
            primary_metric=kwargs.get('primary_metric', 'delivery_rate'),
            secondary_metrics=kwargs.get('secondary_metrics', []),
            description=kwargs.get('description', '')
        )
        
        # Create control and variant groups
        control_variant = ABTestVariant.objects.create(
            experiment=experiment,
            name='Control',
            is_control=True,
            configuration=control_config,
            traffic_allocation=experiment.traffic_split
        )
        
        variant_variant = ABTestVariant.objects.create(
            experiment=experiment,
            name='Variant',
            is_control=False,
            configuration=variant_config,
            traffic_allocation=1.0 - experiment.traffic_split
        )
        
        self.logger.info(f"Created A/B test experiment: {name} ({test_type})")
        return experiment
    
    def start_experiment(self, experiment_id: int) -> bool:
        """Start an A/B testing experiment"""
        try:
            experiment = ABTestExperiment.objects.get(id=experiment_id, user=self.user)
            
            if experiment.status != 'draft':
                raise ValueError(f"Cannot start experiment in {experiment.status} status")
            
            experiment.status = 'running'
            experiment.started_at = timezone.now()
            experiment.save()
            
            self.logger.info(f"Started A/B test experiment: {experiment.name}")
            return True
            
        except ABTestExperiment.DoesNotExist:
            self.logger.error(f"Experiment {experiment_id} not found")
            return False
        except Exception as e:
            self.logger.error(f"Failed to start experiment {experiment_id}: {str(e)}")
            return False
    
    def assign_message_to_variant(self, experiment_id: int, message: SMSMessage, 
                                 assignment_method: str = 'hash_based') -> Optional[ABTestVariant]:
        """Assign a message to an A/B test variant"""
        try:
            experiment = ABTestExperiment.objects.get(id=experiment_id, user=self.user, status='running')
            
            # Check if message is already assigned
            existing_assignment = ABTestAssignment.objects.filter(
                experiment=experiment, message=message
            ).first()
            
            if existing_assignment:
                return existing_assignment.variant
            
            # Get variants
            variants = list(experiment.variants.all())
            if len(variants) != 2:
                self.logger.error(f"Experiment {experiment_id} must have exactly 2 variants")
                return None
            
            # Determine assignment
            if assignment_method == 'hash_based':
                # Use hash of phone number for consistent assignment
                hash_input = f"{experiment.id}_{message.phone_number}"
                hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
                assignment_ratio = (hash_value % 1000) / 1000.0
            elif assignment_method == 'random':
                assignment_ratio = random.random()
            else:  # sequential
                # Alternate between variants
                total_assignments = ABTestAssignment.objects.filter(experiment=experiment).count()
                assignment_ratio = 0.0 if total_assignments % 2 == 0 else 1.0
            
            # Select variant based on traffic split
            if assignment_ratio < experiment.traffic_split:
                selected_variant = variants[0] if variants[0].is_control else variants[1]
            else:
                selected_variant = variants[1] if not variants[1].is_control else variants[0]
            
            # Create assignment
            assignment = ABTestAssignment.objects.create(
                experiment=experiment,
                variant=selected_variant,
                message=message,
                assignment_method=assignment_method
            )
            
            self.logger.debug(f"Assigned message {message.id} to variant {selected_variant.name}")
            return selected_variant
            
        except ABTestExperiment.DoesNotExist:
            self.logger.error(f"Active experiment {experiment_id} not found")
            return None
        except Exception as e:
            self.logger.error(f"Failed to assign message to variant: {str(e)}")
            return None
    
    def record_message_result(self, message: SMSMessage, success: bool, 
                            response_time: float = None, cost: float = None, error: bool = False):
        """Record the result of a message that's part of an A/B test"""
        try:
            # Find all A/B test assignments for this message
            assignments = ABTestAssignment.objects.filter(
                message=message, result_recorded=False
            )
            
            for assignment in assignments:
                assignment.record_result(success, response_time, cost, error)
                self.logger.debug(f"Recorded result for message {message.id} in experiment {assignment.experiment.name}")
                
                # Check if experiment should be analyzed
                self._check_experiment_completion(assignment.experiment)
                
        except Exception as e:
            self.logger.error(f"Failed to record message result: {str(e)}")
    
    def _check_experiment_completion(self, experiment: ABTestExperiment):
        """Check if experiment has enough data for analysis"""
        if experiment.status != 'running':
            return
        
        # Check minimum sample size
        variants = experiment.variants.all()
        min_sample_reached = all(
            variant.total_messages >= experiment.minimum_sample_size 
            for variant in variants
        )
        
        if min_sample_reached:
            # Check if experiment has been running for minimum duration (e.g., 24 hours)
            min_duration = timedelta(hours=24)
            if timezone.now() - experiment.started_at >= min_duration:
                self.analyze_experiment(experiment.id)
    
    def analyze_experiment(self, experiment_id: int) -> Optional[ABTestResult]:
        """Perform statistical analysis on an A/B test experiment"""
        try:
            experiment = ABTestExperiment.objects.get(id=experiment_id, user=self.user)
            variants = list(experiment.variants.all())
            
            if len(variants) != 2:
                self.logger.error(f"Cannot analyze experiment with {len(variants)} variants")
                return None
            
            control_variant = next(v for v in variants if v.is_control)
            test_variant = next(v for v in variants if not v.is_control)
            
            # Get metric values based on primary metric
            control_values = self._get_variant_metric_values(control_variant, experiment.primary_metric)
            test_values = self._get_variant_metric_values(test_variant, experiment.primary_metric)
            
            if not control_values or not test_values:
                self.logger.warning(f"Insufficient data for analysis of experiment {experiment_id}")
                return None
            
            # Perform statistical test
            if experiment.primary_metric in ['delivery_rate', 'success_rate', 'error_rate']:
                # Use proportion test for rate metrics
                result = self._perform_proportion_test(control_values, test_values, experiment.confidence_level)
            else:
                # Use t-test for continuous metrics
                result = self._perform_t_test(control_values, test_values, experiment.confidence_level)
            
            # Create or update results
            ab_result, created = ABTestResult.objects.get_or_create(
                experiment=experiment,
                defaults={
                    'confidence_level': experiment.confidence_level,
                    'analysis_method': result['method']
                }
            )
            
            # Update result fields
            ab_result.control_mean = result['control_mean']
            ab_result.variant_mean = result['variant_mean']
            ab_result.control_std = result.get('control_std')
            ab_result.variant_std = result.get('variant_std')
            ab_result.t_statistic = result.get('t_statistic')
            ab_result.p_value = result['p_value']
            ab_result.effect_size = result.get('effect_size')
            ab_result.confidence_interval_lower = result.get('ci_lower')
            ab_result.confidence_interval_upper = result.get('ci_upper')
            ab_result.practical_significance = result.get('practical_significance')
            ab_result.save()
            
            # Update experiment with results
            experiment.statistical_significance = result['p_value']
            experiment.effect_size = result.get('effect_size')
            experiment.winner = ab_result.get_winner()
            
            # Check if experiment should be completed
            if ab_result.is_significant() and experiment.status == 'running':
                experiment.status = 'completed'
                experiment.ended_at = timezone.now()
                
                # Generate optimization recommendations
                self._generate_optimization_recommendations(experiment, ab_result)
            
            experiment.save()
            
            self.logger.info(f"Analyzed experiment {experiment.name}: p-value={result['p_value']:.4f}, winner={experiment.winner}")
            return ab_result
            
        except ABTestExperiment.DoesNotExist:
            self.logger.error(f"Experiment {experiment_id} not found")
            return None
        except Exception as e:
            self.logger.error(f"Failed to analyze experiment {experiment_id}: {str(e)}")
            return None
    
    def _get_variant_metric_values(self, variant: ABTestVariant, metric: str) -> List[float]:
        """Get metric values for a variant"""
        if metric == 'delivery_rate':
            return [variant.delivery_rate] if variant.delivery_rate is not None else []
        elif metric == 'success_rate':
            return [variant.success_rate] if variant.success_rate is not None else []
        elif metric == 'response_time':
            return [variant.average_response_time] if variant.average_response_time is not None else []
        elif metric == 'error_rate':
            return [variant.error_rate] if variant.error_rate is not None else []
        elif metric == 'cost_per_message':
            return [variant.average_cost] if variant.average_cost is not None else []
        else:
            return []
    
    def _perform_t_test(self, control_values: List[float], test_values: List[float], 
                       confidence_level: float) -> Dict[str, Any]:
        """Perform t-test for continuous metrics"""
        control_array = np.array(control_values)
        test_array = np.array(test_values)
        
        # Perform independent t-test
        t_stat, p_value = stats.ttest_ind(test_array, control_array)
        
        # Calculate means and standard deviations
        control_mean = np.mean(control_array)
        test_mean = np.mean(test_array)
        control_std = np.std(control_array, ddof=1)
        test_std = np.std(test_array, ddof=1)
        
        # Calculate effect size (Cohen's d)
        pooled_std = np.sqrt(((len(control_array) - 1) * control_std**2 + 
                             (len(test_array) - 1) * test_std**2) / 
                            (len(control_array) + len(test_array) - 2))
        effect_size = (test_mean - control_mean) / pooled_std if pooled_std > 0 else 0
        
        # Calculate confidence interval for the difference
        se_diff = pooled_std * np.sqrt(1/len(control_array) + 1/len(test_array))
        df = len(control_array) + len(test_array) - 2
        t_critical = stats.t.ppf((1 + confidence_level) / 2, df)
        
        diff = test_mean - control_mean
        ci_lower = diff - t_critical * se_diff
        ci_upper = diff + t_critical * se_diff
        
        return {
            'method': 't_test',
            'control_mean': float(control_mean),
            'variant_mean': float(test_mean),
            'control_std': float(control_std),
            'variant_std': float(test_std),
            't_statistic': float(t_stat),
            'p_value': float(p_value),
            'effect_size': float(effect_size),
            'ci_lower': float(ci_lower),
            'ci_upper': float(ci_upper),
            'practical_significance': abs(effect_size) > 0.2  # Small effect size threshold
        }
    
    def _perform_proportion_test(self, control_values: List[float], test_values: List[float], 
                               confidence_level: float) -> Dict[str, Any]:
        """Perform proportion test for rate metrics"""
        # For rate metrics, we need to convert back to counts
        # This is a simplified version - in practice, you'd need actual counts
        control_rate = control_values[0] / 100.0  # Convert percentage to proportion
        test_rate = test_values[0] / 100.0
        
        # Assume sample sizes (this should come from actual data)
        n_control = 100  # This should be actual sample size
        n_test = 100
        
        # Perform two-proportion z-test
        count_control = int(control_rate * n_control)
        count_test = int(test_rate * n_test)
        
        # Calculate pooled proportion
        pooled_p = (count_control + count_test) / (n_control + n_test)
        
        # Calculate standard error
        se = np.sqrt(pooled_p * (1 - pooled_p) * (1/n_control + 1/n_test))
        
        # Calculate z-statistic
        z_stat = (test_rate - control_rate) / se if se > 0 else 0
        
        # Calculate p-value (two-tailed)
        p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
        
        # Calculate effect size (difference in proportions)
        effect_size = test_rate - control_rate
        
        # Calculate confidence interval
        se_diff = np.sqrt(control_rate * (1 - control_rate) / n_control + 
                         test_rate * (1 - test_rate) / n_test)
        z_critical = stats.norm.ppf((1 + confidence_level) / 2)
        
        ci_lower = effect_size - z_critical * se_diff
        ci_upper = effect_size + z_critical * se_diff
        
        return {
            'method': 'proportion_test',
            'control_mean': float(control_rate * 100),  # Convert back to percentage
            'variant_mean': float(test_rate * 100),
            'p_value': float(p_value),
            'effect_size': float(effect_size * 100),  # Effect size as percentage points
            'ci_lower': float(ci_lower * 100),
            'ci_upper': float(ci_upper * 100),
            'practical_significance': abs(effect_size) > 0.05  # 5 percentage point threshold
        }
    
    def _generate_optimization_recommendations(self, experiment: ABTestExperiment, result: ABTestResult):
        """Generate optimization recommendations based on A/B test results"""
        if not result.is_significant():
            return
        
        winner = result.get_winner()
        if winner == 'inconclusive':
            return
        
        # Get winning configuration
        winning_variant = experiment.variants.filter(is_control=(winner == 'control')).first()
        if not winning_variant:
            return
        
        # Generate recommendation based on test type
        if experiment.test_type == 'server_config':
            self._create_server_config_recommendation(experiment, winning_variant, result)
        elif experiment.test_type == 'routing_rules':
            self._create_routing_rules_recommendation(experiment, winning_variant, result)
        elif experiment.test_type == 'rate_limiting':
            self._create_rate_limiting_recommendation(experiment, winning_variant, result)
        elif experiment.test_type == 'send_timing':
            self._create_timing_recommendation(experiment, winning_variant, result)
        elif experiment.test_type == 'delivery_settings':
            self._create_delivery_settings_recommendation(experiment, winning_variant, result)
    
    def _create_server_config_recommendation(self, experiment: ABTestExperiment, 
                                           winning_variant: ABTestVariant, result: ABTestResult):
        """Create server configuration recommendation"""
        improvement = abs(result.effect_size) if result.effect_size else 0
        
        CampaignOptimizationRecommendation.objects.create(
            user=self.user,
            experiment=experiment,
            title=f"Optimize Server Configuration - {improvement:.1f}% Improvement",
            description=f"A/B test results show that the {winning_variant.name.lower()} server configuration "
                       f"performs {improvement:.1f}% better for {experiment.primary_metric}.",
            category='server_config',
            expected_improvement=improvement,
            confidence_score=result.confidence_level,
            implementation_effort='medium',
            configuration_changes=winning_variant.configuration,
            implementation_steps=[
                "Review winning server configuration",
                "Update server settings in production",
                "Monitor performance for 24-48 hours",
                "Rollback if issues occur"
            ]
        )
    
    def _create_routing_rules_recommendation(self, experiment: ABTestExperiment, 
                                           winning_variant: ABTestVariant, result: ABTestResult):
        """Create routing rules recommendation"""
        improvement = abs(result.effect_size) if result.effect_size else 0
        
        CampaignOptimizationRecommendation.objects.create(
            user=self.user,
            experiment=experiment,
            title=f"Update Routing Rules - {improvement:.1f}% Improvement",
            description=f"The {winning_variant.name.lower()} routing configuration shows "
                       f"{improvement:.1f}% better {experiment.primary_metric}.",
            category='routing_rules',
            expected_improvement=improvement,
            confidence_score=result.confidence_level,
            implementation_effort='low',
            configuration_changes=winning_variant.configuration,
            implementation_steps=[
                "Update routing rule priorities",
                "Apply new carrier-specific rules",
                "Test with small batch",
                "Deploy to all campaigns"
            ]
        )
    
    def _create_rate_limiting_recommendation(self, experiment: ABTestExperiment, 
                                           winning_variant: ABTestVariant, result: ABTestResult):
        """Create rate limiting recommendation"""
        improvement = abs(result.effect_size) if result.effect_size else 0
        
        CampaignOptimizationRecommendation.objects.create(
            user=self.user,
            experiment=experiment,
            title=f"Adjust Rate Limiting - {improvement:.1f}% Improvement",
            description=f"Rate limiting configuration from {winning_variant.name.lower()} group "
                       f"shows {improvement:.1f}% improvement in {experiment.primary_metric}.",
            category='rate_limiting',
            expected_improvement=improvement,
            confidence_score=result.confidence_level,
            implementation_effort='low',
            configuration_changes=winning_variant.configuration,
            implementation_steps=[
                "Update campaign rate limits",
                "Apply to similar campaigns",
                "Monitor for throttling issues",
                "Adjust if needed"
            ]
        )
    
    def _create_timing_recommendation(self, experiment: ABTestExperiment, 
                                    winning_variant: ABTestVariant, result: ABTestResult):
        """Create send timing recommendation"""
        improvement = abs(result.effect_size) if result.effect_size else 0
        
        CampaignOptimizationRecommendation.objects.create(
            user=self.user,
            experiment=experiment,
            title=f"Optimize Send Timing - {improvement:.1f}% Improvement",
            description=f"Sending messages using {winning_variant.name.lower()} timing strategy "
                       f"results in {improvement:.1f}% better {experiment.primary_metric}.",
            category='timing',
            expected_improvement=improvement,
            confidence_score=result.confidence_level,
            implementation_effort='medium',
            configuration_changes=winning_variant.configuration,
            implementation_steps=[
                "Update default send timing",
                "Apply timezone optimizations",
                "Schedule campaigns accordingly",
                "Monitor delivery patterns"
            ]
        )
    
    def _create_delivery_settings_recommendation(self, experiment: ABTestExperiment, 
                                               winning_variant: ABTestVariant, result: ABTestResult):
        """Create delivery settings recommendation"""
        improvement = abs(result.effect_size) if result.effect_size else 0
        
        CampaignOptimizationRecommendation.objects.create(
            user=self.user,
            experiment=experiment,
            title=f"Update Delivery Settings - {improvement:.1f}% Improvement",
            description=f"The {winning_variant.name.lower()} delivery configuration achieves "
                       f"{improvement:.1f}% better {experiment.primary_metric}.",
            category='delivery_settings',
            expected_improvement=improvement,
            confidence_score=result.confidence_level,
            implementation_effort='low',
            configuration_changes=winning_variant.configuration,
            implementation_steps=[
                "Update campaign delivery settings",
                "Apply to future campaigns",
                "Monitor delivery success",
                "Fine-tune as needed"
            ]
        )
    
    def get_experiment_summary(self, experiment_id: int) -> Optional[Dict[str, Any]]:
        """Get comprehensive summary of an A/B test experiment"""
        try:
            experiment = ABTestExperiment.objects.get(id=experiment_id, user=self.user)
            variants = list(experiment.variants.all())
            
            summary = {
                'experiment': {
                    'id': experiment.id,
                    'name': experiment.name,
                    'test_type': experiment.test_type,
                    'status': experiment.status,
                    'hypothesis': experiment.hypothesis,
                    'primary_metric': experiment.primary_metric,
                    'started_at': experiment.started_at,
                    'ended_at': experiment.ended_at,
                    'duration_days': experiment.get_duration_days(),
                    'winner': experiment.winner
                },
                'variants': [],
                'results': None,
                'recommendations': []
            }
            
            # Add variant data
            for variant in variants:
                variant_data = {
                    'name': variant.name,
                    'is_control': variant.is_control,
                    'total_messages': variant.total_messages,
                    'successful_messages': variant.successful_messages,
                    'failed_messages': variant.failed_messages,
                    'delivery_rate': variant.delivery_rate,
                    'success_rate': variant.success_rate,
                    'error_rate': variant.error_rate,
                    'average_response_time': variant.average_response_time,
                    'average_cost': variant.average_cost
                }
                summary['variants'].append(variant_data)
            
            # Add results if available
            try:
                result = experiment.results
                summary['results'] = {
                    'p_value': result.p_value,
                    'effect_size': result.effect_size,
                    'confidence_interval': [result.confidence_interval_lower, result.confidence_interval_upper],
                    'is_significant': result.is_significant(),
                    'practical_significance': result.practical_significance,
                    'recommendation': result.recommendation
                }
            except ABTestResult.DoesNotExist:
                pass
            
            # Add recommendations
            recommendations = experiment.recommendations.all()
            for rec in recommendations:
                rec_data = {
                    'title': rec.title,
                    'description': rec.description,
                    'expected_improvement': rec.expected_improvement,
                    'confidence_score': rec.confidence_score,
                    'implementation_effort': rec.implementation_effort,
                    'status': rec.status
                }
                summary['recommendations'].append(rec_data)
            
            return summary
            
        except ABTestExperiment.DoesNotExist:
            self.logger.error(f"Experiment {experiment_id} not found")
            return None
        except Exception as e:
            self.logger.error(f"Failed to get experiment summary: {str(e)}")
            return None
    
    def get_active_experiments_for_campaign(self, campaign: SMSCampaign) -> List[ABTestExperiment]:
        """Get active A/B test experiments that could apply to a campaign"""
        # This would typically filter experiments based on campaign characteristics
        # For now, return all running experiments for the user
        return list(ABTestExperiment.objects.filter(
            user=self.user,
            status='running'
        ))
    
    def stop_experiment(self, experiment_id: int, reason: str = 'manual_stop') -> bool:
        """Stop a running A/B test experiment"""
        try:
            experiment = ABTestExperiment.objects.get(id=experiment_id, user=self.user)
            
            if experiment.status != 'running':
                raise ValueError(f"Cannot stop experiment in {experiment.status} status")
            
            # Perform final analysis
            self.analyze_experiment(experiment_id)
            
            experiment.status = 'completed'
            experiment.ended_at = timezone.now()
            experiment.save()
            
            self.logger.info(f"Stopped A/B test experiment: {experiment.name} (reason: {reason})")
            return True
            
        except ABTestExperiment.DoesNotExist:
            self.logger.error(f"Experiment {experiment_id} not found")
            return False
        except Exception as e:
            self.logger.error(f"Failed to stop experiment {experiment_id}: {str(e)}")
            return False