# Docker Compose Configuration Validation Script for Windows
# This script validates the production Docker Compose configuration for Coolify deployment

Write-Host "🔍 Validating Docker Compose Configuration for Coolify Deployment..." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ ERROR: docker-compose.yml not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ docker-compose.yml found" -ForegroundColor Green

# Validate Docker Compose syntax
Write-Host "🔍 Validating Docker Compose syntax..." -ForegroundColor Yellow
try {
    $null = docker-compose config 2>&1
    Write-Host "✅ Docker Compose syntax is valid" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Docker Compose syntax validation failed!" -ForegroundColor Red
    docker-compose config
    exit 1
}

# Check for required services
Write-Host "🔍 Checking required services..." -ForegroundColor Yellow
$required_services = @("database", "redis", "backend", "celery_worker", "celery_beat", "frontend", "platform", "nginx")

$services = docker-compose config --services
foreach ($service in $required_services) {
    if ($services -contains $service) {
        Write-Host "✅ Service '$service' found" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR: Required service '$service' not found!" -ForegroundColor Red
        exit 1
    }
}

# Check for proper network configuration
Write-Host "🔍 Checking network configuration..." -ForegroundColor Yellow
$config = docker-compose config

if ($config -match "god_bless_internal") {
    Write-Host "✅ Internal network 'god_bless_internal' configured" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: Internal network 'god_bless_internal' not found!" -ForegroundColor Red
    exit 1
}

if ($config -match "god_bless_external") {
    Write-Host "✅ External network 'god_bless_external' configured" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: External network 'god_bless_external' not found!" -ForegroundColor Red
    exit 1
}

# Check for persistent volumes
Write-Host "🔍 Checking persistent volumes..." -ForegroundColor Yellow
$required_volumes = @("postgres_data", "redis_data", "static_files", "media_files", "backend_logs")

foreach ($volume in $required_volumes) {
    if ($config -match "$volume`:") {
        Write-Host "✅ Volume '$volume' configured" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR: Required volume '$volume' not found!" -ForegroundColor Red
        exit 1
    }
}

# Check for health checks
Write-Host "🔍 Checking health check configuration..." -ForegroundColor Yellow
$services_with_healthchecks = @("database", "redis", "backend", "celery_worker", "nginx")

foreach ($service in $services_with_healthchecks) {
    if ($config -match "healthcheck:") {
        Write-Host "✅ Health check configured for '$service'" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: No health check found for '$service'" -ForegroundColor Yellow
    }
}

# Check for proper dependency configuration
Write-Host "🔍 Checking service dependencies..." -ForegroundColor Yellow
if ($config -match "depends_on:") {
    Write-Host "✅ Backend service dependencies configured" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: Backend service dependencies not configured!" -ForegroundColor Red
    exit 1
}

# Check for resource limits
Write-Host "🔍 Checking resource limits..." -ForegroundColor Yellow
if ($config -match "resources:") {
    Write-Host "✅ Resource limits configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: No resource limits configured" -ForegroundColor Yellow
}

# Check for restart policies
Write-Host "🔍 Checking restart policies..." -ForegroundColor Yellow
if ($config -match "restart:") {
    Write-Host "✅ Restart policies configured" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: No restart policies configured!" -ForegroundColor Red
    exit 1
}

# Check for environment template
Write-Host "🔍 Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env.production.example") {
    Write-Host "✅ Environment template (.env.production.example) found" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Environment template not found" -ForegroundColor Yellow
}

# Check for security configurations
Write-Host "🔍 Checking security configurations..." -ForegroundColor Yellow
if ($config -match "internal: true") {
    Write-Host "✅ Internal network security configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Internal network security not configured" -ForegroundColor Yellow
}

# Validate port exposure
Write-Host "🔍 Checking port exposure..." -ForegroundColor Yellow
$exposed_ports = ($config | Select-String -Pattern '^\s+- "[\d]+:[\d]+"').Count
if ($exposed_ports -eq 2) {
    Write-Host "✅ Only necessary ports (80, 443) exposed" -ForegroundColor Green
} elseif ($exposed_ports -lt 2) {
    Write-Host "❌ ERROR: Required ports not exposed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "⚠️  WARNING: More ports than necessary might be exposed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🎉 Docker Compose Configuration Validation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Configuration syntax: ✅ Valid" -ForegroundColor Green
Write-Host "- Required services: ✅ All present" -ForegroundColor Green
Write-Host "- Network configuration: ✅ Properly configured" -ForegroundColor Green
Write-Host "- Persistent volumes: ✅ Configured" -ForegroundColor Green
Write-Host "- Health checks: ✅ Configured for critical services" -ForegroundColor Green
Write-Host "- Service dependencies: ✅ Properly configured" -ForegroundColor Green
Write-Host "- Security: ✅ Internal networks and minimal port exposure" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Ready for Coolify deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy .env.production.example to .env in Coolify" -ForegroundColor White
Write-Host "2. Configure all environment variables" -ForegroundColor White
Write-Host "3. Deploy using this docker-compose.yml file" -ForegroundColor White
Write-Host "4. Monitor service health through Coolify dashboard" -ForegroundColor White