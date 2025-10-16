# Changelog

Все значимые изменения в проекте SecuRisk будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [1.0.0] - 2025-01-16

### Добавлено
- Полная Docker контейнеризация проекта
- Docker Compose конфигурация для 4 сервисов
- Автоматический скрипт развертывания `quick-start.sh`
- Подробная документация по Docker (`DOCKER_DEPLOY.md`)
- Краткая инструкция по запуску (`QUICKSTART.md`)
- Nginx reverse proxy конфигурация
- Healthcheck для всех сервисов
- Multi-stage сборка frontend для оптимизации
- Автоматическая ротация логов
- Persistent volumes для MongoDB
- Безопасная конфигурация (non-root containers)

### Исправлено
- Ошибка загрузки инцидентов (неправильный порядок маршрутов API)
- Исправлен порядок эндпоинтов `/api/incidents/metrics/summary` и `/api/incidents/{incident_id}`

### Изменено
- Оптимизирована структура Docker образов
- Улучшена документация README.md
- Обновлены переменные окружения

## [0.1.0] - 2025-01-15

### Добавлено
- Первоначальный релиз SecuRisk
- Модуль управления рисками
- Модуль управления инцидентами с метриками MTTA, MTTR, MTTC
- Модуль управления активами
- Модуль управления пользователями
- Дашборд с визуализацией метрик
- JWT аутентификация
- Ролевая модель пользователей (Администратор, Инженер ИБ, Специалист ИБ)
- FastAPI backend с асинхронной поддержкой
- React frontend с современным UI (Tailwind CSS, Radix UI)
- MongoDB для хранения данных
- Автоматическая генерация номеров (риски, инциденты, активы)
- Responsive дизайн
- Поиск и фильтрация во всех модулях
- API документация (Swagger/ReDoc)

[Unreleased]: https://github.com/yourusername/securisk/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/securisk/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/yourusername/securisk/releases/tag/v0.1.0
