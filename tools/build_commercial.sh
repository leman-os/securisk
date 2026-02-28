#!/bin/bash
# =============================================================
# SecuRisk — скрипт коммерческой сборки (только для вендора)
# =============================================================
# Использование:
#   SR_LICENSE_SALT="ваша_соль" ./tools/build_commercial.sh
#
# Опции (переменные окружения):
#   SR_LICENSE_SALT  — ОБЯЗАТЕЛЬНО. Секретная соль для лицензий.
#   VERSION          — версия образа (по умолчанию: latest)
#   USE_NUITKA       — true|false (по умолчанию: true)
#                      false — быстрая сборка для тестирования
#                      true  — production: компилирует .py в .so через Nuitka (~15 мин)
# =============================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VERSION="${VERSION:-latest}"
USE_NUITKA="${USE_NUITKA:-true}"
IMAGE_NAME="securisk:${VERSION}"

# ---- Проверки ----
if [ -z "$SR_LICENSE_SALT" ]; then
    echo -e "${RED}[ОШИБКА] Переменная SR_LICENSE_SALT не задана!${NC}"
    echo ""
    echo "Задайте секретную соль:"
    echo "  SR_LICENSE_SALT='ваша-уникальная-соль-не-менее-20-символов' ./tools/build_commercial.sh"
    echo ""
    echo "ВАЖНО: Соль должна быть одинаковой во всех сборках для одного клиента."
    echo "       После выдачи ключей соль НЕЛЬЗЯ менять."
    exit 1
fi

if [ "${#SR_LICENSE_SALT}" -lt 16 ]; then
    echo -e "${RED}[ОШИБКА] Соль слишком короткая (${#SR_LICENSE_SALT} символов). Минимум 16.${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

echo -e "${GREEN}=== Сборка коммерческого образа SecuRisk ${VERSION} ===${NC}"
echo -e "  USE_NUITKA : ${USE_NUITKA}"
echo -e "  Salt length: ${#SR_LICENSE_SALT} символов"
echo ""

if [ "$USE_NUITKA" = "true" ]; then
    echo -e "${YELLOW}[!] Nuitka-компиляция занимает ~15-30 минут. Не прерывайте процесс.${NC}"
fi

# ---- Сборка Docker-образа ----
echo -e "${GREEN}[1/3] Сборка Docker-образа...${NC}"
docker build \
    --build-arg "LICENSE_SALT=${SR_LICENSE_SALT}" \
    --build-arg "USE_NUITKA=${USE_NUITKA}" \
    --no-cache \
    -t "${IMAGE_NAME}" \
    .

echo -e "${GREEN}[2/3] Проверка образа...${NC}"
docker run --rm "${IMAGE_NAME}" /usr/local/bin/python -c "import sys; sys.path.insert(0, '/app/backend'); import server; print('OK: server module loaded')" 2>/dev/null \
    && echo -e "${GREEN}  Модуль server загружается корректно${NC}" \
    || echo -e "${YELLOW}  Предупреждение: проверка модуля пропущена (требует MongoDB)${NC}"

echo -e "${GREEN}[3/3] Сохранение образа в архив...${NC}"
ARCHIVE_NAME="securisk-${VERSION}.tar.gz"
docker save "${IMAGE_NAME}" | gzip > "${ARCHIVE_NAME}"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Образ: ${IMAGE_NAME}${NC}"
echo -e "${GREEN}✅ Архив: ${ARCHIVE_NAME} ($(du -sh "${ARCHIVE_NAME}" | cut -f1))${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "Отправьте клиенту:"
echo -e "  1. ${ARCHIVE_NAME}"
echo -e "  2. docker-compose.yml"
echo -e "  3. Инструкцию по запуску"
echo ""
echo -e "${YELLOW}НЕ отправляйте клиенту: tools/, backend/server.py, LICENSE_SALT${NC}"
