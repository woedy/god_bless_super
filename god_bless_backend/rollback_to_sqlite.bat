@echo off
echo 🔄 Rolling back to SQLite...
echo.

echo 📝 Step 1: Switching back to SQLite configuration...
copy .env.sqlite .env.local
echo ✅ Environment switched back to SQLite
echo.

echo 🔄 Step 2: Restarting containers with SQLite...
docker-compose down
docker-compose up -d
echo ⏳ Waiting for containers to start...
timeout /t 15 /nobreak > nul
echo.

echo 🎉 Rollback Complete!
echo ✅ Your application is back on SQLite with original data
echo 🌐 Access your app at: http://localhost:6161
echo.
pause