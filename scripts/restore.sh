#!/bin/bash

# SecuRisk Restore Script
# Восстановление MongoDB из backup

set -e

if [ -z "$1" ]; then
    echo "Использование: $0 <путь_к_backup_файлу>"
    echo ""
    echo "Пример:"
    echo "  $0 ./backup/securisk_backup_20250116_120000.archive"
    echo ""
    echo "Доступные backup:"
    ls -lh ./backup/securisk_backup_*.archive 2>/dev/null || echo "  Нет backup файлов"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Ошибка: Файл ${BACKUP_FILE} не найден!"
    exit 1
fi

echo "==========================================="
echo "  SecuRisk Restore - $(date)"
echo "==========================================="
echo ""
echo "📁 Backup файл: ${BACKUP_FILE}"
echo "📊 Размер: $(du -h ${BACKUP_FILE} | cut -f1)"
echo ""

# Проверка, что MongoDB контейнер запущен
if ! docker ps | grep -q securisk-mongodb; then
    echo "❌ Ошибка: MongoDB контейнер не запущен!"
    echo "Запустите: docker-compose up -d mongodb"
    exit 1
fi

# Подтверждение
read -p "⚠️  ВНИМАНИЕ: Это перезапишет текущую базу данных! Продолжить? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Отменено пользователем"
    exit 0
fi

echo ""
echo "💾 Создание backup текущей базы перед восстановлением..."
BACKUP_DIR="./backup"
mkdir -p ${BACKUP_DIR}
CURRENT_BACKUP="${BACKUP_DIR}/before_restore_$(date +%Y%m%d_%H%M%S).archive"

docker exec securisk-mongodb mongodump \
    --db securisk_db \
    --archive=/tmp/current_backup.archive \
    --gzip

docker cp securisk-mongodb:/tmp/current_backup.archive ${CURRENT_BACKUP}
echo "✅ Текущая база сохранена: ${CURRENT_BACKUP}"

echo ""
echo "📦 Копирование backup в контейнер..."
docker cp ${BACKUP_FILE} securisk-mongodb:/tmp/restore.archive

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при копировании backup в контейнер"
    exit 1
fi

echo "✅ Backup скопирован в контейнер"

echo ""
echo "🔄 Восстановление базы данных..."
docker exec securisk-mongodb mongorestore \
    --db securisk_db \
    --archive=/tmp/restore.archive \
    --gzip \
    --drop

if [ $? -eq 0 ]; then
    echo "✅ База данных успешно восстановлена!"
else
    echo "❌ Ошибка при восстановлении базы данных"
    echo ""
    echo "Вы можете вернуть предыдущую версию:"
    echo "  $0 ${CURRENT_BACKUP}"
    exit 1
fi

# Очистка временных файлов
echo ""
echo "🧹 Очистка временных файлов..."
docker exec securisk-mongodb rm -f /tmp/restore.archive /tmp/current_backup.archive

echo ""
echo "==========================================="
echo "  ✅ Восстановление завершено успешно!"
echo "==========================================="
echo ""
echo "База данных восстановлена из: ${BACKUP_FILE}"
echo "Backup текущей базы сохранен: ${CURRENT_BACKUP}"
echo ""
echo "Перезапустите сервисы:"
echo "  docker-compose restart"
echo ""
