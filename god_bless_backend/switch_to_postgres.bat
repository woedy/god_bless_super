@echo off
echo Switching to PostgreSQL database...

REM Copy PostgreSQL environment file
copy .env.postgres .env.local

REM Stop containers
docker-compose down

echo PostgreSQL environment configured. Run 'docker-compose up -d' to start with PostgreSQL.
echo Remember to import your carrier data after first setup!