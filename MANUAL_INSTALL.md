# 📦 Ручная установка SecuRisk на Ubuntu

Полная пошаговая инструкция для установки SecuRisk **БЕЗ Docker**.

---

## ✅ Требования

- **ОС:** Ubuntu 20.04+ / Debian 11+
- **Python:** 3.11+
- **Node.js:** 18.x+
- **MongoDB:** 4.4+
- **Nginx:** 1.18+
- **RAM:** 4 GB
- **Диск:** 20 GB

---

## 🚀 Установка

### Шаг 1: Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### Шаг 2: Установка Python 3.11

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip

# Проверка
python3.11 --version
```

### Шаг 3: Установка Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установка Yarn
npm install -g yarn

# Проверка
node --version
yarn --version
```

### Шаг 4: Установка MongoDB

```bash
# Импорт ключа
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# Добавление репозитория
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Установка
sudo apt update
sudo apt install -y mongodb-org

# Запуск и автозапуск
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверка
sudo systemctl status mongod
```

### Шаг 5: Установка Nginx и Supervisor

```bash
sudo apt install -y nginx supervisor

# Запуск и автозапуск
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl start supervisor
sudo systemctl enable supervisor
```

### Шаг 6: Создание пользователя MongoDB

```bash
mongosh <<EOF
use securisk_db
db.createUser({
  user: "admin",
  pwd: "admin123",
  roles: []
})
db.users.insertOne({
  id: "admin-001",
  username: "admin",
  password_hash: "\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lkjVqKT8RnSm",
  full_name: "Administrator",
  email: "admin@securisk.local",
  role: "Администратор",
  created_at: new Date()
})
exit
EOF
```

**Пароль по умолчанию:** admin123

### Шаг 7: Клонирование проекта

```bash
sudo mkdir -p /opt/securisk
sudo chown $USER:$USER /opt/securisk
cd /opt/securisk

# Клонирование из Git
git clone <URL_РЕПОЗИТОРИЯ> .

# Или распаковка архива
# tar -xzvf securisk.tar.gz -C /opt/securisk
```

### Шаг 8: Настройка Backend

```bash
cd /opt/securisk/backend

# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install --upgrade pip
pip install -r requirements.txt

# Создание .env
cat > .env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=securisk_db
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ENVIRONMENT=production
DEBUG=false
EOF

# Проверка
python -c "from motor.motor_asyncio import AsyncIOMotorClient; print('OK')"
```

### Шаг 9: Настройка Frontend

```bash
cd /opt/securisk/frontend

# Установка зависимостей
yarn install

# Создание .env
cat > .env <<EOF
REACT_APP_BACKEND_URL=/api
EOF

# Сборка production версии
yarn build
```

**ВАЖНО:** Сборка обязательна! Без `yarn build` фронтенд не будет работать.

### Шаг 10: Настройка Supervisor для Backend

```bash
sudo tee /etc/supervisor/conf.d/securisk-backend.conf > /dev/null <<EOF
[program:securisk-backend]
command=/opt/securisk/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/opt/securisk/backend
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/securisk-backend.log
stderr_logfile=/var/log/supervisor/securisk-backend-error.log
environment=PATH="/opt/securisk/backend/venv/bin"
EOF

# Обновление конфигурации
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start securisk-backend

# Проверка
sudo supervisorctl status securisk-backend
```

### Шаг 11: Настройка Nginx

```bash
sudo tee /etc/nginx/sites-available/securisk > /dev/null <<'EOF'
upstream backend {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    # Backend API
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # API Docs
    location /docs {
        proxy_pass http://backend/docs;
        proxy_set_header Host $host;
    }

    location /redoc {
        proxy_pass http://backend/redoc;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://backend/openapi.json;
        proxy_set_header Host $host;
    }

    # Frontend (production build)
    location / {
        root /opt/securisk/frontend/build;
        index index.html index.htm;
        try_files $uri /index.html;
    }

    # Статические файлы с кэшированием
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /opt/securisk/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Активация конфигурации
sudo ln -sf /etc/nginx/sites-available/securisk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка и перезапуск
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 12: Настройка Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Проверка
sudo ufw status
```

### Шаг 13: Проверка работы

```bash
# Проверка сервисов
sudo systemctl status mongod
sudo systemctl status nginx
sudo supervisorctl status

# Проверка логов backend
sudo tail -f /var/log/supervisor/securisk-backend.log

# Проверка логов Nginx
sudo tail -f /var/log/nginx/error.log

# Тест через curl
curl http://localhost
curl http://localhost/api/docs
```

### Шаг 14: Открытие в браузере

```
http://ваш-IP-адрес
или
http://localhost
```

