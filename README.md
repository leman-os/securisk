# SecuRisk - Система управления информационной безопасностью

![ISO 27000](https://img.shields.io/badge/ISO-27000-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110.1-green)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)

SecuRisk - это комплексная система управления информационной безопасностью, соответствующая стандарту ISO 27000. Система предоставляет инструменты для управления рисками, инцидентами, активами и пользователями в корпоративной среде.

---

## 📋 Содержание

1. [Обзор системы](#Обзор-системы)
2. [Архитектура](#Архитектура)
3. [Модули системы](#Модули-системы)
4. [Технологический стек](#Технологический-стек)
5. [Требования](#Требования)
6. [Установка и развертывание](#Установка-и-развертывание)
7. [Конфигурация](#Конфигурация)
8. [Структура проекта](#Структура-проекта)
9. [API Документация](#Api-документация)
10. [Эксплуатация](#Эксплуатация)
11. [Безопасность](#Безопасность)
12. [Мониторинг и логирование](#Мониторинг-и-логирование)
13. [Резервное копирование](#Резервное-копирование)
14. [Решение проблем](#Решение-проблем)

---

## Обзор системы

SecuRisk обеспечивает полный цикл управления информационной безопасностью:

- **Реестр рисков** - идентификация, оценка и управление рисками ИБ
- **Управление инцидентами** - регистрация, расследование и метрики (MTTA, MTTR, MTTC)
- **Реестр активов** - учет и категоризация информационных активов
- **Управление пользователями** - контроль доступа и ролевая модель
- **Дашборд** - визуализация ключевых метрик безопасности
- **Настройки** - гибкая конфигурация под требования организации

---

## Архитектура

### Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                       Пользователь                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nginx (Reverse Proxy)                       │
│                      Port: 80/443                            │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               │                      │
        ┌──────▼───────┐      ┌──────▼───────┐
        │   Frontend   │      │   Backend    │
        │   React App  │      │   FastAPI    │
        │   Port: 3000 │      │   Port: 8001 │
        └──────────────┘      └──────┬───────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │   MongoDB   │
                              │  Port: 27017│
                              └─────────────┘
```

### Компоненты системы

1. **Frontend (React)** - пользовательский интерфейс
2. **Backend (FastAPI)** - REST API сервер
3. **MongoDB** - база данных NoSQL
4. **Nginx** - веб-сервер и reverse proxy
5. **Supervisor** - управление процессами

---

## Модули системы

### 1. Модуль аутентификации и авторизации

**Файлы:**
- `backend/server.py` (строки 200-260)
- `frontend/src/pages/Login.jsx`
- `frontend/src/App.js` (AuthContext)

**Функциональность:**
- JWT-аутентификация
- Роли пользователей (Администратор, Инженер ИБ, Специалист ИБ)
- Хеширование паролей (bcrypt)
- Защита маршрутов

**API Endpoints:**
```
POST /api/auth/login       - Авторизация пользователя
POST /api/auth/register    - Регистрация нового пользователя
GET  /api/users/me         - Получение данных текущего пользователя
```

### 2. Модуль управления рисками

**Файлы:**
- `backend/server.py` (строки 350-450)
- `frontend/src/pages/RiskRegister.jsx`

**Функциональность:**
- Создание и редактирование рисков
- Категоризация по вероятности и влиянию
- Уровни рисков (Низкий, Средний, Высокий, Критический)
- Назначение владельцев рисков
- Отслеживание статуса (Выявлен, В работе, Обработан, Принят)
- Автоматическая генерация номеров рисков

**API Endpoints:**
```
POST   /api/risks              - Создание риска
GET    /api/risks              - Список всех рисков
GET    /api/risks/{risk_id}    - Получение риска по ID
PUT    /api/risks/{risk_id}    - Обновление риска
DELETE /api/risks/{risk_id}    - Удаление риска
```

**Модели данных:**
```python
Risk {
    id: UUID
    risk_number: str          # Пример: "RISK-2025-001"
    title: str
    description: str
    category: str             # Технический, Организационный, Физический
    likelihood: str           # Низкая, Средняя, Высокая
    impact: str              # Низкое, Среднее, Высокое
    risk_level: str          # Низкий, Средний, Высокий, Критический
    status: str              # Выявлен, В работе, Обработан, Принят
    owner: str
    treatment_measures: str
    deadline: str
    created_at: datetime
    updated_at: datetime
}
```

### 3. Модуль управления инцидентами

**Файлы:**
- `backend/server.py` (строки 554-690)
- `frontend/src/pages/Incidents.jsx`

**Функциональность:**
- Регистрация инцидентов ИБ
- Расчет метрик:
  - **MTTA** (Mean Time To Acknowledge) - среднее время обнаружения
  - **MTTR** (Mean Time To Respond) - среднее время реагирования
  - **MTTC** (Mean Time To Close) - среднее время закрытия
- Критичность инцидента (Низкая, Средняя, Высокая)
- Отслеживание нарушителей и затронутых систем
- Автоматическая генерация номеров инцидентов

**API Endpoints:**
```
POST   /api/incidents                    - Создание инцидента
GET    /api/incidents                    - Список всех инцидентов
GET    /api/incidents/metrics/summary    - Сводка метрик (MTTA, MTTR, MTTC)
GET    /api/incidents/{incident_id}      - Получение инцидента по ID
PUT    /api/incidents/{incident_id}      - Обновление инцидента
DELETE /api/incidents/{incident_id}      - Удаление инцидента
```

**Модели данных:**
```python
Incident {
    id: UUID
    incident_number: str        # Пример: "INC-2025-001"
    incident_time: datetime     # Время инцидента
    detection_time: datetime    # Время обнаружения
    reaction_start_time: datetime  # Время начала реакции
    closed_at: datetime         # Время закрытия
    violator: str               # Нарушитель
    subject_type: str           # Тип субъекта
    login: str
    system: str                 # Затронутая система
    incident_type: str
    detection_source: str
    criticality: str            # Низкая, Средняя, Высокая
    detected_by: str            # Кто обнаружил
    status: str                 # Открыт, Закрыт
    description: str
    measures: str               # Принятые меры
    is_repeat: bool             # Повторный инцидент
    comment: str
    mtta: float                 # Метрика в минутах
    mttr: float                 # Метрика в минутах
    mttc: float                 # Метрика в минутах
}
```

### 4. Модуль управления активами

**Файлы:**
- `backend/server.py` (строки 692-800)
- `frontend/src/pages/Assets.jsx`

**Функциональность:**
- Учет информационных активов
- Классификация по важности
- Категоризация активов
- Привязка к владельцам
- Отслеживание местоположения и статуса

**API Endpoints:**
```
POST   /api/assets            - Создание актива
GET    /api/assets            - Список всех активов
GET    /api/assets/{asset_id} - Получение актива по ID
PUT    /api/assets/{asset_id} - Обновление актива
DELETE /api/assets/{asset_id} - Удаление актива
```

**Модели данных:**
```python
Asset {
    id: UUID
    asset_number: str           # Пример: "AST-2025-001"
    name: str
    description: str
    category: str               # Оборудование, ПО, Данные, Персонал
    asset_type: str
    importance: str             # Критичный, Важный, Обычный
    owner: str
    location: str
    status: str                 # Активен, Вывод из эксплуатации
    acquisition_date: str
    cost: float
    created_at: datetime
    updated_at: datetime
}
```

### 5. Модуль управления пользователями

**Файлы:**
- `backend/server.py` (строки 260-350)
- `frontend/src/pages/Users.jsx`

**Функциональность:**
- CRUD операции с пользователями
- Управление ролями
- Смена паролей
- Деактивация учетных записей

**API Endpoints:**
```
POST   /api/users            - Создание пользователя
GET    /api/users            - Список всех пользователей
GET    /api/users/{user_id}  - Получение пользователя по ID
PUT    /api/users/{user_id}  - Обновление пользователя
DELETE /api/users/{user_id}  - Удаление пользователя
```

### 6. Модуль настроек

**Файлы:**
- `backend/server.py` (строки 800-900)
- `frontend/src/pages/Settings.jsx`

**Функциональность:**
- Управление справочниками:
  - Типы субъектов
  - Системы
  - Источники выявления
  - Типы активов
  - Категории рисков
- Настройка временных зон и региональных параметров

**API Endpoints:**
```
GET /api/settings      - Получение настроек
PUT /api/settings      - Обновление настроек
```

### 7. Дашборд (Dashboard)

**Файлы:**
- `frontend/src/pages/Dashboard.jsx`

**Функциональность:**
- Визуализация ключевых метрик
- Статистика по рискам, инцидентам и активам
- Графики и диаграммы
- Быстрый доступ к критичным данным

---

## Технологический стек

### Backend
- **FastAPI 0.110.1** - современный веб-фреймворк для Python
- **Motor 3.3.1** - асинхронный драйвер MongoDB
- **PyJWT 2.10.1** - работа с JWT токенами
- **Passlib 1.7.4** + **Bcrypt 4.1.3** - хеширование паролей
- **Pydantic 2.12.0** - валидация данных
- **Uvicorn 0.25.0** - ASGI сервер

### Frontend
- **React 19.0.0** - библиотека для создания UI
- **React Router DOM 7.5.1** - маршрутизация
- **Axios 1.8.4** - HTTP клиент
- **Radix UI** - компоненты доступного UI
- **Tailwind CSS 3.4.17** - утилитный CSS фреймворк
- **Lucide React** - иконки
- **Sonner** - уведомления
- **React Hook Form** - управление формами
- **Zod** - валидация схем

### База данных
- **MongoDB 4.5+** - документоориентированная NoSQL БД

### Инфраструктура
- **Nginx** - веб-сервер и reverse proxy
- **Supervisor** - управление процессами
- **Docker** (опционально)

---

## Требования

### Минимальные требования

#### Аппаратное обеспечение
- **CPU:** 2 ядра (рекомендуется 4)
- **RAM:** 4 GB (рекомендуется 8 GB)
- **Диск:** 20 GB свободного места (рекомендуется SSD)

#### Программное обеспечение
- **ОС:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **Python:** 3.11+
- **Node.js:** 18.x+
- **MongoDB:** 4.4+
- **Nginx:** 1.18+
- **Supervisor:** 4.2+

### Для разработки дополнительно
- **Git:** 2.25+
- **Yarn:** 1.22+
- **curl, wget** - для тестирования API

---

## Установка и развертывание

### Способ 1: Ручная установка (Production)

#### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y python3.11 python3.11-venv python3-pip \
    nodejs npm mongodb nginx supervisor git curl
    
# Установка Yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn

# Проверка версий
python3.11 --version  # Должно быть 3.11+
node --version        # Должно быть 18+
yarn --version        # Должно быть 1.22+
mongod --version      # Должно быть 4.4+
```

#### Шаг 2: Клонирование проекта

```bash
# Создание директории для приложения
sudo mkdir -p /opt/securisk
sudo chown $USER:$USER /opt/securisk

# Клонирование репозитория
cd /opt/securisk
git clone <URL_РЕПОЗИТОРИЯ> .

# Или копирование архива
# tar -xzvf securisk.tar.gz -C /opt/securisk
```

#### Шаг 3: Настройка MongoDB

```bash
# Запуск MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Создание базы данных и пользователя
mongosh <<EOF
use securisk_db
db.createUser({
  user: "securisk_user",
  pwd: "ИЗМЕНИТЕ_ЭТОТ_ПАРОЛЬ",
  roles: [
    { role: "readWrite", db: "securisk_db" }
  ]
})
exit
EOF

# Или использовать MongoDB без аутентификации (не рекомендуется для production)
```

#### Шаг 4: Настройка Backend

```bash
cd /opt/securisk/backend

# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install --upgrade pip
pip install -r requirements.txt

# Создание файла .env
cat > .env <<EOF
# MongoDB конфигурация
MONGO_URL=mongodb://localhost:27017
DB_NAME=securisk_db

# Безопасность
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256

# Настройки приложения
ENVIRONMENT=production
DEBUG=false
EOF

# Проверка подключения к MongoDB
python -c "from motor.motor_asyncio import AsyncIOMotorClient; import os; from dotenv import load_dotenv; load_dotenv(); client = AsyncIOMotorClient(os.environ['MONGO_URL']); print('MongoDB connected successfully')"
```

#### Шаг 5: Настройка Frontend

```bash
cd /opt/securisk/frontend

# Установка зависимостей
yarn install

# Создание файла .env
cat > .env <<EOF
# Backend API URL (будет использоваться Nginx reverse proxy)
REACT_APP_BACKEND_URL=http://localhost:8001/api

# Для production с доменом:
# REACT_APP_BACKEND_URL=https://yourdomain.com/api
EOF

# Сборка production версии (опционально)
# yarn build
```

#### Шаг 6: Настройка Supervisor

Supervisor управляет процессами backend и frontend.

```bash
# Создание конфигурации для Backend
sudo tee /etc/supervisor/conf.d/securisk-backend.conf > /dev/null <<EOF
[program:securisk-backend]
command=/opt/securisk/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --reload
directory=/opt/securisk/backend
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/securisk-backend.log
stderr_logfile=/var/log/supervisor/securisk-backend-error.log
environment=PATH="/opt/securisk/backend/venv/bin"
EOF

# Создание конфигурации для Frontend
sudo tee /etc/supervisor/conf.d/securisk-frontend.conf > /dev/null <<EOF
[program:securisk-frontend]
command=/usr/bin/yarn start
directory=/opt/securisk/frontend
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/securisk-frontend.log
stderr_logfile=/var/log/supervisor/securisk-frontend-error.log
environment=PATH="/usr/bin:/usr/local/bin"
EOF

# Обновление конфигурации Supervisor
sudo supervisorctl reread
sudo supervisorctl update

# Запуск сервисов
sudo supervisorctl start securisk-backend
sudo supervisorctl start securisk-frontend

# Проверка статуса
sudo supervisorctl status
```

#### Шаг 7: Настройка Nginx

```bash
# Создание конфигурации Nginx
sudo tee /etc/nginx/sites-available/securisk > /dev/null <<'EOF'
upstream backend {
    server 127.0.0.1:8001;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;  # Замените на ваш домен в production

    client_max_body_size 100M;

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Поддержка WebSocket (если нужно)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Таймауты
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket для hot reload
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Активация конфигурации
sudo ln -sf /etc/nginx/sites-available/securisk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### Шаг 8: Настройка Firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Шаг 9: Проверка развертывания

```bash
# Проверка статуса всех сервисов
sudo systemctl status mongodb
sudo systemctl status nginx
sudo supervisorctl status

# Проверка логов
sudo tail -f /var/log/supervisor/securisk-backend.log
sudo tail -f /var/log/supervisor/securisk-frontend.log
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Проверка доступности
curl http://localhost/api/health  # Если есть health endpoint
curl http://localhost/

# Первоначальный вход
# По умолчанию создается пользователь:
# Username: admin
# Password: admin123
```
#### Если не входит в панель

```bash 
sudo nano /etc/nginx/sites-available/securisk
```
Поправить на:

```bash 
upstream backend {
    server 127.0.0.1:8001;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;  # Замените на ваш домен в production

    client_max_body_size 100M;

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Поддержка WebSocket (если нужно)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Таймауты
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Frontend
    location / {
        root /opt/securisk/frontend/build;
        index index.html index.htm;
        try_files $uri /index.html;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket для hot reload
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
Затем открыть:

```bash 
nano /opt/securisk/frontend/.env
```
И поправить:

```bash
# Backend API URL (будет использоваться Nginx reverse proxy)
REACT_APP_BACKEND_URL=http://securisk.oos.ru:8001

# Для production с доменом:
# REACT_APP_BACKEND_URL=https://yourdomain.com/api
```

Потом сборка заново и перезагрузка 

```bash
cd /opt/securisk/frontend
yarn build

sudo systemctl reload nginx
sudo supervisorctl restart securisk-frontend
```

### Способ 2: Docker (Development/Production)

#### Создание Docker Compose конфигурации

Создайте файл `docker-compose.yml` в корне проекта:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: securisk-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: securisk_db
    volumes:
      - mongodb_data:/data/db
    networks:
      - securisk-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: securisk-backend
    restart: always
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=securisk_db
      - SECRET_KEY=your-secret-key-change-me
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app
    networks:
      - securisk-network
    command: uvicorn server:app --host 0.0.0.0 --port 8001 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: securisk-frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001/api
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - securisk-network
    command: yarn start

  nginx:
    image: nginx:alpine
    container_name: securisk-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - securisk-network

volumes:
  mongodb_data:

networks:
  securisk-network:
    driver: bridge
```

#### Создание Dockerfile для Backend

`backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### Создание Dockerfile для Frontend

`frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

EXPOSE 3000

CMD ["yarn", "start"]
```

#### Запуск с Docker Compose

```bash
# Сборка и запуск всех контейнеров
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Остановка с удалением данных
docker-compose down -v
```

---

## Конфигурация

### Backend (.env)

```bash
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=securisk_db

# Security
SECRET_KEY=your-256-bit-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 часа

# Application Settings
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# CORS Settings (если нужно)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Frontend (.env)

```bash
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001/api

# Для production с доменом
# REACT_APP_BACKEND_URL=https://yourdomain.com/api

# Другие настройки (опционально)
REACT_APP_NAME=SecuRisk
REACT_APP_VERSION=1.0.0
```

### Генерация SECRET_KEY

```bash
# Вариант 1: OpenSSL
openssl rand -hex 32

# Вариант 2: Python
python -c "import secrets; print(secrets.token_hex(32))"

# Вариант 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Структура проекта

```
securisk/
├── README.md                          # Документация проекта
├── docker-compose.yml                 # Docker конфигурация (опционально)
├── .gitignore
│
├── backend/                           # Backend приложение
│   ├── server.py                      # Главный файл FastAPI приложения
│   ├── requirements.txt               # Python зависимости
│   ├── .env                          # Переменные окружения (не в Git!)
│   ├── Dockerfile                    # Docker образ для backend
│   └── tests/                        # Тесты backend
│
├── frontend/                          # Frontend приложение
│   ├── public/                       # Статические файлы
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/               # React компоненты
│   │   │   ├── Layout.jsx           # Основной layout
│   │   │   └── ui/                  # UI компоненты (shadcn/ui)
│   │   ├── pages/                   # Страницы приложения
│   │   │   ├── Login.jsx           # Страница авторизации
│   │   │   ├── Dashboard.jsx       # Дашборд
│   │   │   ├── RiskRegister.jsx    # Реестр рисков
│   │   │   ├── Incidents.jsx       # Управление инцидентами
│   │   │   ├── Assets.jsx          # Реестр активов
│   │   │   ├── Users.jsx           # Управление пользователями
│   │   │   └── Settings.jsx        # Настройки
│   │   ├── hooks/                   # React hooks
│   │   ├── lib/                     # Утилиты
│   │   ├── App.js                   # Главный компонент
│   │   ├── App.css
│   │   ├── index.js                 # Entry point
│   │   └── index.css
│   ├── package.json                  # Node зависимости
│   ├── yarn.lock
│   ├── .env                         # Frontend переменные (не в Git!)
│   ├── tailwind.config.js           # Tailwind конфигурация
│   ├── craco.config.js              # Create React App конфигурация
│   ├── Dockerfile                   # Docker образ для frontend
│   └── README.md
│
├── nginx/                            # Nginx конфигурация
│   └── nginx.conf
│
├── tests/                            # Интеграционные тесты
│   └── __init__.py
│
└── scripts/                          # Утилитарные скрипты
    ├── backup.sh                    # Резервное копирование
    ├── restore.sh                   # Восстановление
    └── deploy.sh                    # Скрипт развертывания
```

---

## API Документация

FastAPI автоматически генерирует интерактивную документацию API.

### Доступ к документации

После запуска backend:
- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc
- **OpenAPI Schema:** http://localhost:8001/openapi.json

### Основные эндпоинты

#### Аутентификация
```
POST   /api/auth/login         - Вход в систему
POST   /api/auth/register      - Регистрация
GET    /api/users/me          - Текущий пользователь
```

#### Пользователи
```
GET    /api/users              - Список пользователей
POST   /api/users              - Создание пользователя
GET    /api/users/{id}         - Получение пользователя
PUT    /api/users/{id}         - Обновление пользователя
DELETE /api/users/{id}         - Удаление пользователя
```

#### Риски
```
GET    /api/risks              - Список рисков
POST   /api/risks              - Создание риска
GET    /api/risks/{id}         - Получение риска
PUT    /api/risks/{id}         - Обновление риска
DELETE /api/risks/{id}         - Удаление риска
```

#### Инциденты
```
GET    /api/incidents                  - Список инцидентов
POST   /api/incidents                  - Создание инцидента
GET    /api/incidents/metrics/summary  - Метрики (MTTA, MTTR, MTTC)
GET    /api/incidents/{id}             - Получение инцидента
PUT    /api/incidents/{id}             - Обновление инцидента
DELETE /api/incidents/{id}             - Удаление инцидента
```

#### Активы
```
GET    /api/assets             - Список активов
POST   /api/assets             - Создание актива
GET    /api/assets/{id}        - Получение актива
PUT    /api/assets/{id}        - Обновление актива
DELETE /api/assets/{id}        - Удаление актива
```

#### Настройки
```
GET    /api/settings           - Получение настроек
PUT    /api/settings           - Обновление настроек
```

### Пример запроса с аутентификацией

```bash
# 1. Получение токена
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Ответ:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIs...",
#   "token_type": "bearer",
#   "user": {...}
# }

# 2. Использование токена
curl -X GET "http://localhost:8001/api/risks" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Эксплуатация

### Управление сервисами через Supervisor

```bash
# Просмотр статуса всех сервисов
sudo supervisorctl status

# Запуск/остановка/перезапуск конкретного сервиса
sudo supervisorctl start securisk-backend
sudo supervisorctl stop securisk-backend
sudo supervisorctl restart securisk-backend

# Запуск/остановка/перезапуск всех сервисов
sudo supervisorctl start all
sudo supervisorctl stop all
sudo supervisorctl restart all

# Перечитать конфигурацию
sudo supervisorctl reread
sudo supervisorctl update

# Просмотр логов
sudo supervisorctl tail -f securisk-backend
sudo supervisorctl tail -f securisk-frontend
```

### Обновление приложения

```bash
# 1. Остановка сервисов
sudo supervisorctl stop all

# 2. Резервное копирование (см. раздел Резервное копирование)
./scripts/backup.sh

# 3. Обновление кода
cd /opt/securisk
git pull origin main

# 4. Обновление backend зависимостей
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# 5. Обновление frontend зависимостей
cd ../frontend
yarn install

# 6. Перезапуск сервисов
sudo supervisorctl start all

# 7. Проверка логов
sudo supervisorctl tail -f securisk-backend
sudo supervisorctl tail -f securisk-frontend
```

### Управление пользователями через CLI

```bash
# Создание нового администратора через MongoDB
mongosh securisk_db <<EOF
db.users.insertOne({
  id: UUID().toString(),
  username: "newadmin",
  password_hash: "<bcrypt_hash>",
  full_name: "New Administrator",
  email: "admin@company.com",
  role: "Администратор",
  created_at: new Date()
})
EOF

# Сброс пароля пользователя (требует генерации bcrypt hash)
python3 -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
print(pwd_context.hash('новый_пароль'))
"
```

### Очистка логов

```bash
# Очистка логов Supervisor
sudo truncate -s 0 /var/log/supervisor/securisk-backend.log
sudo truncate -s 0 /var/log/supervisor/securisk-frontend.log

# Очистка логов Nginx
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log

# Ротация логов (автоматическая через logrotate)
# Создайте /etc/logrotate.d/securisk:
cat <<EOF | sudo tee /etc/logrotate.d/securisk
/var/log/supervisor/securisk-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

---

## Безопасность

### Рекомендации по безопасности

#### 1. Безопасность паролей
```bash
# Обязательно измените пароль администратора по умолчанию
# через веб-интерфейс или MongoDB

# Требования к паролям:
# - Минимум 8 символов
# - Заглавные и строчные буквы
# - Цифры
# - Специальные символы
```

#### 2. HTTPS конфигурация

```bash
# Установка Certbot для Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d yourdomain.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

Обновите Nginx конфигурацию:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Остальная конфигурация...
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 3. Ограничение доступа

```nginx
# В конфигурации Nginx добавьте ограничение по IP:
location /api/ {
    allow 192.168.1.0/24;  # Внутренняя сеть
    deny all;
    
    proxy_pass http://backend;
    # ... остальная конфигурация
}
```

#### 4. Защита MongoDB

```bash
# Включите аутентификацию в /etc/mongod.conf:
security:
  authorization: enabled

# Создайте пользователя с ограниченными правами
mongosh admin <<EOF
db.createUser({
  user: "securisk_user",
  pwd: "СИЛЬНЫЙ_ПАРОЛЬ",
  roles: [
    { role: "readWrite", db: "securisk_db" }
  ]
})
EOF

# Обновите MONGO_URL в backend/.env:
MONGO_URL=mongodb://securisk_user:СИЛЬНЫЙ_ПАРОЛЬ@localhost:27017/securisk_db
```

#### 5. Регулярные обновления

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление Python зависимостей
cd /opt/securisk/backend
source venv/bin/activate
pip list --outdated
pip install --upgrade <package_name>

# Обновление Node.js зависимостей
cd /opt/securisk/frontend
yarn outdated
yarn upgrade-interactive
```

#### 6. Аудит безопасности

```bash
# Проверка открытых портов
sudo netstat -tulpn

# Проверка активных соединений
sudo ss -tunap

# Анализ логов на подозрительную активность
sudo grep "401\|403\|500" /var/log/nginx/access.log | tail -50
```

---

## Мониторинг и логирование

### Логи приложения

```bash
# Backend логи
sudo tail -f /var/log/supervisor/securisk-backend.log
sudo tail -f /var/log/supervisor/securisk-backend-error.log

# Frontend логи
sudo tail -f /var/log/supervisor/securisk-frontend.log
sudo tail -f /var/log/supervisor/securisk-frontend-error.log

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB логи
sudo tail -f /var/log/mongodb/mongod.log

# Supervisor логи
sudo tail -f /var/log/supervisor/supervisord.log
```

### Мониторинг производительности

```bash
# Мониторинг использования ресурсов
htop

# Использование диска
df -h
du -sh /opt/securisk/*

# Использование памяти
free -m

# Нагрузка на CPU
uptime

# Мониторинг процессов Python
ps aux | grep python

# Мониторинг процессов Node.js
ps aux | grep node

# Мониторинг MongoDB
mongosh --eval "db.stats()"
mongosh --eval "db.serverStatus()"
```

---

## Резервное копирование

### Автоматический скрипт резервного копирования

Создайте файл `/opt/securisk/scripts/backup.sh`:

```bash
#!/bin/bash

# SecuRisk Backup Script
BACKUP_DIR="/backup/securisk"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="securisk_backup_${DATE}"
RETENTION_DAYS=30

# Создание директории для бэкапов
mkdir -p ${BACKUP_DIR}

echo "=== SecuRisk Backup Started at $(date) ==="

# Backup MongoDB
echo "Backing up MongoDB..."
mongodump --db securisk_db --out ${BACKUP_DIR}/${BACKUP_NAME}/mongodb

# Backup application files
echo "Backing up application files..."
tar -czf ${BACKUP_DIR}/${BACKUP_NAME}/app_files.tar.gz /opt/securisk

# Create archive
cd ${BACKUP_DIR}
tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}
rm -rf ${BACKUP_NAME}

# Cleanup old backups
find ${BACKUP_DIR} -name "securisk_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "=== SecuRisk Backup Finished at $(date) ==="
```

```bash
# Сделать скрипт исполняемым
chmod +x /opt/securisk/scripts/backup.sh

# Добавить в crontab для ежедневного бэкапа в 2:00
crontab -e
# Добавьте строку:
0 2 * * * /opt/securisk/scripts/backup.sh >> /var/log/securisk-backup.log 2>&1
```

---

## Решение проблем

### Проблема: Backend не запускается

```bash
# 1. Проверьте логи
sudo supervisorctl tail -100 securisk-backend stderr

# 2. Проверьте виртуальное окружение
cd /opt/securisk/backend
source venv/bin/activate
python -c "import fastapi; print(fastapi.__version__)"

# 3. Переустановите зависимости
pip install -r requirements.txt --force-reinstall

# 4. Проверьте подключение к MongoDB
python -c "from motor.motor_asyncio import AsyncIOMotorClient; import os; from dotenv import load_dotenv; load_dotenv(); client = AsyncIOMotorClient(os.environ['MONGO_URL']); print('Success')"

# 5. Перезапустите сервис
sudo supervisorctl restart securisk-backend
```

### Проблема: Frontend не загружается

```bash
# 1. Проверьте логи
sudo supervisorctl tail -100 securisk-frontend stderr

# 2. Очистите кэш
cd /opt/securisk/frontend
rm -rf node_modules
rm yarn.lock
yarn install

# 3. Перезапустите
sudo supervisorctl restart securisk-frontend
```

### Проблема: Ошибка 502 Bad Gateway

```bash
# 1. Проверьте статус backend и frontend
sudo supervisorctl status

# 2. Проверьте, слушают ли порты
sudo netstat -tulpn | grep -E '3000|8001'

# 3. Проверьте логи Nginx
sudo tail -50 /var/log/nginx/error.log

# 4. Перезапустите все сервисы
sudo supervisorctl restart all
sudo systemctl restart nginx
```

### Проблема: Ошибка загрузки инцидентов

Эта проблема уже исправлена в текущей версии. Маршрут `/api/incidents/metrics/summary` теперь определен ПЕРЕД `/api/incidents/{incident_id}` в `backend/server.py`.

---

## 📞 Поддержка

### Контакты
- **Email:** support@company.com
- **Документация:** https://docs.securisk.local

### Диагностическая информация

При обращении в поддержку соберите информацию:

```bash
sudo tee /tmp/securisk-diagnostic.txt > /dev/null <<EOF
=== System Information ===
$(uname -a)

=== Service Status ===
$(sudo supervisorctl status)

=== Backend Logs (last 50 lines) ===
$(sudo tail -50 /var/log/supervisor/securisk-backend-error.log)
EOF

cat /tmp/securisk-diagnostic.txt
```

---

## Лицензия

Copyright © 2025 SecuRisk. Все права защищены.

---

## 📝 История изменений

### Версия 1.0.0 (2025-01-XX)

- ✅ Первоначальный релиз
- ✅ Модуль управления рисками
- ✅ Модуль управления инцидентами с метриками MTTA, MTTR, MTTC
- ✅ Модуль управления активами
- ✅ Модуль управления пользователями
- ✅ Дашборд с визуализацией
- ✅ JWT аутентификация
- ✅ Роли пользователей
- ✅ Responsive дизайн
- ✅ Исправлена ошибка загрузки инцидентов (порядок маршрутов)

---

**SecuRisk** - Ваша безопасность под контролем! 🔒
