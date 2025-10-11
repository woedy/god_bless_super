@echo off
echo === Testing Minimal Docker Setup ===
echo.

echo Step 1: Stopping existing containers...
docker-compose -f docker-compose.minimal.yml down

echo.
echo Step 2: Building minimal image...
docker-compose -f docker-compose.minimal.yml build --no-cache backend

echo.
echo Step 3: Testing entrypoint script...
docker-compose -f docker-compose.minimal.yml run --rm backend /bin/bash -c "ls -la /god_bless_django/docker-entrypoint-sqlite.sh"

echo.
echo Step 4: Testing script execution...
docker-compose -f docker-compose.minimal.yml run --rm backend /bin/bash -c "/god_bless_django/docker-entrypoint-sqlite.sh echo 'Script executed successfully'"

echo.
echo Step 5: Starting full services...
echo Press Ctrl+C to stop
docker-compose -f docker-compose.minimal.yml up

pause
