#!/bin/bash

# Deployment Configuration Verification Script
# This script verifies that all deployment files are properly configured

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "God Bless Platform - Deployment Configuration Verification"
echo "==========================================================="
echo

# Track results
PASSED=0
FAILED=0
WARNINGS=0

check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file (MISSING)"
        ((FAILED++))
        return 1
    fi
}

check_executable() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            echo -e "${GREEN}✓${NC} $description: $file (executable)"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠${NC} $description: $file (not executable - run: chmod +x $file)"
            ((WARNINGS++))
        fi
    else
        echo -e "${RED}✗${NC} $description: $file (MISSING)"
        ((FAILED++))
    fi
}

check_env() {
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓${NC} Environment file exists: .env"
        ((PASSED++))
        
        # Check for critical variables
        if grep -q "SECRET_KEY=your-secret-key-here-change-this-in-production" .env 2>/dev/null; then
            echo -e "${YELLOW}⚠${NC} WARNING: SECRET_KEY appears to be default value"
            ((WARNINGS++))
        fi
        
        if grep -q "POSTGRES_PASSWORD=your-secure-database-password" .env 2>/dev/null; then
            echo -e "${YELLOW}⚠${NC} WARNING: POSTGRES_PASSWORD appears to be default value"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Environment file not found: .env (copy from .env.example)"
        ((WARNINGS++))
    fi
}

echo "Checking Docker Compose Files..."
check_file "docker-compose.prod.yml" "Production compose file"
check_file "docker-compose.monitoring.yml" "Monitoring compose file"
echo

echo "Checking Deployment Scripts..."
check_executable "deploy.sh" "Local deployment script"
check_executable "deploy-remote.sh" "Remote deployment script"
echo

echo "Checking Backend Configuration..."
check_file "god_bless_backend/Dockerfile.prod" "Backend production Dockerfile"
check_file "god_bless_backend/docker-entrypoint.sh" "Backend entrypoint script"
check_file "god_bless_backend/.dockerignore" "Backend dockerignore"
check_file "god_bless_backend/god_bless_pro/settings_prod.py" "Production settings"
check_file "god_bless_backend/god_bless_pro/health_checks.py" "Health check endpoints"
echo

echo "Checking Frontend Configuration..."
check_file "god_bless_frontend/Dockerfile.prod" "Frontend production Dockerfile"
check_file "god_bless_frontend/nginx.conf" "Frontend Nginx config"
check_file "god_bless_frontend/.dockerignore" "Frontend dockerignore"
echo

echo "Checking Nginx Configuration..."
check_file "nginx/nginx.conf" "Main Nginx configuration"
check_file "nginx/conf.d/default.conf" "Nginx site configuration"
echo

echo "Checking Monitoring Configuration..."
check_file "monitoring/prometheus.yml" "Prometheus configuration"
check_file "monitoring/loki-config.yml" "Loki configuration"
check_file "monitoring/promtail-config.yml" "Promtail configuration"
check_file "monitoring/alerts/service_alerts.yml" "Alert rules"
echo

echo "Checking Environment Configuration..."
check_file ".env.example" "Environment template"
check_env
echo

echo "Checking Documentation..."
check_file "DEPLOYMENT.md" "Deployment guide"
check_file "DEPLOYMENT_QUICK_REFERENCE.md" "Quick reference"
check_file "DEPLOYMENT_README.md" "Deployment README"
echo

echo "Checking Docker Requirements..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed: $(docker --version)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Docker is not installed"
    ((FAILED++))
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose is installed: $(docker-compose --version)"
    else
        echo -e "${GREEN}✓${NC} Docker Compose is installed: $(docker compose version)"
    fi
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    ((FAILED++))
fi
echo

echo "Checking Directory Structure..."
for dir in "god_bless_backend/logs" "god_bless_backend/static_cdn" "god_bless_backend/media" "backups" "nginx/conf.d" "monitoring/alerts"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $dir"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Directory missing: $dir (will be created during deployment)"
        ((WARNINGS++))
    fi
done
echo

echo "==========================================================="
echo "Verification Summary:"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment configuration is ready!${NC}"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Please address the warnings above before deploying to production.${NC}"
    fi
    
    echo
    echo "Next steps:"
    echo "1. Review and update .env file with production values"
    echo "2. Run: ./deploy.sh deploy (for local deployment)"
    echo "3. Or run: ./deploy-remote.sh (for remote deployment)"
    exit 0
else
    echo -e "${RED}✗ Deployment configuration has errors. Please fix the issues above.${NC}"
    exit 1
fi
