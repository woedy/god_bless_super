#!/usr/bin/env pwsh
# God Bless America - Docker Status Script
# Usage: .\status.ps1

Write-Host "God Bless America Docker Services Status" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location god_bless_backend

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "Error: docker-compose.yml not found in god_bless_backend directory" -ForegroundColor Red
    exit 1
}

# Show container status
Write-Host "Container Status:" -ForegroundColor Yellow
docker-compose --env-file .env.local ps

Write-Host ""
Write-Host "Quick Actions:" -ForegroundColor Gray
Write-Host "  Start:  .\start.ps1" -ForegroundColor White
Write-Host "  Stop:   .\stop.ps1" -ForegroundColor White
Write-Host "  Logs:   docker-compose logs -f" -ForegroundColor White
Write-Host "  Shell:  docker-compose exec god_bless_app bash" -ForegroundColor White

# Return to root directory
Set-Location ..