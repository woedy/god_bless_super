@echo off
echo 🚀 Starting PostgreSQL Migration...
echo.

echo 📊 Step 1: Creating complete backup from SQLite...
python full_backup_export.py
if %errorlevel% neq 0 (
    echo ❌ Backup failed! Aborting migration.
    pause
    exit /b 1
)
echo.

echo 🔄 Step 2: Switching to PostgreSQL configuration...
copy .env.postgres .env.local
echo ✅ Environment switched to PostgreSQL
echo.

echo 🐘 Step 3: Starting PostgreSQL containers...
docker-compose down
docker-compose up -d
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 30 /nobreak > nul
echo.

echo 🔧 Step 4: Running Django migrations...
docker-compose exec backend python manage.py migrate
if %errorlevel% neq 0 (
    echo ❌ Migrations failed! Check the logs.
    pause
    exit /b 1
)
echo.

echo 📥 Step 5: Importing data to PostgreSQL...
docker-compose exec backend python full_backup/migrate_to_postgres_*.py
if %errorlevel% neq 0 (
    echo ❌ Data import failed! Check the logs.
    pause
    exit /b 1
)
echo.

echo 🎉 Migration Complete!
echo ✅ Your application is now running on PostgreSQL
echo 🌐 Access your app at: http://localhost:6161
echo.
pause