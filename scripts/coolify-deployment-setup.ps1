# Coolify Deployment Setup Script for God Bless America Platform (PowerShell)
# This script helps automate the initial setup and validation for Coolify deployment

param(
    [switch]$Force = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$EnvExampleFile = Join-Path $ProjectRoot ".env.example"
$EnvProductionFile = Join-Path $ProjectRoot ".env.production.example"
$DockerComposeFile = Join-Path $ProjectRoot "docker-compose.yml"

# Functions
function Write-Header {
    param([string]$Message)
    Write-Host "================================" -ForegroundColor $Colors.Blue
    Write-Host $Message -ForegroundColor $Colors.Blue
    Write-Host "================================" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Colors.Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor $Colors.Blue
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Generate random password
function New-Password {
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $password = ""
    for ($i = 0; $i -lt 25; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

# Generate Django secret key
function New-DjangoSecret {
    try {
        $secret = python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>$null
        if ($secret) {
            return $secret.Trim()
        }
    }
    catch {
        # Fallback to random string generation
    }
    
    # Fallback method
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)"
    $secret = ""
    for ($i = 0; $i -lt 50; $i++) {
        $secret += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $secret
}

# Validate environment variables
function Test-EnvironmentVariables {
    param([string]$EnvFile)
    
    $RequiredVars = @(
        "POSTGRES_DB",
        "POSTGRES_USER", 
        "POSTGRES_PASSWORD",
        "DATABASE_URL",
        "SECRET_KEY",
        "REDIS_URL",
        "ALLOWED_HOSTS",
        "CORS_ALLOWED_ORIGINS"
    )
    
    $MissingVars = @()
    
    if (Test-Path $EnvFile) {
        $content = Get-Content $EnvFile -Raw
        foreach ($var in $RequiredVars) {
            if ($content -notmatch "^$var=") {
                $MissingVars += $var
            }
        }
    } else {
        $MissingVars = $RequiredVars
    }
    
    if ($MissingVars.Count -eq 0) {
        Write-Success "All required environment variables are present"
        return $true
    } else {
        Write-Error "Missing required environment variables:"
        foreach ($var in $MissingVars) {
            Write-Host "  - $var"
        }
        return $false
    }
}

# Check Docker Compose file
function Test-DockerCompose {
    if (-not (Test-Path $DockerComposeFile)) {
        Write-Error "Docker Compose file not found: $DockerComposeFile"
        return $false
    }
    
    # Check if docker-compose is available
    if (Test-Command "docker-compose") {
        try {
            $null = docker-compose -f $DockerComposeFile config 2>$null
            Write-Success "Docker Compose file is valid"
            return $true
        }
        catch {
            Write-Error "Docker Compose file has syntax errors"
            docker-compose -f $DockerComposeFile config
            return $false
        }
    }
    elseif (Test-Command "docker") {
        try {
            $null = docker compose -f $DockerComposeFile config 2>$null
            Write-Success "Docker Compose file is valid"
            return $true
        }
        catch {
            Write-Error "Docker Compose file has syntax errors"
            docker compose -f $DockerComposeFile config
            return $false
        }
    }
    else {
        Write-Warning "Docker not available, skipping Docker Compose validation"
        return $true
    }
}

# Check required files
function Test-RequiredFiles {
    $RequiredFiles = @(
        (Join-Path $ProjectRoot "god_bless_backend\Dockerfile"),
        (Join-Path $ProjectRoot "god_bless_frontend\Dockerfile"),
        (Join-Path $ProjectRoot "nginx\nginx.conf"),
        (Join-Path $ProjectRoot "docker-compose.yml")
    )
    
    $MissingFiles = @()
    
    foreach ($file in $RequiredFiles) {
        if (-not (Test-Path $file)) {
            $MissingFiles += $file
        }
    }
    
    if ($MissingFiles.Count -eq 0) {
        Write-Success "All required files are present"
        return $true
    } else {
        Write-Error "Missing required files:"
        foreach ($file in $MissingFiles) {
            Write-Host "  - $file"
        }
        return $false
    }
}

# Generate production environment file
function New-ProductionEnvironment {
    param([string]$OutputFile)
    
    Write-Info "Generating production environment file: $OutputFile"
    
    # Generate secure values
    $DbPassword = New-Password
    $DjangoSecret = New-DjangoSecret
    $DbName = "god_bless_db"
    $DbUser = "god_bless_user"
    $CurrentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $EnvContent = @"
# Production Environment Configuration for Coolify Deployment
# Generated on $CurrentDate

# Database Configuration
POSTGRES_DB=$DbName
POSTGRES_USER=$DbUser
POSTGRES_PASSWORD=$DbPassword
DATABASE_URL=postgresql://$DbUser`:$DbPassword@database:5432/$DbName

# Django Configuration
SECRET_KEY=$DjangoSecret
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_BROWSER_XSS_FILTER=True

# Redis Configuration
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Session Configuration
SESSION_ENGINE=django.contrib.sessions.backends.cache
SESSION_CACHE_ALIAS=default
SESSION_COOKIE_AGE=86400

# Frontend Configuration
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_WS_BASE_URL=wss://yourdomain.com/ws

# Email Configuration (Optional - Update with your SMTP settings)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# Logging Configuration
LOG_LEVEL=INFO
DJANGO_LOG_LEVEL=INFO

# Performance Configuration
DB_CONN_MAX_AGE=600
CELERY_WORKER_CONCURRENCY=2
CACHE_TTL=300

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=30
HEALTH_CHECK_INTERVAL=60
"@

    Set-Content -Path $OutputFile -Value $EnvContent -Encoding UTF8
    
    Write-Success "Production environment file generated"
    Write-Warning "Please update the following values in $OutputFile:"
    Write-Host "  - ALLOWED_HOSTS (replace yourdomain.com with your actual domain)"
    Write-Host "  - CORS_ALLOWED_ORIGINS (replace yourdomain.com with your actual domain)"
    Write-Host "  - VITE_API_BASE_URL (replace yourdomain.com with your actual domain)"
    Write-Host "  - VITE_WS_BASE_URL (replace yourdomain.com with your actual domain)"
    Write-Host "  - Email configuration (if using email features)"
}

# Create Coolify deployment checklist
function New-DeploymentChecklist {
    $ChecklistFile = Join-Path $ProjectRoot "COOLIFY_DEPLOYMENT_CHECKLIST.md"
    
    $ChecklistContent = @'
# Coolify Deployment Checklist

## Pre-Deployment Setup

### DNS Configuration
- [ ] Domain purchased and configured
- [ ] A record pointing to server IP address
- [ ] WWW subdomain configured (optional)
- [ ] DNS propagation verified

### Server Requirements
- [ ] Coolify instance running on Ubuntu server
- [ ] Minimum 4GB RAM, 2 CPU cores, 50GB storage
- [ ] Server accessible from internet
- [ ] Ports 80 and 443 open

### Repository Setup
- [ ] Code pushed to Git repository
- [ ] Repository accessible to Coolify
- [ ] SSH keys or access tokens configured (if private repo)

## Coolify Configuration

### Project Setup
- [ ] New project created in Coolify
- [ ] Git repository connected
- [ ] Build pack set to "Docker Compose"
- [ ] Branch configured (usually 'main')

### Environment Variables
- [ ] All required environment variables configured
- [ ] Database credentials set
- [ ] Django SECRET_KEY configured
- [ ] Domain names updated in ALLOWED_HOSTS and CORS settings
- [ ] Redis configuration set
- [ ] Email configuration set (if needed)

### Domain Configuration
- [ ] Primary domain added
- [ ] WWW domain added (if needed)
- [ ] SSL certificate configured (Let's Encrypt recommended)
- [ ] HTTPS redirect enabled
- [ ] Domain routing configured

## Deployment Process

### Initial Deployment
- [ ] Deployment initiated from Coolify dashboard
- [ ] All services started successfully
- [ ] Health checks passing
- [ ] No errors in service logs

### Post-Deployment Verification
- [ ] Website accessible via HTTPS
- [ ] Django admin accessible
- [ ] API endpoints responding
- [ ] Database migrations applied
- [ ] Static files serving correctly
- [ ] Background tasks processing (Celery)

### Security Verification
- [ ] HTTPS enforced
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Admin interface secured
- [ ] Database access restricted

## Final Steps

### Superuser Creation
- [ ] Django superuser created
- [ ] Admin access verified

### Monitoring Setup
- [ ] Health monitoring configured
- [ ] Log monitoring set up
- [ ] Backup schedules configured
- [ ] Alert notifications configured

### Documentation
- [ ] Deployment documented
- [ ] Environment variables documented
- [ ] Recovery procedures documented
- [ ] Team access configured

## Troubleshooting Resources

If you encounter issues during deployment:

1. Check the [Coolify Deployment Guide](docs/COOLIFY_DEPLOYMENT_GUIDE.md)
2. Review the [Environment Setup Checklist](docs/COOLIFY_ENVIRONMENT_SETUP.md)
3. Consult the [Troubleshooting Guide](docs/COOLIFY_TROUBLESHOOTING_GUIDE.md)
4. Check service logs in Coolify dashboard
5. Verify DNS configuration and propagation

## Support

- Coolify Documentation: https://coolify.io/docs
- Coolify Discord: https://discord.gg/coolify
- Project Issues: Check application logs and documentation
'@

    Set-Content -Path $ChecklistFile -Value $ChecklistContent -Encoding UTF8
    Write-Success "Deployment checklist created: $ChecklistFile"
}

# Main execution
function Main {
    Write-Header "Coolify Deployment Setup for God Bless America Platform"
    
    # Check if we're in the right directory
    if (-not (Test-Path $DockerComposeFile)) {
        Write-Error "This script must be run from the project root directory"
        exit 1
    }
    
    Write-Info "Project root: $ProjectRoot"
    
    # Check required tools
    Write-Header "Checking Required Tools"
    
    $ToolsOk = $true
    
    if (Test-Command "docker") {
        Write-Success "Docker is available"
    } else {
        Write-Warning "Docker not found (optional for validation)"
    }
    
    if (Test-Command "python") {
        Write-Success "Python is available"
    } else {
        Write-Warning "Python not found (needed for Django secret generation)"
    }
    
    # Check required files
    Write-Header "Checking Required Files"
    if (-not (Test-RequiredFiles)) {
        Write-Error "Some required files are missing. Please ensure all Docker files are present."
        exit 1
    }
    
    # Validate Docker Compose
    Write-Header "Validating Docker Compose Configuration"
    if (-not (Test-DockerCompose)) {
        Write-Error "Docker Compose validation failed. Please fix the configuration."
        exit 1
    }
    
    # Generate production environment file
    Write-Header "Generating Production Environment Configuration"
    
    $EnvFile = Join-Path $ProjectRoot ".env.production"
    
    if (Test-Path $EnvFile) {
        Write-Warning "Production environment file already exists: $EnvFile"
        if (-not $Force) {
            $Response = Read-Host "Do you want to overwrite it? (y/N)"
            if ($Response -notmatch "^[Yy]$") {
                Write-Info "Skipping environment file generation"
            } else {
                New-ProductionEnvironment $EnvFile
            }
        } else {
            New-ProductionEnvironment $EnvFile
        }
    } else {
        New-ProductionEnvironment $EnvFile
    }
    
    # Create deployment checklist
    Write-Header "Creating Deployment Checklist"
    New-DeploymentChecklist
    
    # Final instructions
    Write-Header "Setup Complete!"
    
    Write-Success "Coolify deployment setup completed successfully!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "1. Update domain names in .env.production file"
    Write-Host "2. Follow the simple guide: docs/COOLIFY_SIMPLE_DEPLOYMENT.md"
    Write-Host "3. Create Coolify project and connect your Git repo"
    Write-Host "4. Add environment variables and domain"
    Write-Host "5. Click Deploy!"
    Write-Host ""
    Write-Info "Important files created/updated:"
    Write-Host "- .env.production (environment variables for production)"
    Write-Host "- COOLIFY_DEPLOYMENT_CHECKLIST.md (step-by-step checklist)"
    Write-Host ""
    Write-Warning "Remember to:"
    Write-Host "- Update domain names in the environment file"
    Write-Host "- Configure DNS before deployment"
    Write-Host "- Test the deployment in a staging environment first"
    Write-Host "- Keep your environment variables secure"
}

# Script entry point
if ($MyInvocation.InvocationName -ne '.') {
    Main
}