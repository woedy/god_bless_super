#!/bin/bash

# Performance Optimization Application Script
# This script applies all performance optimizations for the God Bless America platform

set -e

echo "=== God Bless America Platform Performance Optimization ==="
echo "Starting performance optimization application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Some optimizations may require non-root execution."
    fi
}

# Validate environment
validate_environment() {
    print_status "Validating environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "docker-compose is not installed"
        exit 1
    fi
    
    # Check if .env.performance exists
    if [[ ! -f .env.performance ]]; then
        print_warning ".env.performance not found. Creating from example..."
        cp .env.performance.example .env.performance
        print_status "Please edit .env.performance with your specific values"
    fi
    
    print_success "Environment validation completed"
}

# Apply Docker resource optimizations
apply_docker_optimizations() {
    print_status "Applying Docker resource optimizations..."
    
    # Create optimized Docker daemon configuration
    if [[ -f /etc/docker/daemon.json ]]; then
        print_status "Backing up existing Docker daemon configuration..."
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup
    fi
    
    # Apply Docker optimizations (if running with appropriate permissions)
    if [[ $EUID -eq 0 ]] || sudo -n true 2>/dev/null; then
        cat > /tmp/docker-daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    },
    "max-concurrent-downloads": 10,
    "max-concurrent-uploads": 5
}
EOF
        
        if sudo cp /tmp/docker-daemon.json /etc/docker/daemon.json; then
            print_success "Docker daemon configuration updated"
            print_warning "Docker daemon restart required for changes to take effect"
        else
            print_warning "Could not update Docker daemon configuration"
        fi
        
        rm -f /tmp/docker-daemon.json
    else
        print_warning "Insufficient permissions to update Docker daemon configuration"
    fi
    
    print_success "Docker optimizations applied"
}

# Apply system-level optimizations
apply_system_optimizations() {
    print_status "Applying system-level optimizations..."
    
    # Increase file descriptor limits
    if [[ $EUID -eq 0 ]] || sudo -n true 2>/dev/null; then
        echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf >/dev/null
        echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf >/dev/null
        print_success "File descriptor limits increased"
    else
        print_warning "Could not update file descriptor limits (requires sudo)"
    fi
    
    # Optimize kernel parameters for networking
    if [[ $EUID -eq 0 ]] || sudo -n true 2>/dev/null; then
        cat > /tmp/sysctl-performance.conf << EOF
# Network performance optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 3

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# File system optimizations
fs.file-max = 2097152
EOF
        
        if sudo cp /tmp/sysctl-performance.conf /etc/sysctl.d/99-performance.conf; then
            sudo sysctl -p /etc/sysctl.d/99-performance.conf >/dev/null 2>&1
            print_success "Kernel parameters optimized"
        else
            print_warning "Could not update kernel parameters"
        fi
        
        rm -f /tmp/sysctl-performance.conf
    else
        print_warning "Could not apply kernel optimizations (requires sudo)"
    fi
    
    print_success "System optimizations applied"
}

# Create performance monitoring scripts
setup_monitoring() {
    print_status "Setting up performance monitoring..."
    
    # Create monitoring directory
    mkdir -p monitoring/scripts
    
    # Create performance monitoring cron job
    cat > monitoring/scripts/performance_check.sh << 'EOF'
#!/bin/bash
# Performance monitoring script

LOG_FILE="/app/logs/performance_check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting performance check..." >> $LOG_FILE

# Check container resource usage
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" >> $LOG_FILE

# Run resource optimizer
if [[ -f god_bless_backend/scripts/resource_optimizer.py ]]; then
    cd god_bless_backend && python scripts/resource_optimizer.py >> $LOG_FILE 2>&1
fi

echo "[$TIMESTAMP] Performance check completed." >> $LOG_FILE
EOF
    
    chmod +x monitoring/scripts/performance_check.sh
    
    # Create log rotation configuration
    cat > monitoring/scripts/logrotate.conf << 'EOF'
/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker exec god_bless_backend pkill -USR1 -f "gunicorn"
    endscript
}
EOF
    
    print_success "Performance monitoring setup completed"
}

