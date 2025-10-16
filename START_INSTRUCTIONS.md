# 🚀 Инструкция по запуску SecuRisk

## Быстрый запуск

### Вариант 1: Использовать готовые файлы из /app

```bash
# Скопируйте все необходимые файлы из /app в вашу директорию
cp /app/.env ~/securisk/
cp /app/start.sh ~/securisk/
cp /app/.env.example ~/securisk/

# Перейдите в директорию проекта
cd ~/securisk

# Запустите
./start.sh
```

### Вариант 2: Создать .env вручную

```bash
# Перейдите в директорию проекта
cd ~/securisk

# Создайте файл .env
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

# Запустите Docker Compose
docker compose build
docker compose up -d

# Подождите 30 секунд
sleep 30

# Проверьте статус
docker compose ps

# Откройте в браузере: http://localhost
```

### Вариант 3: Используйте готовый скрипт

```bash
cd ~/securisk

# Скопируйте start.sh
cp /app/start.sh .
chmod +x start.sh

# Запустите
./start.sh
```

## Проверка работы

После запуска откройте в браузере:
- **Приложение:** http://localhost
- **API Docs:** http://localhost/docs

**Учетные данные:**
- Username: `admin`
- Password: `admin123`

## Полезные команды

```bash
# Просмотр логов
docker compose logs -f

# Остановка
docker compose stop

# Перезапуск
docker compose restart

# Полная остановка
docker compose down
```

## Если возникли проблемы

```bash
# Проверьте статус контейнеров
docker compose ps

# Проверьте логи
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb

# Перезапустите все
docker compose restart
```
