#!/bin/bash

# SecuRisk - Скрипт автоматической установки для Ubuntu 24.04
# Автор: SecuRisk Team
# Версия: 1.0.0

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции вывода
print_header() {
    echo -e "${BLUE}=========================================="
    echo -e "  $1"
    echo -e "==========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    print_error "Пожалуйста, запустите с sudo"
    exit 1
fi

print_header "SecuRisk - Автоматическая установка"
echo ""
print_info "Ubuntu 24.04 LTS"
print_info "Версия: 1.0.0"
echo ""

# Проверка Ubuntu 24.04
print_info "Проверка версии ОС..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" != "ubuntu" ]; then
        print_warning "Обнаружена ОС: $ID (поддерживается Ubuntu)"
    fi
    print_success "ОС: $PRETTY_NAME"
else
    print_error "Не удалось определить ОС"
    exit 1
fi

# Шаг 1: Обновление системы
print_header "Шаг 1/8: Обновление системы"
apt update -qq
apt upgrade -y -qq
print_success "Система обновлена"

# Шаг 2: Установка зависимостей
print_header "Шаг 2/8: Установка зависимостей"
apt install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    net-tools
print_success "Зависимости установлены"

# Шаг 3: Установка Docker
print_header "Шаг 3/8: Установка Docker"

if command -v docker &> /dev/null; then
    print_warning "Docker уже установлен"
    docker --version
else
    print_info "Установка Docker..."
    
    # Удаление старых версий
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Добавление репозитория
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Установка
    apt update -qq
    apt install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    print_success "Docker установлен"
    docker --version
fi

# Шаг 4: Настройка Docker
print_header "Шаг 4/8: Настройка Docker"

# Автозапуск
systemctl enable docker
systemctl start docker

# Добавление пользователя в группу docker
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    print_success "Пользователь $SUDO_USER добавлен в группу docker"
fi

print_success "Docker настроен"

# Шаг 5: Проверка файлов проекта
print_header "Шаг 5/8: Проверка файлов проекта"

REQUIRED_FILES=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "backend/requirements.txt"
    "backend/server.py"
    "frontend/Dockerfile"
    "frontend/package.json"
    "nginx/nginx.conf"
    "nginx/conf.d/default.conf"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    print_error "Отсутствуют файлы:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    print_error "Пожалуйста, убедитесь, что все файлы проекта на месте"
    exit 1
fi

print_success "Все файлы проекта найдены"

# Шаг 6: Настройка .env
print_header "Шаг 6/8: Настройка переменных окружения"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_info "Создание .env из .env.example..."
        cp .env.example .env
        
        # Генерация SECRET_KEY
        if command -v openssl &> /dev/null; then
            SECRET_KEY=$(openssl rand -hex 32)
            sed -i "s/change-this-secret-key-in-production-min-32-chars-long/$SECRET_KEY/" .env
            print_success "Сгенерирован уникальный SECRET_KEY"
        fi
    else
        print_info "Создание .env с настройками по умолчанию..."
        cat > .env <<EOF
MONGO_URL=mongodb://mongodb:27017
DB_NAME=securisk_db
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || echo "change-this-secret-key-in-production-min-32-chars-long")
ALGORITHM=HS256
ENVIRONMENT=production
DEBUG=false
REACT_APP_BACKEND_URL=http://localhost/api
EOF
    fi
    print_success "Файл .env создан"
else
    print_warning "Файл .env уже существует, пропускаем"
fi

# Шаг 7: Сборка Docker образов
print_header "Шаг 7/8: Сборка Docker образов"
print_info "Это может занять 5-10 минут при первом запуске..."

docker compose build 2>&1 | grep -E "^(#|=>|WARN|ERROR)" || true

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_success "Docker образы собраны успешно"
else
    print_error "Ошибка при сборке Docker образов"
    print_info "Проверьте логи выше для деталей"
    exit 1
fi

# Шаг 8: Запуск сервисов
print_header "Шаг 8/8: Запуск сервисов"

docker compose up -d

if [ $? -eq 0 ]; then
    print_success "Сервисы запущены"
else
    print_error "Ошибка при запуске сервисов"
    exit 1
fi

# Ожидание запуска
print_info "Ожидание запуска сервисов (30 секунд)..."
sleep 30

# Проверка статуса
print_header "Проверка статуса"
docker compose ps

# Подсчет запущенных контейнеров
RUNNING_CONTAINERS=$(docker compose ps --filter "status=running" --format json 2>/dev/null | wc -l)

if [ "$RUNNING_CONTAINERS" -ge 4 ]; then
    print_success "Все контейнеры запущены ($RUNNING_CONTAINERS/4)"
else
    print_warning "Запущено $RUNNING_CONTAINERS из 4 контейнеров"
    print_info "Проверьте логи: docker compose logs"
fi

# Проверка доступности
print_header "Проверка доступности"

if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
    print_success "Frontend доступен: http://localhost"
else
    print_warning "Frontend не отвечает (это нормально, если требуется больше времени)"
fi

if curl -s http://localhost/docs > /dev/null 2>&1; then
    print_success "Backend API доступен: http://localhost/docs"
else
    print_warning "Backend API не отвечает (подождите ещё немного)"
fi

# Настройка Firewall
print_header "Настройка Firewall"

if command -v ufw &> /dev/null; then
    print_info "Настройка UFW..."
    ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
    ufw allow 80/tcp comment 'HTTP' 2>/dev/null || true
    ufw allow 443/tcp comment 'HTTPS' 2>/dev/null || true
    
    # Проверка статуса UFW
    if ufw status | grep -q "Status: inactive"; then
        print_warning "UFW не активен. Для активации выполните: sudo ufw enable"
    else
        print_success "Firewall настроен"
    fi
else
    print_info "UFW не установлен, пропускаем настройку firewall"
fi

# Финальная информация
echo ""
print_header "🎉 Установка завершена!"
echo ""
print_success "SecuRisk успешно установлен и запущен!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "📍 Доступ к приложению:"
echo "   Frontend:  http://localhost"
echo "   API Docs:  http://localhost/docs"
echo ""
print_info "🔐 Учетные данные по умолчанию:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
print_warning "⚠️  ВАЖНО: Сразу измените пароль администратора!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "📝 Полезные команды:"
echo ""
echo "  Просмотр статуса:"
echo "    docker compose ps"
echo ""
echo "  Просмотр логов:"
echo "    docker compose logs -f"
echo ""
echo "  Перезапуск:"
echo "    docker compose restart"
echo ""
echo "  Остановка:"
echo "    docker compose stop"
echo ""
echo "  Полная остановка:"
echo "    docker compose down"
echo ""
print_info "📚 Документация:"
echo "   README.md - Полная документация"
echo "   DOCKER_DEPLOY.md - Руководство по Docker"
echo "   UBUNTU_INSTALL.md - Инструкция для Ubuntu"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "Установка завершена! Откройте http://localhost в браузере"
echo ""
