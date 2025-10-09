@echo off
echo Switching to SQLite database...

REM Copy SQLite environment file
copy .env.sqlite .env.local

REM Stop containers
docker-compose down

echo SQLite environment configured. Run 'docker-compose up -d' to start with SQLite.
echo Your SQLite database file: db.sqlite3