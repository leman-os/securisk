#!/bin/bash

# SecuRisk Copy Script
# Скрипт для копирования всех необходимых файлов из /app в целевую директорию

set -e

TARGET_DIR="${1:-$HOME/securisk}"

echo "=========================================="
echo "  SecuRisk - Копирование файлов"
echo "=========================================="
echo ""
echo "Целевая директория: $TARGET_DIR"
echo ""

# Проверка, существует ли директория
if [ -d "$TARGET_DIR" ]; then
    read -p "⚠️  Директория $TARGET_DIR уже существует. Перезаписать? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Отменено"
        exit 0
    fi
    rm -rf "$TARGET_DIR"
fi

echo "📁 Создание структуры директорий..."
mkdir -p "$TARGET_DIR"/{backend,frontend,nginx/conf.d,scripts}

echo "📄 Копирование корневых файлов..."
cp /app/docker-compose.yml "$TARGET_DIR/"
cp /app/docker-compose.prod.yml "$TARGET_DIR/"
cp /app/.env.example "$TARGET_DIR/"
cp /app/.env "$TARGET_DIR/" 2>/dev/null || cp /app/.env.example "$TARGET_DIR/.env"
cp /app/.gitignore "$TARGET_DIR/"
cp /app/.dockerignore "$TARGET_DIR/"
cp /app/.editorconfig "$TARGET_DIR/"
cp /app/Makefile "$TARGET_DIR/"
cp /app/start.sh "$TARGET_DIR/"
cp /app/quick-start.sh "$TARGET_DIR/" 2>/dev/null || true

echo "📚 Копирование документации..."
cp /app/README.md "$TARGET_DIR/"
cp /app/DOCKER_DEPLOY.md "$TARGET_DIR/"
cp /app/QUICKSTART.md "$TARGET_DIR/"
cp /app/LICENSE "$TARGET_DIR/" 2>/dev/null || true
cp /app/CONTRIBUTING.md "$TARGET_DIR/" 2>/dev/null || true
cp /app/CHANGELOG.md "$TARGET_DIR/" 2>/dev/null || true

echo "🐍 Копирование Backend..."
cp /app/backend/Dockerfile "$TARGET_DIR/backend/"
cp /app/backend/.dockerignore "$TARGET_DIR/backend/"
cp /app/backend/requirements.txt "$TARGET_DIR/backend/"
cp /app/backend/server.py "$TARGET_DIR/backend/"
cp /app/backend/.env "$TARGET_DIR/backend/" 2>/dev/null || true

echo "⚛️  Копирование Frontend..."
cp /app/frontend/Dockerfile "$TARGET_DIR/frontend/"
cp /app/frontend/.dockerignore "$TARGET_DIR/frontend/"
cp /app/frontend/package.json "$TARGET_DIR/frontend/"

# Копирование конфигурационных файлов frontend
cp /app/frontend/craco.config.js "$TARGET_DIR/frontend/" 2>/dev/null || true
cp /app/frontend/jsconfig.json "$TARGET_DIR/frontend/" 2>/dev/null || true
cp /app/frontend/postcss.config.js "$TARGET_DIR/frontend/" 2>/dev/null || true
cp /app/frontend/components.json "$TARGET_DIR/frontend/" 2>/dev/null || true
cp /app/frontend/tailwind.config.js "$TARGET_DIR/frontend/" 2>/dev/null || true
cp /app/frontend/.env "$TARGET_DIR/frontend/" 2>/dev/null || true

# Копирование исходников frontend
echo "  Копирование src/..."
cp -r /app/frontend/src "$TARGET_DIR/frontend/" 2>/dev/null || echo "⚠️  src/ не найдена"

echo "  Копирование public/..."
cp -r /app/frontend/public "$TARGET_DIR/frontend/" 2>/dev/null || echo "⚠️  public/ не найдена"

echo "  Копирование plugins/..."
cp -r /app/frontend/plugins "$TARGET_DIR/frontend/" 2>/dev/null || echo "ℹ️  plugins/ не найдена (опционально)"

echo "🌐 Копирование Nginx конфигурации..."
cp /app/nginx/nginx.conf "$TARGET_DIR/nginx/"
cp /app/nginx/conf.d/default.conf "$TARGET_DIR/nginx/conf.d/"

echo "🔧 Копирование скриптов..."
cp /app/scripts/*.sh "$TARGET_DIR/scripts/" 2>/dev/null || echo "⚠️  Скрипты не найдены"

echo "✅ Установка прав..."
chmod +x "$TARGET_DIR/start.sh" 2>/dev/null || true
chmod +x "$TARGET_DIR/quick-start.sh" 2>/dev/null || true
chmod +x "$TARGET_DIR/scripts/"*.sh 2>/dev/null || true

echo ""
echo "=========================================="
echo "  ✅ Копирование завершено!"
echo "=========================================="
echo ""
echo "📍 Файлы скопированы в: $TARGET_DIR"
echo ""
echo "Следующие шаги:"
echo ""
echo "1. Перейдите в директорию:"
echo "   cd $TARGET_DIR"
echo ""
echo "2. Запустите приложение:"
echo "   sudo ./start.sh"
echo ""
echo "   Или используйте Makefile:"
echo "   sudo make install"
echo ""
echo "3. Откройте в браузере:"
echo "   http://localhost"
echo ""
echo "🔐 Учетные данные:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
