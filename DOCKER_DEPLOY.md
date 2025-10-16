# 🐳 Развертывание SecuRisk через Docker

## Быстрый старт

### Предварительные требования

- Docker 20.10+
- Docker Compose 2.0+
- Минимум 4GB RAM
- Минимум 10GB свободного места на диске

### Проверка установки Docker

```bash
# Проверка Docker
docker --version
# Должно быть: Docker version 20.10.0 или выше

# Проверка Docker Compose
docker-compose --version
# Должно быть: Docker Compose version 2.0.0 или выше
```

### Установка Docker (если не установлен)

#### Ubuntu/Debian

```bash
# Удаление старых версий
sudo apt-get remove docker docker-engine docker.io containerd runc

# Установка зависимостей
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Добавление официального GPG ключа Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавление репозитория
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Проверка установки
docker run hello-world
```

#### CentOS/RHEL

```bash
# Установка зависимостей
sudo yum install -y yum-utils

# Добавление репозитория
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Установка Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Запуск Docker
sudo systemctl start docker
sudo systemctl enable docker

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
```

---

## 🚀 Развертывание

### Шаг 1: Подготовка проекта

```bash
# Перейдите в директорию проекта
cd /path/to/securisk

# Убедитесь, что все файлы на месте
ls -la
# Должны быть: docker-compose.yml, backend/, frontend/, nginx/
```

### Шаг 2: Настройка переменных окружения (ВАЖНО!)

```bash
# Создайте .env файл из примера
cp .env.example .env

# Откройте файл для редактирования
nano .env

# ОБЯЗАТЕЛЬНО измените:
# 1. SECRET_KEY - используйте команду для генерации:
openssl rand -hex 32

# Пример .env файла:
# MONGO_URL=mongodb://mongodb:27017
# DB_NAME=securisk_db
# SECRET_KEY=ваш_сгенерированный_ключ_32_символа
# ALGORITHM=HS256
# ENVIRONMENT=production
# DEBUG=false
# REACT_APP_BACKEND_URL=http://localhost/api
```

### Шаг 3: Сборка и запуск контейнеров

```bash
# Сборка образов (первый раз займет 5-10 минут)
docker-compose build

# Запуск всех сервисов в фоновом режиме
docker-compose up -d

# Просмотр логов запуска
docker-compose logs -f

# Нажмите Ctrl+C для выхода из просмотра логов
```

### Шаг 4: Проверка работы

```bash
# Проверка статуса контейнеров
docker-compose ps

# Все контейнеры должны быть в статусе "Up" или "healthy"

# Проверка доступности
curl http://localhost
# Должна вернуться HTML страница

curl http://localhost/api/docs
# Должна открыться Swagger документация API
```

### Шаг 5: Первый вход

Откройте браузер и перейдите по адресу:
- **Приложение:** http://localhost
- **API Документация:** http://localhost/docs

**Учетные данные по умолчанию:**
- Username: `admin`
- Password: `admin123`

⚠️ **ВАЖНО:** Сразу после первого входа измените пароль администратора!

---

## 📊 Управление контейнерами

### Основные команды

```bash
# Просмотр статуса всех контейнеров
docker-compose ps

# Просмотр логов всех сервисов
docker-compose logs

# Просмотр логов конкретного сервиса
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
docker-compose logs nginx

# Следить за логами в реальном времени
docker-compose logs -f backend

# Остановка всех контейнеров
docker-compose stop

# Запуск остановленных контейнеров
docker-compose start

# Перезапуск всех контейнеров
docker-compose restart

# Перезапуск конкретного контейнера
docker-compose restart backend

# Остановка и удаление всех контейнеров
docker-compose down

# Остановка и удаление контейнеров + volumes (УДАЛИТ ВСЕ ДАННЫЕ!)
docker-compose down -v
```

### Обновление приложения

```bash
# 1. Остановка контейнеров
docker-compose down

# 2. Обновление кода (git pull или копирование новых файлов)
git pull origin main

# 3. Пересборка образов
docker-compose build --no-cache

# 4. Запуск обновленных контейнеров
docker-compose up -d

# 5. Проверка логов
docker-compose logs -f
```

---

## 🔍 Мониторинг и диагностика

### Проверка использования ресурсов

```bash
# Статистика контейнеров в реальном времени
docker stats

# Использование дискового пространства
docker system df

# Детальная информация о контейнере
docker inspect securisk-backend
```

### Подключение к контейнеру

```bash
# Подключение к backend контейнеру
docker exec -it securisk-backend /bin/sh

# Подключение к MongoDB
docker exec -it securisk-mongodb mongosh securisk_db

# Проверка логов Nginx
docker exec -it securisk-nginx cat /var/log/nginx/error.log
```

### Healthcheck контейнеров

```bash
# Проверка здоровья контейнеров
docker-compose ps

# Ручная проверка backend
curl http://localhost/api/docs

# Ручная проверка frontend
curl http://localhost/

# Проверка MongoDB
docker exec securisk-mongodb mongosh --eval "db.adminCommand('ping')"
```

---

## 💾 Резервное копирование

### Backup базы данных

```bash
# Создание backup MongoDB
docker exec securisk-mongodb mongodump --db securisk_db --out /tmp/backup

# Копирование backup на хост
docker cp securisk-mongodb:/tmp/backup ./backup_$(date +%Y%m%d_%H%M%S)

# Или одной командой:
docker exec securisk-mongodb mongodump --db securisk_db --archive=/tmp/securisk_backup.archive
docker cp securisk-mongodb:/tmp/securisk_backup.archive ./securisk_backup_$(date +%Y%m%d_%H%M%S).archive
```

