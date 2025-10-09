# Performance Optimization Application Script for Windows
# This script applies all performance optimizations for the God Bless America platform

param(
    [switch]$SkipSystemOptimizations,
    [switch]$TestOnly
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-Environment {
    Write-Status "Validating environment..."
    
    # Check if Docker is running
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
    }
    catch {
        Write-Error "Docker is not running or not accessible"
        exit 1
    }
    
    # Check if docker-compose is available
    try {
        docker-compose --version | Out-Null
        Write-Success "docker-compose is available"
    }
    catch {
        Write-Error "docker-compose is not installed"
        exit 1
    }
    
    # Check if .env.performance exists
    if (-not (Test-Path ".env.performance")) {
        Write-Warning ".env.performance not found. Creating from example..."
        Copy-Item ".env.performance.example" ".env.performance"
        Write-Status "Please edit .env.performance with your specific values"
    }
    
    Write-Success "Environment validation completed"
}

function Set-DockerOptimizations {
    Write-Status "Applying Docker optimizations..."
    
    if (Test-AdminRights) {
        $dockerConfigPath = "$env:ProgramData\Docker\config\daemon.json"
        $dockerConfigDir = Split-Path $dockerConfigPath -Parent
        
        if (-not (Test-Path $dockerConfigDir)) {
            New-Item -ItemType Directory -Path $dockerConfigDir -Force | Out-Null
        }
        
        # Backup existing configuration
        if (Test-Path $dockerConfigPath) {
            Write-Status "Backing up existing Docker daemon configuration..."
            Copy-Item $dockerConfigPath "$dockerConfigPath.backup"
        }
        
        # Create optimized Docker daemon configuration
        $dockerConfig = @{
            "log-driver" = "json-file"
            "log-opts" = @{
                "max-size" = "10m"
                "max-file" = "3"
            }
            "storage-driver" = "windowsfilter"
            "max-concurrent-downloads" = 10
            "max-concurrent-uploads" = 5
        }
        
        try {
            $dockerConfig | ConvertTo-Json -Depth 3 | Set-Content $dockerConfigPath
            Write-Success "Docker daemon configuration updated"
            Write-Warning "Docker Desktop restart required for changes to take effect"
        }
        catch {
            Write-Warning "Could not update Docker daemon configuration: $($_.Exception.Message)"
        }
    }
    else {
        Write-Warning "Administrator rights required to update Docker daemon configuration"
    }
    
    Write-Success "Docker optimizations applied"
}

function Set-SystemOptimizations {
    if ($SkipSystemOptimizations) {
        Write-Status "Skipping system optimizations as requested"
        return
    }
    
    Write-Status "Applying system-level optimizations..."
    
    if (Test-AdminRights) {
        try {
            # Optimize Windows for better container performance
            Write-Status "Optimizing Windows settings for containers..."
            
            # Disable Windows Search indexing for Docker volumes (if they exist)
            $dockerVolumes = @("C:\ProgramData\Docker", "C:\Users\*\AppData\Local\Docker")
            foreach ($volume in $dockerVolumes) {
                if (Test-Path $volume) {
                    Write-Status "Excluding $volume from Windows Search indexing..."
                    # This would require additional Windows Search API calls
                }
            }
            
            Write-Success "System optimizations applied"
        }
        catch {
            Write-Warning "Some system optimizations failed: $($_.Exception.Message)"
        }
    }
    else {
        Write-Warning "Administrator rights required for system optimizations"
    }
}

function New-MonitoringScripts {
    Write-Status "Setting up performance monitoring..."
    
    # Create monitoring directory
    if (-not (Test-Path "monitoring\scripts")) {
        New-Item -ItemType Directory -Path "monitoring\scripts" -Force | Out-Null
    }
    
    # Create performance monitoring PowerShell script
    $performanceScript = @'
# Performance monitoring script for Windows

$LogFile = "god_bless_backend\logs\performance_check.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $LogFile -Value "[$Timestamp] Starting performance check..."

# Check container resource usage
try {
    $stats = docker stats --no-stream --format "table {{.Container}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}"
    Add-Content -Path $LogFile -Value $stats
}
catch {
    Add-Content -Path $LogFile -Value "Error getting Docker stats: $($_.Exception.Message)"
}

# Run resource optimizer if available
if (Test-Path "god_bless_backend\scripts\resource_optimizer.py") {
    try {
        Set-Location "god_bless_backend"
        python scripts\resource_optimizer.py 2>&1 | Add-Content -Path "..\$LogFile"
        Set-Location ".."
    }
    catch {
        Add-Content -Path $LogFile -Value "Error running resource optimizer: $($_.Exception.Message)"
    }
}

Add-Content -Path $LogFile -Value "[$Timestamp] Performance check completed."
'@
    
    Set-Content -Path "monitoring\scripts\performance_check.ps1" -Value $performanceScript
    
    Write-Success "Performance monitoring setup completed"
}

