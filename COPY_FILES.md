# ⚠️ ВАЖНО: Инструкция по копированию файлов

## Проблема
Вы запускаете из директории `~/secur`, но файлы проекта находятся в `/app`.

## Решение

### Вариант 1: Скопировать все файлы из /app

```bash
# Удалите старую директорию (если есть)
rm -rf ~/secur

# Скопируйте весь проект
cp -r /app ~/secur

# Перейдите в директорию
cd ~/secur

# Запустите
sudo ./start.sh
```

### Вариант 2: Работать напрямую из /app

```bash
# Перейдите в /app
cd /app

# Запустите напрямую
sudo docker-compose build
sudo docker-compose up -d

# Проверьте статус
sudo docker-compose ps

# Откройте http://localhost в браузере
```

### Вариант 3: Использовать Makefile (самый простой)

```bash
cd /app

# Установка и запуск одной командой
sudo make install

# Или по шагам:
sudo make build
sudo make up

# Просмотр статуса
sudo make status

# Просмотр логов
sudo make logs
```

---

## Проверка после запуска

```bash
# Проверьте, что все контейнеры запущены
sudo docker-compose ps

# Должны быть 4 контейнера: mongodb, backend, frontend, nginx

# Если frontend не запустился, проверьте логи:
sudo docker-compose logs frontend

# Перезапустите если нужно:
sudo docker-compose restart
```

---

## Если проблема с yarn.lock

Dockerfile уже обновлен для использования npm вместо yarn.

Попробуйте пересобрать:

```bash
cd /app

# Очистите предыдущие образы
sudo docker-compose down
sudo docker system prune -f

# Пересоберите с нуля
sudo docker-compose build --no-cache

# Запустите
sudo docker-compose up -d
```

---

## Быстрое решение (рекомендуется)

```bash
# 1. Перейдите в /app
cd /app

# 2. Запустите через Makefile
sudo make install

# Готово! Откройте http://localhost
```

---

## Альтернатива: Скопировать только необходимые файлы

Если хотите работать из ~/secur:

```bash
# Создайте структуру
mkdir -p ~/secur/{backend,frontend,nginx/conf.d,scripts}

# Скопируйте файлы
cp /app/docker-compose.yml ~/secur/
cp /app/.env ~/secur/
cp /app/.env.example ~/secur/
cp /app/start.sh ~/secur/
cp /app/Makefile ~/secur/

# Backend
cp /app/backend/Dockerfile ~/secur/backend/
cp /app/backend/requirements.txt ~/secur/backend/
cp /app/backend/server.py ~/secur/backend/
cp /app/backend/.dockerignore ~/secur/backend/

# Frontend  
cp /app/frontend/Dockerfile ~/secur/frontend/
cp /app/frontend/package.json ~/secur/frontend/
cp -r /app/frontend/src ~/secur/frontend/
cp -r /app/frontend/public ~/secur/frontend/
cp /app/frontend/.dockerignore ~/secur/frontend/
# Другие конфиг файлы frontend
cp /app/frontend/craco.config.js ~/secur/frontend/ 2>/dev/null || true
cp /app/frontend/jsconfig.json ~/secur/frontend/ 2>/dev/null || true
cp /app/frontend/postcss.config.js ~/secur/frontend/ 2>/dev/null || true
cp /app/frontend/components.json ~/secur/frontend/ 2>/dev/null || true
cp /app/frontend/.env ~/secur/frontend/ 2>/dev/null || true

# Nginx
cp /app/nginx/nginx.conf ~/secur/nginx/
cp /app/nginx/conf.d/default.conf ~/secur/nginx/conf.d/

# Scripts
cp /app/scripts/*.sh ~/secur/scripts/

# Сделать скрипты исполняемыми
chmod +x ~/secur/start.sh
chmod +x ~/secur/scripts/*.sh

# Теперь запустите
cd ~/secur
sudo ./start.sh
```
