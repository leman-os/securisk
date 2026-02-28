# ============================================================
# ARGs для управления сборкой
# ============================================================
ARG USE_NUITKA=false
ARG LICENSE_SALT

# ============================================================
# Стадия 1: Сборка фронтенда
# ============================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend/ ./
RUN echo "REACT_APP_BACKEND_URL=" > .env && yarn build


# ============================================================
# Стадия 2: Компиляция бэкенда через Nuitka
# Результат: server.cpython-3XX-*.so (extension module)
# Uvicorn импортирует его напрямую — исходник .py в образ не попадает
# ============================================================
FROM python:3.12-slim AS nuitka-builder

ARG LICENSE_SALT

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        patchelf \
        libpython3.12-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt nuitka

COPY backend/server.py .

# Компилируем как extension module (.so):
#   --module       → создаёт импортируемый .so вместо standalone бинаря
#   --follow-imports → включает все зависимости статически
#   --remove-output  → удаляет промежуточные файлы Nuitka
RUN python -m nuitka \
        --module \
        --follow-imports \
        --remove-output \
        --output-dir=/dist \
        server.py

# Проверяем что .so создан
RUN ls -la /dist/


# ============================================================
# Стадия 3: Финальный образ — исходный .py НЕ копируется
# ============================================================
FROM python:3.12-slim AS final

ARG USE_NUITKA
ARG LICENSE_SALT

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        iproute2 \
        nginx \
        supervisor \
    && rm -rf /var/lib/apt/lists/*

# Python-зависимости
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Копируем скомпилированный .so из nuitka-builder
COPY --from=nuitka-builder /dist/server*.so /app/backend/

# Фронтенд (только статика из builder-стадии)
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Nginx конфиг
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Supervisor + entrypoint
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Записываем соль в образ как переменную окружения
# (передаётся при сборке через --build-arg)
ENV LICENSE_SALT=${LICENSE_SALT}

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
