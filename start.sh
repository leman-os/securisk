#!/bin/bash

# Простой скрипт запуска SecuRisk

echo "=========================================="
echo "  SecuRisk Docker - Запуск"
echo "=========================================="
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

echo "✅ Docker установлен"
echo ""

# Создание .env если не существует
if [ ! -f ".env" ]; then
    echo "📝 Создание файла .env..."
    cat > .env <<'EOF'
# MongoDB Configuration
MONGO_URL=mongodb://mongodb:27017
DB_NAME=securisk_db

# Security
SECRET_KEY=a8f5f167f44f4964e6c998dee827110c3a2e7e5e3b6d8f1a9e3d5c7b4a2f1e8d
ALGORITHM=HS256

# Application Settings
ENVIRONMENT=production
DEBUG=false

# Frontend
REACT_APP_BACKEND_URL=http://localhost/api
EOF
    echo "✅ Файл .env создан"
fi

echo ""
echo "🔨 Сборка Docker образов..."
docker compose build || docker-compose build

echo ""
echo "🚀 Запуск контейнеров..."
docker compose up -d || docker-compose up -d

echo ""
echo "⏳ Ожидание запуска (30 секунд)..."
sleep 30

echo ""
echo "📊 Статус контейнеров:"
docker compose ps || docker-compose ps

echo ""
echo "=========================================="
echo "  🎉 SecuRisk готов!"
echo "=========================================="
echo ""
echo "📍 Откройте в браузере:"
echo "   http://localhost"
echo ""
echo "🔐 Логин: admin"
echo "    Пароль: admin123"
echo ""
echo "📝 Просмотр логов:"
echo "   docker-compose logs -f"
echo ""
