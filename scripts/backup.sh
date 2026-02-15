#!/bin/bash
set -e

# Т.к. скрипт в scripts/, корень это на один уровень выше
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Читаем MONGO_URL из .env бэкенда
MONGO_URL=$(grep MONGO_URL "$PROJECT_ROOT/backend/.env" | cut -d '=' -f2)

echo "💾 Создание бэкапа ($DATE)..."

# Бэкап БД
mongodump --uri="$MONGO_URL" --archive="$BACKUP_DIR/db_$DATE.archive" --gzip

# Бэкап кода (без мусора)
cd "$PROJECT_ROOT"
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" \
    --exclude="./backend/.venv" \
    --exclude="./frontend/node_modules" \
    --exclude="./frontend/build" \
    --exclude="./backups" .

echo "✅ Бэкап готов в папке backups/"