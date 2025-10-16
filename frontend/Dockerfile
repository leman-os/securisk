# Этап 1: Сборка приложения
FROM node:18-alpine AS builder

WORKDIR /app

# Копирование файлов зависимостей
COPY package.json yarn.lock ./

# Установка зависимостей
RUN yarn install --frozen-lockfile --network-timeout 100000

# Копирование исходного кода
COPY . .

# Аргумент для backend URL
ARG REACT_APP_BACKEND_URL=http://localhost/api
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Сборка приложения
RUN yarn build

# Этап 2: Production сервер
FROM node:18-alpine

WORKDIR /app

# Установка serve для раздачи статики
RUN npm install -g serve

# Копирование собранного приложения из builder
COPY --from=builder /app/build ./build

# Создание пользователя для безопасности
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

# Открытие порта
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Запуск приложения
CMD ["serve", "-s", "build", "-l", "3000"]
