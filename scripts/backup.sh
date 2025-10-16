#!/bin/bash

# SecuRisk Backup Script
# Автоматическое резервное копирование MongoDB

set -e

BACKUP_DIR="${BACKUP_DIR:-./backup}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="securisk_backup_${DATE}"
RETENTION_DAYS=${RETENTION_DAYS:-30}

echo "==========================================="
echo "  SecuRisk Backup - $(date)"
echo "==========================================="
echo ""

# Создание директории для backup
mkdir -p ${BACKUP_DIR}

echo "📁 Директория backup: ${BACKUP_DIR}"
echo "📅 Хранить backup: ${RETENTION_DAYS} дней"
echo ""

# Проверка, что MongoDB контейнер запущен
if ! docker ps | grep -q securisk-mongodb; then
    echo "❌ Ошибка: MongoDB контейнер не запущен!"
    echo "Запустите: docker-compose up -d mongodb"
    exit 1
fi

echo "💾 Создание backup MongoDB..."
docker exec securisk-mongodb mongodump \
    --db securisk_db \
    --archive=/tmp/backup.archive \
    --gzip

if [ $? -eq 0 ]; then
    echo "✅ Backup MongoDB создан успешно"
else
    echo "❌ Ошибка при создании backup MongoDB"
    exit 1
fi

# Копирование backup из контейнера
echo "📦 Копирование backup на хост..."
docker cp securisk-mongodb:/tmp/backup.archive ${BACKUP_DIR}/${BACKUP_NAME}.archive

if [ $? -eq 0 ]; then
    echo "✅ Backup скопирован: ${BACKUP_DIR}/${BACKUP_NAME}.archive"
else
    echo "❌ Ошибка при копировании backup"
    exit 1
fi

# Размер backup
BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_NAME}.archive | cut -f1)
echo "📊 Размер backup: ${BACKUP_SIZE}"

# Удаление старых backup
echo ""
echo "🧹 Удаление backup старше ${RETENTION_DAYS} дней..."
find ${BACKUP_DIR} -name "securisk_backup_*.archive" -mtime +${RETENTION_DAYS} -delete

# Список backup
echo ""
echo "📚 Доступные backup:"
ls -lh ${BACKUP_DIR}/securisk_backup_*.archive 2>/dev/null || echo "Нет backup файлов"

echo ""
echo "==========================================="
echo "  ✅ Backup завершен успешно!"
echo "==========================================="
echo ""
echo "Файл backup: ${BACKUP_DIR}/${BACKUP_NAME}.archive"
echo "Размер: ${BACKUP_SIZE}"
echo ""
echo "Для восстановления используйте:"
echo "  ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.archive"
echo ""