### Restore базы данных

```bash
# Копирование backup в контейнер
docker cp ./securisk_backup.archive securisk-mongodb:/tmp/

# Восстановление
docker exec securisk-mongodb mongorestore --db securisk_db --archive=/tmp/securisk_backup.archive
```

### Автоматический backup (cron)

```bash
# Создайте скрипт /opt/backup-securisk.sh:
cat > /opt/backup-securisk.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backup/securisk"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p ${BACKUP_DIR}

# Backup MongoDB
docker exec securisk-mongodb mongodump --db securisk_db --archive=/tmp/backup.archive
docker cp securisk-mongodb:/tmp/backup.archive ${BACKUP_DIR}/securisk_${DATE}.archive

# Удаление старых backup (старше 30 дней)
find ${BACKUP_DIR} -name "securisk_*.archive" -mtime +30 -delete

echo "Backup completed: securisk_${DATE}.archive"
EOF

# Сделайте скрипт исполняемым
chmod +x /opt/backup-securisk.sh

# Добавьте в crontab (ежедневно в 2:00)
crontab -e
# Добавьте строку:
0 2 * * * /opt/backup-securisk.sh >> /var/log/securisk-backup.log 2>&1
```

---

## 🔒 Безопасность

### Изменение паролей

```bash
# Подключитесь к backend контейнеру
docker exec -it securisk-backend /bin/sh

# Сгенерируйте новый hash пароля
python3 -c "from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(pwd_context.hash('новый_пароль'))"

# Подключитесь к MongoDB и обновите пароль
docker exec -it securisk-mongodb mongosh securisk_db
db.users.updateOne(
  { username: "admin" },
  { $set: { password_hash: "<новый_hash>" } }
)
```

### HTTPS конфигурация

Для production развертывания с HTTPS:

1. Получите SSL сертификат (Let's Encrypt)
2. Обновите `docker-compose.yml` для монтирования сертификатов
3. Обновите `nginx/conf.d/default.conf` для SSL

Пример:
```yaml
# В docker-compose.yml добавьте в nginx volumes:
volumes:
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  - ./nginx/conf.d:/etc/nginx/conf.d:ro
  - ./ssl:/etc/nginx/ssl:ro  # Добавить эту строку
```

---

## 🐛 Решение проблем

### Проблема: Контейнеры не запускаются

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

### Проблема: Backend не подключается к MongoDB

```bash
# Проверьте, что MongoDB запущен
docker-compose ps mongodb

# Проверьте логи MongoDB
docker-compose logs mongodb

# Проверьте сетевое подключение
docker exec securisk-backend ping mongodb

# Перезапустите сервисы
docker-compose restart mongodb backend
```

### Проблема: Ошибка 502 Bad Gateway

```bash
# Проверьте статус всех контейнеров
docker-compose ps

# Проверьте логи Nginx
docker-compose logs nginx

# Проверьте логи backend и frontend
docker-compose logs backend
docker-compose logs frontend

# Перезапустите контейнеры
docker-compose restart
```

### Проблема: Frontend не собирается

```bash
# Очистите Docker кэш
docker-compose down
docker system prune -a --volumes

# Пересоберите без кэша
docker-compose build --no-cache frontend
docker-compose up -d
```

### Проблема: Нехватка места на диске

```bash
# Проверьте использование диска
docker system df

# Очистка неиспользуемых данных
docker system prune -a

# Очистка volumes (ОСТОРОЖНО: удалит данные!)
docker volume prune
```

---

## 🔧 Настройка для Production

### 1. Измените переменные окружения

```bash
# Отредактируйте .env
SECRET_KEY=<сгенерированный_сильный_ключ>
ENVIRONMENT=production
DEBUG=false
```

### 2. Настройте ограничения ресурсов

Добавьте в `docker-compose.yml`:

```yaml
services:
  backend:
    # ... другие настройки
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. Настройте логирование

```yaml
services:
  backend:
    # ... другие настройки
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. Настройте автозапуск

```bash
# Docker запускается при загрузке системы
sudo systemctl enable docker

# Контейнеры автоматически запускаются (уже настроено через restart: always)
```

---

## 📝 Полезные команды

```bash
# Просмотр всех Docker образов
docker images

# Удаление неиспользуемых образов
docker image prune -a

# Просмотр всех volumes
docker volume ls

# Просмотр сетей
docker network ls

# Инспекция сети
docker network inspect securisk_securisk-network

# Экспорт контейнера
docker export securisk-backend > backend.tar

# Сохранение образа
docker save securisk_backend:latest > backend-image.tar

# Загрузка образа
docker load < backend-image.tar
```

---

## 🎯 Финальная проверка

После развертывания проверьте:

- [ ] Все контейнеры запущены: `docker-compose ps`
- [ ] Приложение доступно: http://localhost
- [ ] API документация доступна: http://localhost/docs
- [ ] Можно войти с admin/admin123
- [ ] Можно создать риск/инцидент/актив
- [ ] Данные сохраняются после перезапуска контейнеров

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Прочитайте раздел "Решение проблем" выше
4. Соберите диагностическую информацию:

```bash
# Создайте файл с диагностикой
cat > diagnostic.txt <<EOF
=== Docker Version ===
$(docker --version)
$(docker-compose --version)

=== Container Status ===
$(docker-compose ps)

=== Container Logs ===
$(docker-compose logs --tail=100)

=== System Resources ===
$(docker stats --no-stream)

=== System Info ===
$(docker system df)
EOF

cat diagnostic.txt
```

---

**SecuRisk Docker Deployment** - Быстро. Просто. Надежно. 🐳
