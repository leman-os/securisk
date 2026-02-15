#!/bin/bash
set -e

# Определяем корень (т.к. скрипт в корне, PROJECT_ROOT это текущая папка)
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔄 Применение изменений SecuRisk..."

# 1. Backend: Просто перезапуск (код подхватится сам)
echo "🐍 Перезапуск Backend..."
sudo supervisorctl restart securisk-backend

# 2. Frontend: Пересборка обязательна для применения JS/JSX правок
echo "⚛️ Пересборка Frontend..."
cd "$PROJECT_ROOT/frontend"
yarn build --silent
chmod -R 755 build/

# 3. Nginx: Перезагрузка для обновления статики
echo "🌐 Обновление Nginx..."
sudo systemctl reload nginx

echo "✅ Все изменения применены!"