**Учетные данные:**
- Username: `admin`
- Password: `admin123`

⚠️ **ВАЖНО:** Сразу измените пароль!

---

## 🔄 Управление сервисами

### Backend

```bash
# Статус
sudo supervisorctl status securisk-backend

# Перезапуск
sudo supervisorctl restart securisk-backend

# Остановка
sudo supervisorctl stop securisk-backend

# Запуск
sudo supervisorctl start securisk-backend

# Логи
sudo supervisorctl tail -f securisk-backend
```

### Nginx

```bash
# Перезапуск
sudo systemctl reload nginx

# Остановка
sudo systemctl stop nginx

# Запуск
sudo systemctl start nginx

# Проверка конфигурации
sudo nginx -t
```

### MongoDB

```bash
# Статус
sudo systemctl status mongod

# Перезапуск
sudo systemctl restart mongod

# Логи
sudo tail -f /var/log/mongodb/mongod.log
```

---

## 🔧 Обновление без потери данных

### 1. Резервное копирование

```bash
# Backup MongoDB
mongodump --db securisk_db --out /backup/securisk_$(date +%Y%m%d)

# Backup файлов
tar -czf /backup/securisk_files_$(date +%Y%m%d).tar.gz /opt/securisk
```

### 2. Остановка сервисов

```bash
sudo supervisorctl stop securisk-backend
```

### 3. Обновление кода

```bash
cd /opt/securisk
git pull origin main
```

### 4. Обновление зависимостей

```bash
# Backend
cd /opt/securisk/backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Frontend
cd /opt/securisk/frontend
yarn install
yarn build
```

### 5. Перезапуск

```bash
sudo supervisorctl start securisk-backend
sudo systemctl reload nginx
```

### 6. Проверка

```bash
sudo supervisorctl status
curl http://localhost
```

---

## 🐛 Решение проблем

### Backend не запускается

```bash
# Проверьте логи
sudo supervisorctl tail -100 securisk-backend stderr

# Проверьте MongoDB
sudo systemctl status mongod
mongosh --eval "db.version()"

# Проверьте .env
cat /opt/securisk/backend/.env

# Переустановите зависимости
cd /opt/securisk/backend
source venv/bin/activate
pip install -r requirements.txt --force-reinstall

# Перезапустите
sudo supervisorctl restart securisk-backend
```

### Frontend не отображается

```bash
# Проверьте сборку
ls -la /opt/securisk/frontend/build/

# Если build/ нет - соберите
cd /opt/securisk/frontend
yarn build

# Проверьте Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Перезапустите Nginx
sudo systemctl reload nginx
```

### Не можете войти (admin/admin123)

```bash
# Проверьте пользователя в MongoDB
mongosh securisk_db --eval "db.users.find({username: 'admin'})"

# Если пользователя нет - создайте
mongosh securisk_db <<EOF
db.users.insertOne({
  id: "admin-001",
  username: "admin",
  password_hash: "\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lkjVqKT8RnSm",
  full_name: "Administrator",
  email: "admin@securisk.local",
  role: "Администратор",
  created_at: new Date()
})
EOF
```

### Ошибка 502 Bad Gateway

```bash
# Проверьте backend
sudo supervisorctl status securisk-backend
sudo supervisorctl restart securisk-backend

# Проверьте, что порт 8001 слушается
sudo netstat -tulpn | grep 8001

# Проверьте логи
sudo tail -f /var/log/nginx/error.log
sudo supervisorctl tail -f securisk-backend
```

---

## 📊 Мониторинг

```bash
# Использование ресурсов
top
htop

# Диск
df -h
du -sh /opt/securisk/*

# Память
free -m

# Логи
sudo journalctl -u mongod -f
sudo supervisorctl tail -f securisk-backend
sudo tail -f /var/log/nginx/access.log
```

---

## ✅ Чек-лист установки

- [ ] Python 3.11 установлен
- [ ] Node.js 18 установлен
- [ ] MongoDB запущена
- [ ] Nginx запущен
- [ ] Supervisor установлен
- [ ] Проект клонирован в /opt/securisk
- [ ] Backend .env создан
- [ ] Backend зависимости установлены
- [ ] Frontend .env создан (REACT_APP_BACKEND_URL=/api)
- [ ] Frontend собран (yarn build)
- [ ] Supervisor конфигурация создана
- [ ] Backend запущен через supervisor
- [ ] Nginx конфигурация создана
- [ ] Nginx перезапущен
- [ ] MongoDB пользователь admin создан
- [ ] Firewall настроен
- [ ] http://localhost открывается
- [ ] Вход admin/admin123 работает
- [ ] Пароль изменен

---

**SecuRisk готов к работе!** 🎉
