# Simple Coolify Deployment Guide

## What You Need
- Coolify instance running
- Domain name pointing to your server
- This project's code in a Git repository

## Step 1: Generate Environment Variables
Run the setup script to create your environment file:
```bash
# Linux/Mac
./scripts/coolify-deployment-setup.sh

# Windows
.\scripts\coolify-deployment-setup.ps1
```

This creates `.env.production` with secure passwords and settings.

## Step 2: Create Project in Coolify
1. Open Coolify dashboard
2. Click "New Project"
3. Name it "god-bless-america"
4. Click "Create"

## Step 3: Connect Repository
1. Click "New Resource" → "Git Repository"
2. Enter your Git repository URL
3. Select branch (usually `main`)
4. Set Build Pack to "Docker Compose"
5. Click "Save"

## Step 4: Add Environment Variables
1. Go to "Environment Variables" tab
2. Copy all variables from your `.env.production` file
3. Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` with your actual domain
4. Save

## Step 5: Add Domain
1. Go to "Domains" tab
2. Click "Add Domain"
3. Enter your domain name
4. Enable "Generate SSL Certificate" (Let's Encrypt)
5. Save

## Step 6: Deploy
1. Click "Deploy" button
2. Wait for deployment to complete
3. All services should show as "Healthy"

## Step 7: Create Django Superuser
1. Go to backend service in Coolify
2. Open terminal
3. Run: `python manage.py createsuperuser`

## Done! 🎉
Your app should be live at `https://yourdomain.com`

## If Something Goes Wrong
- Check the logs in Coolify dashboard
- Verify environment variables are set correctly
- Make sure DNS is pointing to your server
- Ensure all services show as "Healthy"

That's it! Coolify handles SSL, nginx, health checks, and everything else automatically.