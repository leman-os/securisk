#!/bin/bash
set -e

# Обновляем .env если переданы переменные окружения
if [ -n "$MONGO_URL" ]; then
    echo "MONGO_URL=$MONGO_URL" > /app/backend/.env
    echo "DB_NAME=${DB_NAME:-securisk_db}" >> /app/backend/.env
    echo "SECRET_KEY=${SECRET_KEY:-$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -1)}" >> /app/backend/.env
    echo "ALGORITHM=HS256" >> /app/backend/.env
    echo "ACCESS_TOKEN_EXPIRE_MINUTES=1440" >> /app/backend/.env
    echo "ENVIRONMENT=production" >> /app/backend/.env
    echo "DEBUG=false" >> /app/backend/.env
    if [ -n "$LICENSE_SALT" ]; then
        echo "LICENSE_SALT=$LICENSE_SALT" >> /app/backend/.env
    fi
fi

# Исправляем nginx конфиг под контейнер
sed -i 's|root .*frontend/build;|root /app/frontend/build;|' /etc/nginx/conf.d/default.conf

# Запускаем supervisor (nginx + uvicorn)
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
