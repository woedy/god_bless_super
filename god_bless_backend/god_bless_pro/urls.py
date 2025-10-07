"""
URL configuration for mysite project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.conf.urls.static import static
from god_bless_pro import views
from god_bless_pro import health_checks


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health check endpoints
    path('api/health/', health_checks.health_check, name='health_check'),
    path('api/health/ready/', health_checks.readiness_check, name='readiness_check'),
    path('api/health/live/', health_checks.liveness_check, name='liveness_check'),
    path('api/metrics/', health_checks.metrics, name='metrics'),
    
    # API endpoints
    path('api/accounts/', include('accounts.api.urls', 'accounts_api')),
    path('api/phone-generator/', include('phone_generator.api.urls', 'phone_generator_api')),
    path('api/phone-validator/', include('phone_number_validator.api.urls', 'phone_number_validator_api')),
    path('api/sms-sender/', include('sms_sender.urls', 'sms_sender_validator_api')),
    path('api/dashboard/', include('dashboard.api.urls', 'dashboard_api')),
    path('api/smtp-manager/', include('smtps.urls', 'smtp_api')),
    path('api/proxy-server/', include('proxy_server.urls', 'proxy_api')),
    path('api/projects/', include('projects.urls', 'projects_api')),
    path('api/tasks/', include('tasks.urls', 'tasks_api')),
    path('api/logs/frontend-error/', views.log_frontend_error, name='log_frontend_error'),

]


if settings.DEBUG:
    urlpatterns = urlpatterns + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

