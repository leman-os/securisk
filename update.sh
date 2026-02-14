#!/bin/bash

# Остановить скрипт при любой ошибке
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Автоопределение путей
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${GREEN}=== Перезапуск и обновление сервисов SecuRisk ===${NC}"

# 1. Обновление Backend
echo -e "${GREEN}🐍 Обновление Backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Виртуальное окружение не найдено. Создаю...${NC}"
    python3.12 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
# Фикс для корректной работы passlib
pip install "bcrypt==3.2.2" --quiet

# 2. Обновление Frontend
echo -e "${GREEN}⚛️ Пересборка Frontend (React)...${NC}"
cd "$FRONTEND_DIR"

# Если папки с зависимостями нет, устанавливаем их
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules не найдены. Устанавливаю зависимости (это может занять время)...${NC}"
    yarn install --silent
fi

# Сборка статики
yarn build --silent

# 3. Настройка прав (чтобы Nginx видел новые файлы)
chmod -R 755 "$FRONTEND_DIR/build"

# 4. Перезапуск процессов
echo -e "${GREEN}🔄 Перезапуск Supervisor и Nginx...${NC}"
sudo supervisorctl restart securisk-backend
sudo systemctl reload nginx

echo -e "${GREEN}✅ Изменения применены и сервисы перезапущены!${NC}"
