#!/bin/bash

# Остановить скрипт при любой ошибке
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# === АВТООПРЕДЕЛЕНИЕ ПУТЕЙ ===
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${GREEN}=== Установка SecuRisk (v2.4 Final) ===${NC}"
echo -e "Папка проекта: ${PROJECT_ROOT}"

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Запустите скрипт через sudo!${NC}"
  exit 1
fi

# Определение реального пользователя (кто владелец папки)
REAL_USER=${SUDO_USER:-$USER}
REAL_GROUP=$(id -gn $REAL_USER)

# 1. Запрос паролей
read -p "Введите пароль для базы данных MongoDB: " DB_PASSWORD
read -p "Введите пароль для Админа системы: " ADMIN_PASSWORD

# 2. Установка системных пакетов
echo -e "${GREEN}[1/7] Установка системных пакетов...${NC}"
apt update -qq
apt install -y software-properties-common curl gnupg git build-essential nginx supervisor
if ! apt-cache policy python3.12 | grep -q "ppa:deadsnakes"; then
    add-apt-repository ppa:deadsnakes/ppa -y
    apt update -qq
fi
apt install -y python3.12 python3.12-venv python3.12-dev

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    corepack enable
fi

# 3. Настройка MongoDB
echo -e "${GREEN}[2/7] Настройка Базы Данных...${NC}"
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg --yes
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update -qq
    apt install -y mongodb-org
fi

systemctl enable mongod
systemctl start mongod

echo -e "${YELLOW}Очистка конфига и настройка прав доступа к БД...${NC}"
sed -i '/^security:/d' /etc/mongod.conf
sed -i '/authorization:/d' /etc/mongod.conf
systemctl restart mongod

# Ожидание старта базы
for i in {1..15}; do
    if mongosh --eval "db.adminCommand('ping')" --quiet &>/dev/null; then break; fi
    echo -n "." && sleep 1
done

mongosh <<EOF
use securisk_db
try {
    db.createUser({ user: "securisk_user", pwd: "$DB_PASSWORD", roles: [{ role: "readWrite", db: "securisk_db" }] })
} catch (e) {
    db.changeUserPassword("securisk_user", "$DB_PASSWORD")
}
EOF

echo -e "\nsecurity:\n  authorization: enabled" >> /etc/mongod.conf
systemctl restart mongod

# 4. Настройка Backend
echo -e "${GREEN}[3/7] Настройка Backend...${NC}"
cd "$BACKEND_DIR"
[ ! -d ".venv" ] && python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install motor python-dotenv "bcrypt==3.2.2"

cat > .env <<EOF
MONGO_URL=mongodb://securisk_user:$DB_PASSWORD@localhost:27017/securisk_db?authSource=securisk_db
DB_NAME=securisk_db
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=production
DEBUG=false
EOF

# Скрипт создания админа
cat > create_init_admin.py <<EOF
import asyncio, os, uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init():
    load_dotenv()
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=5000)
    db = client[os.getenv("DB_NAME")]
    users = db["users"]
    pw_hash = pwd_context.hash("$ADMIN_PASSWORD")
    user_data = {
        "id": str(uuid.uuid4()), "username": "admin", "email": "admin@example.com",
        "password": pw_hash, "password_hash": pw_hash, "full_name": "System Administrator",
        "role": "Администратор", "created_at": datetime.utcnow(), "is_active": True
    }
    await users.update_one({"username": "admin"}, {"\$set": user_data}, upsert=True)
    print("Admin OK")

if __name__ == "__main__":
    asyncio.run(init())
EOF

python create_init_admin.py && rm create_init_admin.py

# 5. Настройка Frontend
echo -e "${GREEN}[4/7] Сборка Frontend...${NC}"
cd "$FRONTEND_DIR"
yarn install
echo "REACT_APP_BACKEND_URL=" > .env
yarn build

# 6. !!! ИСПРАВЛЕНИЕ ПРАВ ДОСТУПА ДЛЯ NGINX !!!
echo -e "${GREEN}[5/7] Исправление прав доступа для Nginx...${NC}"
usermod -aG $REAL_GROUP www-data

# Открываем доступ на чтение по всей цепочке путей
# Скрипт проходит от корня до папки проекта
temp_path=""
IFS='/' read -ra ADDR <<< "$PROJECT_ROOT"
for i in "${ADDR[@]}"; do
    if [ -n "$i" ]; then
        temp_path="$temp_path/$i"
        chmod 755 "$temp_path"
    fi
done

# Рекурсивно открываем билд для Nginx
chmod -R 755 "$FRONTEND_DIR/build"

# 7. Настройка Supervisor и Nginx
echo -e "${GREEN}[6/7] Настройка сервисов...${NC}"
cat > /etc/supervisor/conf.d/securisk-backend.conf <<EOF
[program:securisk-backend]
command=$BACKEND_DIR/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
directory=$BACKEND_DIR
user=$REAL_USER
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/securisk-backend.out.log
stderr_logfile=/var/log/supervisor/securisk-backend.err.log
environment=LANG=en_US.UTF-8,LC_ALL=en_US.UTF-8,PATH="$BACKEND_DIR/.venv/bin"
EOF

supervisorctl reread && supervisorctl update && supervisorctl restart securisk-backend

cat > /etc/nginx/sites-available/securisk <<EOF
server {
    listen 80;
    server_name _;
    root $FRONTEND_DIR/build;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/securisk /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Финал
IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ ГОТОВО! Адрес: http://$IP${NC}"
echo -e "Логин: admin / Пароль: $ADMIN_PASSWORD"
