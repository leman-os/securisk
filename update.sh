#!/bin/bash

# Остановка при ошибке
set -e
GREEN='\033[0;32m'
NC='\033[0m'

PROJECT_DIR="/opt/projects/securisk"

echo -e "${GREEN}=== SecuRisk Update Tool ===${NC}"

if [ "$EUID" -ne 0 ]; then 
  echo "Пожалуйста, запустите через sudo!"
  exit
fi

# 1. Обновляем код из Git
echo -e "${GREEN}📥 Получаем обновления из Git...${NC}"
cd $PROJECT_DIR
git pull

# 2. Обновляем Backend
echo -e "${GREEN}🐍 Обновляем Backend...${NC}"
cd $PROJECT_DIR/backend
source .venv/bin/activate
pip install -r requirements.txt
# На всякий случай держим правильную версию bcrypt
pip install "bcrypt==3.2.2"

# 3. Обновляем Frontend
echo -e "${GREEN}⚛️ Пересобираем Frontend...${NC}"
cd $PROJECT_DIR/frontend
yarn install --frozen-lockfile
yarn build

# 4. Исправляем права (на случай новых файлов)
echo -e "${GREEN}🔒 Корректировка прав доступа...${NC}"
chmod -R 750 $PROJECT_DIR/frontend/build
# Владелец должен быть тот же, что и у папки (предполагаем $SUDO_USER)
REAL_USER=${SUDO_USER:-$USER}
chown -R $REAL_USER:$REAL_USER $PROJECT_DIR/frontend/build

# 5. Перезапуск сервисов
echo -e "${GREEN}🔄 Перезапуск сервисов...${NC}"
supervisorctl restart securisk-backend
systemctl reload nginx

echo -e "${GREEN}✅ Обновление завершено!${NC}"
