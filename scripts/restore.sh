#!/bin/bash
set -e

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
BACKUP_DIR="$PROJECT_ROOT/backups"

if [ -z "$1" ]; then
    echo "Использование: sudo ./scripts/restore.sh <дата_бэкапа>"
    exit 1
fi

echo "⚠️ Восстановление системы из $1..."

# Остановка бэкенда
sudo supervisorctl stop securisk-backend || true

# Восстановление БД
MONGO_URL=$(grep MONGO_URL "$PROJECT_ROOT/backend/.env" | cut -d '=' -f2)
mongorestore --uri="$MONGO_URL" --archive="$BACKUP_DIR/db_$1.archive" --gzip --drop

# Восстановление файлов
cd "$PROJECT_ROOT"
tar -xzf "$BACKUP_DIR/files_$1.tar.gz"

# Авто-запуск обновления для пересборки статики
echo "⚙️ Запуск пересборки системы..."
./update.sh

echo "✅ Система восстановлена!"