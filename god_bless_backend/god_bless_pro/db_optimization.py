"""
Database query optimization utilities and helpers.
"""
from django.db import connection
from django.db.models import Prefetch, Q
from typing import List, Dict, Any
import time


class QueryOptimizer:
    """Utilities for optimizing database queries."""
    
    @staticmethod
    def log_queries(func):
        """Decorator to log SQL queries executed by a function."""
        def wrapper(*args, **kwargs):
            from django.conf import settings
            from django.db import reset_queries
            
            if settings.DEBUG:
                reset_queries()
                start_time = time.time()
                
                result = func(*args, **kwargs)
                
                end_time = time.time()
                queries = connection.queries
                
                print(f"\n{'='*80}")
                print(f"Function: {func.__name__}")
                print(f"Number of queries: {len(queries)}")
                print(f"Execution time: {end_time - start_time:.4f}s")
                print(f"{'='*80}\n")
                
                for i, query in enumerate(queries, 1):
                    print(f"Query {i}:")
                    print(f"  SQL: {query['sql'][:200]}...")
                    print(f"  Time: {query['time']}s\n")
                
                return result
            else:
                return func(*args, **kwargs)
        
        return wrapper
    
    @staticmethod
    def get_query_stats() -> Dict[str, Any]:
        """Get statistics about executed queries."""
        queries = connection.queries
        total_time = sum(float(q['time']) for q in queries)
        
        return {
            'total_queries': len(queries),
            'total_time': total_time,
            'average_time': total_time / len(queries) if queries else 0,
            'queries': queries
        }
    
    @staticmethod
    def optimize_queryset(queryset, select_related: List[str] = None, 
                         prefetch_related: List[str] = None):
        """
        Optimize a queryset with select_related and prefetch_related.
        """
        if select_related:
            queryset = queryset.select_related(*select_related)
        
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        
        return queryset


class BulkOperations:
    """Utilities for bulk database operations."""
    
    @staticmethod
    def bulk_create_with_batch(model, objects: List, batch_size: int = 1000):
        """Create objects in bulk with batching for large datasets."""
        created_objects = []
        
        for i in range(0, len(objects), batch_size):
            batch = objects[i:i + batch_size]
            created_objects.extend(
                model.objects.bulk_create(batch, ignore_conflicts=False)
            )
        
        return created_objects
