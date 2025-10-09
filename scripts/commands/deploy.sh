#!/bin/bash

# God Bless Platform Deployment Script
# This script handles deployment for both local and remote environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f "${SCRIPT_DIR}/.env.example" ]; then
            cp "${SCRIPT_DIR}/.env.example" "$ENV_FILE"
            print_warning "Please update .env file with your configuration before deploying."
            exit 1
        else
            print_error ".env.example file not found. Cannot create .env file."
            exit 1
        fi
    fi
    
    print_info "All requirements met."
}

create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p "${SCRIPT_DIR}/god_bless_backend/logs"
    mkdir -p "${SCRIPT_DIR}/god_bless_backend/static_cdn"
    mkdir -p "${SCRIPT_DIR}/god_bless_backend/media"
    mkdir -p "${SCRIPT_DIR}/backups"
    mkdir -p "${SCRIPT_DIR}/nginx/conf.d"
    mkdir -p "${SCRIPT_DIR}/certbot/conf"
    mkdir -p "${SCRIPT_DIR}/certbot/www"
    
    print_info "Directories created."
}

build_images() {
    print_info "Building Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    print_info "Docker images built successfully."
}

start_services() {
    print_info "Starting services..."
    
    docker-compose -f "$COMPOSE_FILE" up -d
    
    print_info "Services started. Waiting for health checks..."
    sleep 10
}

check_health() {
    print_info "Checking service health..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "healthy"; then
            print_info "Services are healthy!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_warning "Health check timeout. Please check service logs."
    return 1
}

show_status() {
    print_info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose -f "$COMPOSE_FILE" logs --tail=50 -f
    else
        docker-compose -f "$COMPOSE_FILE" logs --tail=50 -f "$service"
    fi
}

stop_services() {
    print_info "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down
    print_info "Services stopped."
}

restart_services() {
    print_info "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" restart
    print_info "Services restarted."
}

backup_database() {
    print_info "Creating database backup..."
    
    local backup_file="backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "${POSTGRES_USER:-god_bless_user}" "${POSTGRES_DB:-god_bless_db}" > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        print_info "Database backup created: $backup_file"
    else
        print_error "Database backup failed."
        exit 1
    fi
}

restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to restore."
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will restore the database from: $backup_file"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Database restore cancelled."
        exit 0
    fi
    
    print_info "Restoring database..."
    
    docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "${POSTGRES_USER:-god_bless_user}" "${POSTGRES_DB:-god_bless_db}" < "$backup_file"
    
    print_info "Database restored successfully."
}

cleanup() {
    print_info "Cleaning up..."
    
    # Remove stopped containers
    docker-compose -f "$COMPOSE_FILE" rm -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove old backups (keep last 30 days)
    find "${SCRIPT_DIR}/backups" -name "db_backup_*.sql" -mtime +30 -delete
    
    print_info "Cleanup completed."
}

show_help() {
    cat << EOF
God Bless Platform Deployment Script

Usage: $0 [COMMAND]

Commands:
    deploy          Full deployment (build, start, health check)
    start           Start all services
    stop            Stop all services
    restart         Restart all services
    status          Show service status
    logs [service]  Show logs (optionally for specific service)
    backup          Create database backup
    restore <file>  Restore database from backup
    cleanup         Clean up old containers and images
    help            Show this help message

Examples:
    $0 deploy
    $0 logs backend
    $0 backup
    $0 restore backups/db_backup_20240101_120000.sql

EOF
}

# Main script
main() {
    local command=${1:-help}
    
    case $command in
        deploy)
            check_requirements
            create_directories
            build_images
            start_services
            check_health
            show_status
            print_info "Deployment completed successfully!"
            print_info "Access the application at: http://localhost"
            ;;
        start)
            check_requirements
            start_services
            show_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        backup)
            backup_database
            ;;
        restore)
            restore_database "$2"
            ;;
        cleanup)
            cleanup
            ;;
        help|*)
            show_help
            ;;
    esac
}

# Run main function
main "$@"
