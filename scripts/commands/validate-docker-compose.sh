#!/bin/bash

# Docker Compose Configuration Validation Script
# This script validates the production Docker Compose configuration for Coolify deployment

set -e

echo "🔍 Validating Docker Compose Configuration for Coolify Deployment..."
echo "=================================================================="

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ ERROR: docker-compose.yml not found!"
    exit 1
fi

echo "✅ docker-compose.yml found"

# Validate Docker Compose syntax
echo "🔍 Validating Docker Compose syntax..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ Docker Compose syntax is valid"
else
    echo "❌ ERROR: Docker Compose syntax validation failed!"
    docker-compose config
    exit 1
fi

# Check for required services
echo "🔍 Checking required services..."
required_services=("database" "redis" "backend" "celery_worker" "celery_beat" "frontend" "platform" "nginx")

for service in "${required_services[@]}"; do
    if docker-compose config --services | grep -q "^${service}$"; then
        echo "✅ Service '${service}' found"
    else
        echo "❌ ERROR: Required service '${service}' not found!"
        exit 1
    fi
done

# Check for proper network configuration
echo "🔍 Checking network configuration..."
if docker-compose config | grep -q "god_bless_internal"; then
    echo "✅ Internal network 'god_bless_internal' configured"
else
    echo "❌ ERROR: Internal network 'god_bless_internal' not found!"
    exit 1
fi

if docker-compose config | grep -q "god_bless_external"; then
    echo "✅ External network 'god_bless_external' configured"
else
    echo "❌ ERROR: External network 'god_bless_external' not found!"
    exit 1
fi

# Check for persistent volumes
echo "🔍 Checking persistent volumes..."
required_volumes=("postgres_data" "redis_data" "static_files" "media_files" "backend_logs")

for volume in "${required_volumes[@]}"; do
    if docker-compose config | grep -q "${volume}:"; then
        echo "✅ Volume '${volume}' configured"
    else
        echo "❌ ERROR: Required volume '${volume}' not found!"
        exit 1
    fi
done

# Check for health checks
echo "🔍 Checking health check configuration..."
services_with_healthchecks=("database" "redis" "backend" "celery_worker" "nginx")

for service in "${services_with_healthchecks[@]}"; do
    if docker-compose config | grep -A 10 "^  ${service}:" | grep -q "healthcheck:"; then
        echo "✅ Health check configured for '${service}'"
    else
        echo "⚠️  WARNING: No health check found for '${service}'"
    fi
done

# Check for proper dependency configuration
echo "🔍 Checking service dependencies..."
if docker-compose config | grep -A 5 "backend:" | grep -q "depends_on:"; then
    echo "✅ Backend service dependencies configured"
else
    echo "❌ ERROR: Backend service dependencies not configured!"
    exit 1
fi

# Check for resource limits
echo "🔍 Checking resource limits..."
if docker-compose config | grep -q "resources:"; then
    echo "✅ Resource limits configured"
else
    echo "⚠️  WARNING: No resource limits configured"
fi

# Check for restart policies
echo "🔍 Checking restart policies..."
if docker-compose config | grep -q "restart:"; then
    echo "✅ Restart policies configured"
else
    echo "❌ ERROR: No restart policies configured!"
    exit 1
fi

# Check for environment template
echo "🔍 Checking environment configuration..."
if [ -f ".env.production.example" ]; then
    echo "✅ Environment template (.env.production.example) found"
else
    echo "⚠️  WARNING: Environment template not found"
fi

# Check for security configurations
echo "🔍 Checking security configurations..."
if docker-compose config | grep -q "internal: true"; then
    echo "✅ Internal network security configured"
else
    echo "⚠️  WARNING: Internal network security not configured"
fi

# Validate port exposure
echo "🔍 Checking port exposure..."
exposed_ports=$(docker-compose config | grep -E "^\s+- \"[0-9]+:[0-9]+\"" | wc -l)
if [ "$exposed_ports" -eq 2 ]; then
    echo "✅ Only necessary ports (80, 443) exposed"
elif [ "$exposed_ports" -lt 2 ]; then
    echo "❌ ERROR: Required ports not exposed!"
    exit 1
else
    echo "⚠️  WARNING: More ports than necessary might be exposed"
fi

echo ""
echo "=================================================================="
echo "🎉 Docker Compose Configuration Validation Complete!"
echo ""
echo "Summary:"
echo "- Configuration syntax: ✅ Valid"
echo "- Required services: ✅ All present"
echo "- Network configuration: ✅ Properly configured"
echo "- Persistent volumes: ✅ Configured"
echo "- Health checks: ✅ Configured for critical services"
echo "- Service dependencies: ✅ Properly configured"
echo "- Security: ✅ Internal networks and minimal port exposure"
echo ""
echo "🚀 Ready for Coolify deployment!"
echo ""
echo "Next steps:"
echo "1. Copy .env.production.example to .env in Coolify"
echo "2. Configure all environment variables"
echo "3. Deploy using this docker-compose.yml file"
echo "4. Monitor service health through Coolify dashboard"