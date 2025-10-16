# Makefile for SecuRisk

.PHONY: help build up down restart logs clean backup restore

help:
	@echo "SecuRisk - Доступные команды:"
	@echo ""
	@echo "  make build       - Собрать Docker образы"
	@echo "  make up          - Запустить все сервисы"
	@echo "  make down        - Остановить все сервисы"
	@echo "  make restart     - Перезапустить все сервисы"
	@echo "  make logs        - Показать логи"
	@echo "  make clean       - Очистить неиспользуемые Docker ресурсы"
	@echo "  make backup      - Создать резервную копию базы данных"
	@echo "  make restore     - Восстановить базу данных"
	@echo "  make status      - Показать статус контейнеров"
	@echo "  make shell-backend  - Подключиться к backend контейнеру"
	@echo "  make shell-mongodb  - Подключиться к MongoDB"
	@echo ""

build:
	@echo "🔨 Сборка Docker образов..."
	docker-compose build

up:
	@echo "🚀 Запуск сервисов..."
	docker-compose up -d
	@echo "✅ Сервисы запущены!"
	@echo "📍 Приложение: http://localhost"
	@echo "📍 API Docs: http://localhost/docs"

down:
	@echo "🛑 Остановка сервисов..."
	docker-compose down

restart:
	@echo "🔄 Перезапуск сервисов..."
	docker-compose restart

logs:
	docker-compose logs -f

status:
	@echo "📊 Статус контейнеров:"
	docker-compose ps

clean:
	@echo "🧹 Очистка неиспользуемых Docker ресурсов..."
	docker system prune -f

backup:
	@echo "💾 Создание backup базы данных..."
	@mkdir -p backup
	docker exec securisk-mongodb mongodump --db securisk_db --archive=/tmp/backup.archive
	docker cp securisk-mongodb:/tmp/backup.archive ./backup/securisk_backup_$$(date +%Y%m%d_%H%M%S).archive
	@echo "✅ Backup создан!"

restore:
	@echo "⚠️  Восстановление базы данных..."
	@read -p "Введите путь к backup файлу: " backup_file; \
	docker cp $$backup_file securisk-mongodb:/tmp/restore.archive && \
	docker exec securisk-mongodb mongorestore --db securisk_db --archive=/tmp/restore.archive
	@echo "✅ База данных восстановлена!"

shell-backend:
	docker exec -it securisk-backend /bin/sh

shell-mongodb:
	docker exec -it securisk-mongodb mongosh securisk_db

shell-frontend:
	docker exec -it securisk-frontend /bin/sh

test:
	@echo "🧪 Запуск тестов..."
	@echo "Backend тесты:"
	docker exec securisk-backend pytest || echo "Backend тесты не настроены"

dev:
	@echo "🔧 Запуск в режиме разработки..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod:
	@echo "🚀 Запуск в production режиме..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

install:
	@echo "📦 Установка SecuRisk..."
	@if [ ! -f .env ]; then \
		echo "Создание .env файла..."; \
		cp .env.example .env; \
		echo "⚠️  Отредактируйте .env файл перед запуском!"; \
	fi
	@make build
	@make up
	@echo ""
	@echo "✅ SecuRisk установлен!"
	@echo "📍 Откройте http://localhost в браузере"
	@echo "🔐 Логин: admin, Пароль: admin123"
