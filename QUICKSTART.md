# 🚀 SecuRisk - Быстрый старт с Docker

## Развертывание в 3 команды

### 1. Клонируйте проект
```bash
git clone <your-repo-url> securisk
cd securisk
```

### 2. Запустите автоматический скрипт
```bash
./quick-start.sh
```

### 3. Откройте браузер
- **Приложение:** http://localhost
- **API Документация:** http://localhost/docs

**Учетные данные:**
- Username: `admin`
- Password: `admin123`

⚠️ **ВАЖНО:** Сразу измените пароль администратора после первого входа!

---

## Требования

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM
- 10GB свободного места

### Установка Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

**CentOS/RHEL:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

---

## Ручное развертывание

Если скрипт не работает, выполните команды вручную:

### Шаг 1: Создайте .env файл
```bash
cp .env.example .env

# Сгенерируйте SECRET_KEY
openssl rand -hex 32

# Отредактируйте .env и вставьте SECRET_KEY
nano .env
```

### Шаг 2: Сборка и запуск
```bash
# Сборка образов
docker-compose build

# Запуск контейнеров
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### Шаг 3: Проверка работы
```bash
# Проверка frontend
curl http://localhost

# Проверка backend
curl http://localhost/docs
```

---

## Управление

### Основные команды
```bash
# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose stop

# Запуск
docker-compose start

# Перезапуск
docker-compose restart

# Остановка и удаление (данные сохраняются)
docker-compose down

# Остановка и удаление всех данных (ОСТОРОЖНО!)
docker-compose down -v
```

### Логи конкретного сервиса
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
docker-compose logs nginx
```

---

## Резервное копирование

### Backup базы данных
```bash
# Создание backup
docker exec securisk-mongodb mongodump --db securisk_db --archive=/tmp/backup.archive

# Копирование на хост
docker cp securisk-mongodb:/tmp/backup.archive ./backup_$(date +%Y%m%d).archive
```

### Restore базы данных
```bash
# Копирование в контейнер
docker cp ./backup.archive securisk-mongodb:/tmp/

# Восстановление
docker exec securisk-mongodb mongorestore --db securisk_db --archive=/tmp/backup.archive
```

---

## Решение проблем

### Контейнеры не запускаются
```bash
# Проверьте логи
docker-compose logs

# Проверьте, не заняты ли порты
sudo netstat -tulpn | grep -E ':80|:443|:3000|:8001|:27017'

# Остановите конфликтующие сервисы
sudo systemctl stop nginx
sudo systemctl stop apache2

# Перезапустите Docker
sudo systemctl restart docker
docker-compose up -d
```

### Ошибка 502 Bad Gateway
```bash
# Проверьте статус всех контейнеров
docker-compose ps

# Проверьте логи
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Перезапустите все сервисы
docker-compose restart
```

### Backend не подключается к MongoDB
```bash
# Проверьте статус MongoDB
docker-compose ps mongodb

# Проверьте логи MongoDB
docker-compose logs mongodb

# Перезапустите MongoDB и backend
docker-compose restart mongodb backend
```

### Нехватка места на диске
```bash
# Проверьте использование
docker system df

# Очистка неиспользуемых данных
docker system prune -a

# Осторожно: удаление volumes (удалит данные!)
docker volume prune
```

---

## Обновление

```bash
# 1. Остановка контейнеров
docker-compose down

# 2. Backup базы данных (важно!)
docker exec securisk-mongodb mongodump --db securisk_db --archive=/tmp/backup.archive
docker cp securisk-mongodb:/tmp/backup.archive ./backup_before_update.archive

# 3. Обновление кода
git pull origin main

# 4. Пересборка образов
docker-compose build --no-cache

# 5. Запуск обновленной версии
docker-compose up -d

# 6. Проверка логов
docker-compose logs -f
```

---

## Production настройка

### 1. Измените .env файл
```bash
SECRET_KEY=<сильный_случайный_ключ_32_символа>
ENVIRONMENT=production
DEBUG=false
```

### 2. Настройте HTTPS (рекомендуется)
См. подробную инструкцию в `DOCKER_DEPLOY.md`

### 3. Настройте автозапуск
```bash
# Docker автоматически запускается при загрузке
sudo systemctl enable docker

# Контейнеры автоматически запускаются (уже настроено через restart: always)
```

### 4. Настройте автоматический backup
```bash
# Создайте скрипт /opt/backup-securisk.sh
sudo nano /opt/backup-securisk.sh

# Добавьте в crontab (ежедневно в 2:00)
crontab -e
0 2 * * * /opt/backup-securisk.sh >> /var/log/securisk-backup.log 2>&1
```

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                       Пользователь                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Nginx Container (Port 80/443)                   │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               │                      │
        ┌──────▼───────┐      ┌──────▼───────┐
        │   Frontend   │      │   Backend    │
        │  Container   │      │  Container   │
        │  (Port 3000) │      │  (Port 8001) │
        └──────────────┘      └──────┬───────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │   MongoDB   │
                              │  Container  │
                              │ (Port 27017)│
                              └─────────────┘
```

---

## Что включено

✅ **Backend (FastAPI)** - REST API сервер  
✅ **Frontend (React)** - Веб-интерфейс  
✅ **MongoDB** - База данных  
✅ **Nginx** - Reverse proxy  
✅ Автоматическая настройка сети  
✅ Healthcheck для всех сервисов  
✅ Persistent volumes для данных  
✅ Логирование  
✅ Автоперезапуск при сбоях  

---

## Порты

- **80** - HTTP (Nginx)
- **443** - HTTPS (Nginx, если настроен SSL)
- **3000** - Frontend (внутренний)
- **8001** - Backend API (внутренний)
- **27017** - MongoDB (внутренний)

⚠️ Внешне доступен только порт 80 (и 443 для HTTPS). Остальные порты доступны только внутри Docker сети.

---

## Дополнительная документация

- **README.md** - Полная документация системы
- **DOCKER_DEPLOY.md** - Подробные инструкции по Docker
- **API Docs** - http://localhost/docs (после запуска)

---

## Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Прочитайте раздел "Решение проблем" выше
4. См. подробную документацию в `DOCKER_DEPLOY.md`

---

**SecuRisk** - Ваша безопасность под контролем! 🔒🐳