# Apply Nginx optimizations
apply_nginx_optimizations() {
    print_status "Applying Nginx optimizations..."
    
    # Ensure nginx cache directories exist
    mkdir -p nginx/cache/{static,api,media,fastcgi}
    
    # Set appropriate permissions
    chmod 755 nginx/cache nginx/cache/*
    
    # Create nginx optimization test script
    cat > nginx/scripts/test_optimization.sh << 'EOF'
#!/bin/bash
# Test Nginx optimization configuration

echo "Testing Nginx configuration..."

# Test configuration syntax
if docker exec god_bless_nginx nginx -t; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration has errors"
    exit 1
fi

# Test gzip compression
echo "Testing gzip compression..."
curl -H "Accept-Encoding: gzip" -I http://localhost/static/css/style.css 2>/dev/null | grep -i "content-encoding: gzip" && echo "✓ Gzip compression working" || echo "✗ Gzip compression not working"

# Test cache headers
echo "Testing cache headers..."
curl -I http://localhost/static/css/style.css 2>/dev/null | grep -i "cache-control" && echo "✓ Cache headers present" || echo "✗ Cache headers missing"

echo "Nginx optimization test completed"
EOF
    
    chmod +x nginx/scripts/test_optimization.sh
    
    print_success "Nginx optimizations applied"
}

# Apply Redis optimizations
apply_redis_optimizations() {
    print_status "Applying Redis optimizations..."
    
    # Ensure Redis data directory exists
    mkdir -p redis/data
    chmod 755 redis/data
    
    # Create Redis monitoring script
    cat > monitoring/scripts/redis_monitor.sh << 'EOF'
#!/bin/bash
# Redis performance monitoring script

REDIS_CONTAINER="god_bless_redis"
LOG_FILE="/app/logs/redis_monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Redis monitoring check..." >> $LOG_FILE

# Check Redis memory usage
docker exec $REDIS_CONTAINER redis-cli INFO memory | grep used_memory_human >> $LOG_FILE

# Check Redis connection count
docker exec $REDIS_CONTAINER redis-cli INFO clients | grep connected_clients >> $LOG_FILE

# Check Redis keyspace
docker exec $REDIS_CONTAINER redis-cli INFO keyspace >> $LOG_FILE

echo "[$TIMESTAMP] Redis monitoring completed." >> $LOG_FILE
EOF
    
    chmod +x monitoring/scripts/redis_monitor.sh
    
    print_success "Redis optimizations applied"
}

# Apply database optimizations
apply_database_optimizations() {
    print_status "Applying database optimizations..."
    
    # Create database monitoring script
    cat > monitoring/scripts/db_monitor.sh << 'EOF'
#!/bin/bash
# Database performance monitoring script

DB_CONTAINER="god_bless_database"
LOG_FILE="/app/logs/db_monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Database monitoring check..." >> $LOG_FILE

# Check database size
docker exec $DB_CONTAINER psql -U ${POSTGRES_USER:-god_bless_user} -d ${POSTGRES_DB:-god_bless_db} -c "SELECT pg_size_pretty(pg_database_size(current_database()));" >> $LOG_FILE

# Check connection count
docker exec $DB_CONTAINER psql -U ${POSTGRES_USER:-god_bless_user} -d ${POSTGRES_DB:-god_bless_db} -c "SELECT count(*) FROM pg_stat_activity;" >> $LOG_FILE

# Check for long-running queries
docker exec $DB_CONTAINER psql -U ${POSTGRES_USER:-god_bless_user} -d ${POSTGRES_DB:-god_bless_db} -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';" >> $LOG_FILE

echo "[$TIMESTAMP] Database monitoring completed." >> $LOG_FILE
EOF
    
    chmod +x monitoring/scripts/db_monitor.sh
    
    print_success "Database optimizations applied"
}

# Create comprehensive health check script
create_health_check() {
    print_status "Creating comprehensive health check script..."
    
    cat > scripts/health_check.sh << 'EOF'
#!/bin/bash
# Comprehensive health check for God Bless America platform

set -e

echo "=== God Bless America Platform Health Check ==="
echo "Timestamp: $(date)"
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local service=$1
    local container=$2
    
    if docker ps --filter "name=$container" --filter "status=running" | grep -q $container; then
        echo -e "${GREEN}✓${NC} $service is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service is not running"
        return 1
    fi
}

check_health() {
    local container=$1
    local health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no-health-check")
    
    case $health in
        "healthy")
            echo -e "${GREEN}✓${NC} $container is healthy"
            return 0
            ;;
        "unhealthy")
            echo -e "${RED}✗${NC} $container is unhealthy"
            return 1
            ;;
        "starting")
            echo -e "${YELLOW}⚠${NC} $container is starting"
            return 1
            ;;
        *)
            echo -e "${YELLOW}?${NC} $container health status unknown"
            return 1
            ;;
    esac
}

# Check all services
echo "Checking service status..."
check_service "Database" "god_bless_database"
check_service "Redis" "god_bless_redis"
check_service "Backend" "god_bless_backend"
check_service "Celery Worker" "god_bless_celery_worker"
check_service "Celery Beat" "god_bless_celery_beat"
check_service "Frontend" "god_bless_frontend"
check_service "Platform" "god_bless_platform"
check_service "Nginx" "god_bless_nginx"

echo
echo "Checking health status..."
check_health "god_bless_database"
check_health "god_bless_redis"
check_health "god_bless_backend"
check_health "god_bless_celery_worker"
check_health "god_bless_frontend"
check_health "god_bless_platform"
check_health "god_bless_nginx"

echo
echo "Checking resource usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

echo
echo "Health check completed."
EOF
    
    chmod +x scripts/health_check.sh
    
    print_success "Health check script created"
}

# Main execution
main() {
    print_status "Starting performance optimization application..."
    
    check_permissions
    validate_environment
    apply_docker_optimizations
    apply_system_optimizations
    setup_monitoring
    apply_nginx_optimizations
    apply_redis_optimizations
    apply_database_optimizations
    create_health_check
    
    print_success "Performance optimization application completed!"
    echo
    echo "Next steps:"
    echo "1. Review and edit .env.performance with your specific values"
    echo "2. Restart Docker daemon if daemon.json was updated: sudo systemctl restart docker"
    echo "3. Restart the application: docker-compose down && docker-compose up -d"
    echo "4. Run health check: ./scripts/health_check.sh"
    echo "5. Monitor performance: ./monitoring/scripts/performance_check.sh"
    echo
    print_status "Performance optimization setup is complete!"
}

# Run main function
main "$@"