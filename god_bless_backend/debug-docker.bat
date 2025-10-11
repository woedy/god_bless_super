@echo off
echo === Docker Debug Script ===
echo.

echo Step 1: Stopping existing containers...
docker-compose down

echo.
echo Step 2: Building new image with no cache...
docker-compose build --no-cache backend

echo.
echo Step 3: Testing if entrypoint script exists...
docker-compose run --rm backend /bin/bash -c "ls -la /god_bless_django/docker-entrypoint-sqlite.sh"

echo.
echo Step 4: Testing script content...
docker-compose run --rm backend /bin/bash -c "head -5 /god_bless_django/docker-entrypoint-sqlite.sh"

echo.
echo Step 5: Testing script execution...
docker-compose run --rm backend /bin/bash -c "bash -n /god_bless_django/docker-entrypoint-sqlite.sh && echo 'Script syntax is valid'"

echo.
echo === Debug Complete ===
echo.
echo If all tests pass, try running:
echo docker-compose up
echo.
pause
