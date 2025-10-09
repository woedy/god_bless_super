#!/bin/bash

# God Bless Platform Remote Deployment Script
# This script deploys the application to a remote Ubuntu server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Configuration
REMOTE_USER=${REMOTE_USER:-""}
REMOTE_HOST=${REMOTE_HOST:-""}
REMOTE_PORT=${REMOTE_PORT:-22}
REMOTE_PATH=${REMOTE_PATH:-"/opt/god_bless"}
SSH_KEY=${SSH_KEY:-""}

show_help() {
    cat << EOF
God Bless Platform Remote Deployment Script

Usage: $0 [OPTIONS]

Options:
    -u, --user USER         Remote SSH user
    -h, --host HOST         Remote server hostname or IP
    -p, --port PORT         SSH port (default: 22)
    -d, --path PATH         Remote deployment path (default: /opt/god_bless)
    -k, --key KEY_PATH      SSH private key path
    --help                  Show this help message

Environment Variables:
    REMOTE_USER             Remote SSH user
    REMOTE_HOST             Remote server hostname or IP
    REMOTE_PORT             SSH port
    REMOTE_PATH             Remote deployment path
    SSH_KEY                 SSH private key path

Examples:
    $0 -u ubuntu -h 192.168.1.100 -k ~/.ssh/id_rsa
    REMOTE_USER=ubuntu REMOTE_HOST=192.168.1.100 $0

EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--user)
                REMOTE_USER="$2"
                shift 2
                ;;
            -h|--host)
                REMOTE_HOST="$2"
                shift 2
                ;;
            -p|--port)
                REMOTE_PORT="$2"
                shift 2
                ;;
            -d|--path)
                REMOTE_PATH="$2"
                shift 2
                ;;
            -k|--key)
                SSH_KEY="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

validate_config() {
    if [ -z "$REMOTE_USER" ]; then
        print_error "Remote user not specified. Use -u or set REMOTE_USER."
        exit 1
    fi
    
    if [ -z "$REMOTE_HOST" ]; then
        print_error "Remote host not specified. Use -h or set REMOTE_HOST."
        exit 1
    fi
    
    if [ -n "$SSH_KEY" ] && [ ! -f "$SSH_KEY" ]; then
        print_error "SSH key file not found: $SSH_KEY"
        exit 1
    fi
}

build_ssh_command() {
    local ssh_cmd="ssh -p $REMOTE_PORT"
    
    if [ -n "$SSH_KEY" ]; then
        ssh_cmd="$ssh_cmd -i $SSH_KEY"
    fi
    
    echo "$ssh_cmd $REMOTE_USER@$REMOTE_HOST"
}

check_remote_requirements() {
    print_info "Checking remote server requirements..."
    
    local ssh_cmd=$(build_ssh_command)
    
    # Check if Docker is installed
    if ! $ssh_cmd "command -v docker" &> /dev/null; then
        print_warning "Docker not found on remote server. Installing..."
        $ssh_cmd "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $REMOTE_USER"
        print_info "Docker installed. Please log out and back in for group changes to take effect."
    fi
    
    # Check if Docker Compose is installed
    if ! $ssh_cmd "docker compose version" &> /dev/null; then
        print_warning "Docker Compose not found. It should be included with Docker."
    fi
    
    print_info "Remote requirements check completed."
}

create_remote_directories() {
    print_info "Creating remote directories..."
    
    local ssh_cmd=$(build_ssh_command)
    
    $ssh_cmd "sudo mkdir -p $REMOTE_PATH && sudo chown $REMOTE_USER:$REMOTE_USER $REMOTE_PATH"
    
    print_info "Remote directories created."
}

sync_files() {
    print_info "Syncing files to remote server..."
    
    local rsync_cmd="rsync -avz --delete --progress"
    
    if [ -n "$SSH_KEY" ]; then
        rsync_cmd="$rsync_cmd -e 'ssh -p $REMOTE_PORT -i $SSH_KEY'"
    else
        rsync_cmd="$rsync_cmd -e 'ssh -p $REMOTE_PORT'"
    fi
    
    # Exclude unnecessary files
    local exclude_opts="--exclude='.git' --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.venv' --exclude='db.sqlite3' --exclude='logs/*' --exclude='media/*'"
    
    eval "$rsync_cmd $exclude_opts ./ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
    
    print_info "Files synced successfully."
}

deploy_remote() {
    print_info "Deploying on remote server..."
    
    local ssh_cmd=$(build_ssh_command)
    
    # Run deployment script on remote server
    $ssh_cmd "cd $REMOTE_PATH && chmod +x deploy.sh && ./deploy.sh deploy"
    
    print_info "Remote deployment completed."
}

show_remote_status() {
    print_info "Checking remote service status..."
    
    local ssh_cmd=$(build_ssh_command)
    
    $ssh_cmd "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml ps"
}

show_remote_logs() {
    print_info "Showing remote logs..."
    
    local ssh_cmd=$(build_ssh_command)
    local service=$1
    
    if [ -z "$service" ]; then
        $ssh_cmd "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml logs --tail=50"
    else
        $ssh_cmd "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml logs --tail=50 $service"
    fi
}

backup_remote() {
    print_info "Creating remote backup..."
    
    local ssh_cmd=$(build_ssh_command)
    
    $ssh_cmd "cd $REMOTE_PATH && ./deploy.sh backup"
    
    print_info "Remote backup completed."
}

download_backup() {
    print_info "Downloading latest backup..."
    
    local scp_cmd="scp -P $REMOTE_PORT"
    
    if [ -n "$SSH_KEY" ]; then
        scp_cmd="$scp_cmd -i $SSH_KEY"
    fi
    
    local latest_backup=$($ssh_cmd "ls -t $REMOTE_PATH/backups/db_backup_*.sql | head -1")
    
    if [ -n "$latest_backup" ]; then
        $scp_cmd "$REMOTE_USER@$REMOTE_HOST:$latest_backup" ./backups/
        print_info "Backup downloaded to ./backups/"
    else
        print_error "No backup found on remote server."
    fi
}

main() {
    parse_args "$@"
    validate_config
    
    print_info "Remote Deployment Configuration:"
    print_info "  User: $REMOTE_USER"
    print_info "  Host: $REMOTE_HOST"
    print_info "  Port: $REMOTE_PORT"
    print_info "  Path: $REMOTE_PATH"
    echo
    
    read -p "Continue with deployment? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Deployment cancelled."
        exit 0
    fi
    
    check_remote_requirements
    create_remote_directories
    sync_files
    deploy_remote
    show_remote_status
    
    print_info "Remote deployment completed successfully!"
    print_info "Access the application at: http://$REMOTE_HOST"
}

# Run main function
main "$@"
