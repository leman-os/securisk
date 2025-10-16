#!/bin/bash

# SecuRisk Quick Start Script
# Быстрый запуск SecuRisk в Docker

set -e

echo "=========================================="
echo "  SecuRisk Docker Quick Start"
echo "=========================================="
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo ""
    echo "Установите Docker:"
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
    echo "  Или следуйте инструкциям: https://docs.docker.com/engine/install/"
    exit 1
fi

# Проверка Docker Compose
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    echo ""
    echo "Установите Docker Compose:"
    echo "  https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker установлен"
echo "✅ Docker Compose установлен"
echo ""

# Проверка файла .env
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден. Создаю из .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        
        # Генерация случайного SECRET_KEY
        if command -v openssl &> /dev/null; then
            SECRET_KEY=$(openssl rand -hex 32)
            sed -i "s/change-this-secret-key-in-production-min-32-chars-long/$SECRET_KEY/" .env
            echo "✅ Сгенерирован SECRET_KEY"
        else
            echo "⚠️  openssl не найден. Используется SECRET_KEY по умолчанию."
            echo "   ВАЖНО: Измените SECRET_KEY в файле .env перед использованием в production!"
        fi
        
        echo "✅ Создан файл .env"
    else
        echo "❌ Файл .env.example не найден!"
        exit 1
    fi
fi

echo ""
echo "Файл .env настроен:"
cat .env | grep -v "^#" | grep -v "^$"
echo ""

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
echo ""

# Сборка образов
echo "🔨 Сборка Docker образов (это может занять 5-10 минут при первом запуске)..."
if docker compose version &> /dev/null; then
    docker compose build
else
    docker-compose build
fi
echo ""

# Запуск контейнеров
echo "🚀 Запуск контейнеров..."
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi
echo ""

# Ожидание запуска
echo "⏳ Ожидание запуска сервисов (30 секунд)..."
sleep 30
echo ""

# Проверка статуса
echo "📊 Статус контейнеров:"
if docker compose version &> /dev/null; then
    docker compose ps
else
    docker-compose ps
fi
echo ""

# Проверка доступности
echo "🔍 Проверка доступности сервисов..."

if curl -s http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend доступен: http://localhost"
else
    echo "⚠️  Frontend не доступен. Проверьте логи: docker-compose logs frontend"
fi

if curl -s http://localhost/docs > /dev/null 2>&1; then
    echo "✅ Backend API доступен: http://localhost/docs"
else
    echo "⚠️  Backend не доступен. Проверьте логи: docker-compose logs backend"
fi

echo ""
echo "=========================================="
echo "  🎉 SecuRisk запущен!"
echo "=========================================="
echo ""
echo "📍 Доступ к приложению:"
echo "   Приложение:    http://localhost"
echo "   API Docs:      http://localhost/docs"
echo ""
echo "🔐 Учетные данные по умолчанию:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⚠️  ВАЖНО: Сразу измените пароль администратора!"
echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов:       docker-compose logs -f"
echo "   Остановка:            docker-compose stop"
echo "   Запуск:               docker-compose start"
echo "   Перезапуск:           docker-compose restart"
echo "   Остановка и удаление: docker-compose down"
echo ""
echo "📚 Подробная документация:"
echo "   - README.md           - Полная документация"
echo "   - DOCKER_DEPLOY.md    - Инструкции по Docker"
echo ""
echo "Для просмотра логов в реальном времени:"
echo "   docker-compose logs -f"
echo ""
