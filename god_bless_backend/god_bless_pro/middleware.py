"""
Custom middleware for caching and performance optimization.
"""
import hashlib
import json
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse


class APICacheMiddleware(MiddlewareMixin):
    """
    Middleware to cache API responses for GET requests.
    Only caches responses for specific endpoints marked as cacheable.
    """
    
    # Endpoints to cache (path patterns)
    CACHEABLE_ENDPOINTS = [
        '/api/settings/',
        '/api/carriers/',
        '/api/phone-types/',
        '/api/area-codes/',
        '/api/dashboard/stats/',
    ]
    
    # Cache timeout in seconds
    CACHE_TIMEOUT = 300  # 5 minutes
    
    def process_request(self, request):
        """Check if we have a cached response for this request."""
        # Only cache GET requests
        if request.method != 'GET':
            return None
        
        # Check if endpoint is cacheable
        if not self._is_cacheable(request.path):
            return None
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        # Try to get cached response
        cached_response = cache.get(cache_key)
        if cached_response:
            # Return cached response
            response = JsonResponse(cached_response, safe=False)
            response['X-Cache'] = 'HIT'
            return response
        
        # Store cache key in request for later use
        request._cache_key = cache_key
        return None
    
    def process_response(self, request, response):
        """Cache the response if applicable."""
        # Only cache successful GET requests
        if request.method != 'GET' or response.status_code != 200:
            return response
        
        # Check if we should cache this endpoint
        if not self._is_cacheable(request.path):
            return response
        
        # Check if we have a cache key
        if not hasattr(request, '_cache_key'):
            return response
        
        # Only cache JSON responses
        if 'application/json' not in response.get('Content-Type', ''):
            return response
        
        try:
            # Get response content
            if hasattr(response, 'data'):
                # DRF Response
                content = response.data
            else:
                # Django JsonResponse
                content = json.loads(response.content.decode('utf-8'))
            
            # Cache the response
            cache.set(request._cache_key, content, self.CACHE_TIMEOUT)
            response['X-Cache'] = 'MISS'
        except Exception as e:
            # Don't fail if caching fails
            print(f"Cache error: {e}")
        
        return response
    
    def _is_cacheable(self, path):
        """Check if the path should be cached."""
        return any(path.startswith(endpoint) for endpoint in self.CACHEABLE_ENDPOINTS)
    
    def _generate_cache_key(self, request):
        """Generate a unique cache key for the request."""
        # Include path, query params, and user ID
        key_parts = [
            request.path,
            request.GET.urlencode(),
            str(request.user.id if request.user.is_authenticated else 'anonymous')
        ]
        key_string = ':'.join(key_parts)
        return f"api_cache:{hashlib.md5(key_string.encode()).hexdigest()}"


class QueryCountMiddleware(MiddlewareMixin):
    """
    Middleware to log database query counts in development.
    Helps identify N+1 query problems.
    """
    
    def process_request(self, request):
        """Reset query count at start of request."""
        from django.db import reset_queries
        from django.conf import settings
        
        if settings.DEBUG:
            reset_queries()
    
    def process_response(self, request, response):
        """Log query count at end of request."""
        from django.db import connection
        from django.conf import settings
        
        if settings.DEBUG:
            queries = len(connection.queries)
            if queries > 20:  # Warn if more than 20 queries
                print(f"⚠️  High query count: {queries} queries for {request.path}")
            
            # Add query count to response headers in debug mode
            response['X-DB-Query-Count'] = str(queries)
        
        return response


class CompressionMiddleware(MiddlewareMixin):
    """
    Middleware to add compression hints for large responses.
    """
    
    def process_response(self, request, response):
        """Add compression headers for large responses."""
        # Check response size
        if hasattr(response, 'content'):
            content_length = len(response.content)
            
            # If response is large, suggest compression
            if content_length > 1024:  # 1KB
                response['Vary'] = 'Accept-Encoding'
        
        return response
