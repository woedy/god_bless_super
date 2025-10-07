#!/usr/bin/env pwsh

Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

Write-Host "Rebuilding containers..." -ForegroundColor Yellow
docker-compose build --no-cache

Write-Host "Starting containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Checking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host "Following logs (Ctrl+C to exit)..." -ForegroundColor Yellow
docker-compose logs -f god_bless_app