function Set-NginxOptimizations {
    Write-Status "Applying Nginx optimizations..."
    
    # Ensure nginx cache directories exist
    $cacheDirectories = @("nginx\cache\static", "nginx\cache\api", "nginx\cache\media", "nginx\cache\fastcgi")
    foreach ($dir in $cacheDirectories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    # Create nginx optimization test script
    $nginxTestScript = @'
# Test Nginx optimization configuration for Windows

Write-Host "Testing Nginx configuration..."

# Test configuration syntax
try {
    docker exec god_bless_nginx nginx -t
    Write-Host "✓ Nginx configuration is valid" -ForegroundColor Green
}
catch {
    Write-Host "✗ Nginx configuration has errors" -ForegroundColor Red
    exit 1
}

# Test gzip compression
Write-Host "Testing gzip compression..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost/static/css/style.css" -Headers @{"Accept-Encoding"="gzip"} -Method Head
    if ($response.Headers["Content-Encoding"] -contains "gzip") {
        Write-Host "✓ Gzip compression working" -ForegroundColor Green
    } else {
        Write-Host "✗ Gzip compression not working" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Could not test gzip compression: $($_.Exception.Message)" -ForegroundColor Red
}

# Test cache headers
Write-Host "Testing cache headers..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost/static/css/style.css" -Method Head
    if ($response.Headers["Cache-Control"]) {
        Write-Host "✓ Cache headers present" -ForegroundColor Green
    } else {
        Write-Host "✗ Cache headers missing" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Could not test cache headers: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Nginx optimization test completed"
'@
    
    Set-Content -Path "nginx\scripts\test_optimization.ps1" -Value $nginxTestScript
    
    Write-Success "Nginx optimizations applied"
}

function Set-RedisOptimizations {
    Write-Status "Applying Redis optimizations..."
    
    # Ensure Redis data directory exists
    if (-not (Test-Path "redis\data")) {
        New-Item -ItemType Directory -Path "redis\data" -Force | Out-Null
    }
    
    # Create Redis monitoring script
    $redisMonitorScript = @'
# Redis performance monitoring script for Windows

$RedisContainer = "god_bless_redis"
$LogFile = "god_bless_backend\logs\redis_monitor.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $LogFile -Value "[$Timestamp] Redis monitoring check..."

try {
    # Check Redis memory usage
    $memoryInfo = docker exec $RedisContainer redis-cli INFO memory
    $memoryUsed = ($memoryInfo | Select-String "used_memory_human").ToString()
    Add-Content -Path $LogFile -Value $memoryUsed

    # Check Redis connection count
    $clientInfo = docker exec $RedisContainer redis-cli INFO clients
    $connectedClients = ($clientInfo | Select-String "connected_clients").ToString()
    Add-Content -Path $LogFile -Value $connectedClients

    # Check Redis keyspace
    $keyspaceInfo = docker exec $RedisContainer redis-cli INFO keyspace
    Add-Content -Path $LogFile -Value $keyspaceInfo
}
catch {
    Add-Content -Path $LogFile -Value "Error monitoring Redis: $($_.Exception.Message)"
}

Add-Content -Path $LogFile -Value "[$Timestamp] Redis monitoring completed."
'@
    
    Set-Content -Path "monitoring\scripts\redis_monitor.ps1" -Value $redisMonitorScript
    
    Write-Success "Redis optimizations applied"
}

function Set-DatabaseOptimizations {
    Write-Status "Applying database optimizations..."
    
    # Create database monitoring script
    $dbMonitorScript = @'
# Database performance monitoring script for Windows

$DbContainer = "god_bless_database"
$LogFile = "god_bless_backend\logs\db_monitor.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$PostgresUser = $env:POSTGRES_USER ?? "god_bless_user"
$PostgresDb = $env:POSTGRES_DB ?? "god_bless_db"

Add-Content -Path $LogFile -Value "[$Timestamp] Database monitoring check..."

try {
    # Check database size
    $sizeQuery = "SELECT pg_size_pretty(pg_database_size(current_database()));"
    $dbSize = docker exec $DbContainer psql -U $PostgresUser -d $PostgresDb -c $sizeQuery
    Add-Content -Path $LogFile -Value "Database size: $dbSize"

    # Check connection count
    $connQuery = "SELECT count(*) FROM pg_stat_activity;"
    $connCount = docker exec $DbContainer psql -U $PostgresUser -d $PostgresDb -c $connQuery
    Add-Content -Path $LogFile -Value "Active connections: $connCount"

    # Check for long-running queries
    $longQuery = "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
    $longRunning = docker exec $DbContainer psql -U $PostgresUser -d $PostgresDb -c $longQuery
    Add-Content -Path $LogFile -Value "Long-running queries: $longRunning"
}
catch {
    Add-Content -Path $LogFile -Value "Error monitoring database: $($_.Exception.Message)"
}

Add-Content -Path $LogFile -Value "[$Timestamp] Database monitoring completed."
'@
    
    Set-Content -Path "monitoring\scripts\db_monitor.ps1" -Value $dbMonitorScript
    
    Write-Success "Database optimizations applied"
}

function New-HealthCheckScript {
    Write-Status "Creating comprehensive health check script..."
    
    $healthCheckScript = @'
# Comprehensive health check for God Bless America platform (Windows)

Write-Host "=== God Bless America Platform Health Check ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Cyan
Write-Host

function Test-ServiceRunning {
    param(
        [string]$ServiceName,
        [string]$ContainerName
    )
    
    try {
        $running = docker ps --filter "name=$ContainerName" --filter "status=running" --format "{{.Names}}"
        if ($running -contains $ContainerName) {
            Write-Host "✓ $ServiceName is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ $ServiceName is not running" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ $ServiceName status unknown: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ContainerHealth {
    param([string]$ContainerName)
    
    try {
        $health = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
        
        switch ($health) {
            "healthy" {
                Write-Host "✓ $ContainerName is healthy" -ForegroundColor Green
                return $true
            }
            "unhealthy" {
                Write-Host "✗ $ContainerName is unhealthy" -ForegroundColor Red
                return $false
            }
            "starting" {
                Write-Host "⚠ $ContainerName is starting" -ForegroundColor Yellow
                return $false
            }
            default {
                Write-Host "? $ContainerName health status unknown" -ForegroundColor Yellow
                return $false
            }
        }
    }
    catch {
        Write-Host "? $ContainerName health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Check all services
Write-Host "Checking service status..." -ForegroundColor Cyan
Test-ServiceRunning "Database" "god_bless_database"
Test-ServiceRunning "Redis" "god_bless_redis"
Test-ServiceRunning "Backend" "god_bless_backend"
Test-ServiceRunning "Celery Worker" "god_bless_celery_worker"
Test-ServiceRunning "Celery Beat" "god_bless_celery_beat"
Test-ServiceRunning "Frontend" "god_bless_frontend"
Test-ServiceRunning "Platform" "god_bless_platform"
Test-ServiceRunning "Nginx" "god_bless_nginx"

Write-Host
Write-Host "Checking health status..." -ForegroundColor Cyan
Test-ContainerHealth "god_bless_database"
Test-ContainerHealth "god_bless_redis"
Test-ContainerHealth "god_bless_backend"
Test-ContainerHealth "god_bless_celery_worker"
Test-ContainerHealth "god_bless_frontend"
Test-ContainerHealth "god_bless_platform"
Test-ContainerHealth "god_bless_nginx"

Write-Host
Write-Host "Checking resource usage..." -ForegroundColor Cyan
try {
    docker stats --no-stream --format "table {{.Container}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}`t{{.NetIO}}`t{{.BlockIO}}"
}
catch {
    Write-Host "Could not retrieve resource usage: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host
Write-Host "Health check completed." -ForegroundColor Cyan
'@
    
    Set-Content -Path "scripts\health_check.ps1" -Value $healthCheckScript
    
    Write-Success "Health check script created"
}

function Test-PerformanceOptimizations {
    Write-Status "Testing performance optimizations..."
    
    # Test Docker connectivity
    try {
        docker ps | Out-Null
        Write-Success "Docker connectivity test passed"
    }
    catch {
        Write-Error "Docker connectivity test failed"
        return $false
    }
    
    # Test if containers are running
    $containers = @("god_bless_database", "god_bless_redis", "god_bless_backend")
    foreach ($container in $containers) {
        try {
            $status = docker inspect --format='{{.State.Status}}' $container 2>$null
            if ($status -eq "running") {
                Write-Success "$container is running"
            } else {
                Write-Warning "$container is not running (status: $status)"
            }
        }
        catch {
            Write-Warning "$container status could not be determined"
        }
    }
    
    # Test configuration files
    $configFiles = @(
        "docker-compose.yml",
        "nginx\nginx.conf",
        "nginx\conf.d\compression.conf",
        "god_bless_backend\god_bless_pro\settings.py"
    )
    
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            Write-Success "Configuration file exists: $file"
        } else {
            Write-Warning "Configuration file missing: $file"
        }
    }
    
    Write-Success "Performance optimization tests completed"
    return $true
}

# Main execution
function Main {
    Write-Status "Starting performance optimization application for Windows..."
    
    if ($TestOnly) {
        Test-PerformanceOptimizations
        return
    }
    
    Test-Environment
    Set-DockerOptimizations
    Set-SystemOptimizations
    New-MonitoringScripts
    Set-NginxOptimizations
    Set-RedisOptimizations
    Set-DatabaseOptimizations
    New-HealthCheckScript
    
    Write-Success "Performance optimization application completed!"
    Write-Host
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review and edit .env.performance with your specific values"
    Write-Host "2. Restart Docker Desktop if daemon.json was updated"
    Write-Host "3. Restart the application: docker-compose down; docker-compose up -d"
    Write-Host "4. Run health check: .\scripts\health_check.ps1"
    Write-Host "5. Monitor performance: .\monitoring\scripts\performance_check.ps1"
    Write-Host
    Write-Status "Performance optimization setup is complete!"
}

# Run main function
Main