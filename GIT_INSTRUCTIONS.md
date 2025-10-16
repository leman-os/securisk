# 📋 Инструкция по добавлению файлов в Git

## Проверка текущего состояния

```bash
cd ~/securisk

# Проверьте, какие файлы будут добавлены
git status
```

## Добавление всех файлов в Git

```bash
# Добавить все новые файлы
git add .

# Или добавить конкретные файлы:
git add docker-compose.yml
git add docker-compose.prod.yml
git add backend/Dockerfile
git add frontend/Dockerfile
git add nginx/
git add .env.example
git add .gitignore
git add .dockerignore
git add LICENSE
git add CONTRIBUTING.md
git add CHANGELOG.md
git add .editorconfig
git add Makefile
git add scripts/
git add README.md
git add DOCKER_DEPLOY.md
git add QUICKSTART.md
git add quick-start.sh
git add start.sh
```

## Проверка добавленных файлов

```bash
# Посмотрите, что будет закоммичено
git status

# Посмотрите список файлов
git ls-files
```

## Создание коммита

```bash
# Создайте коммит с описанием
git commit -m "feat: добавлена Docker контейнеризация SecuRisk

- Docker Compose конфигурация для 4 сервисов
- Dockerfile для backend (Python/FastAPI)
- Dockerfile для frontend (React)
- Nginx reverse proxy конфигурация
- Автоматические скрипты запуска и backup
- Полная документация (README, DOCKER_DEPLOY, QUICKSTART)
- Makefile для удобного управления
- Healthcheck для всех сервисов
- Production-ready конфигурация
"
```

## Push в удаленный репозиторий

```bash
# Если репозиторий уже настроен
git push origin main

# Если это первый push
git remote add origin <URL_вашего_репозитория>
git branch -M main
git push -u origin main
```

## Создание тега версии (опционально)

```bash
# Создайте тег для версии
git tag -a v1.0.0 -m "Release v1.0.0 - Docker контейнеризация"

# Отправьте тег
git push origin v1.0.0
```

---

## Что НЕ попадет в Git (благодаря .gitignore)

✅ `.env` - файл с секретами (останется локальным)  
✅ `node_modules/` - зависимости Node.js  
✅ `__pycache__/` - кэш Python  
✅ `venv/` - виртуальное окружение Python  
✅ `build/` - собранные файлы  
✅ `*.log` - файлы логов  
✅ `test_result.md` - тестовые данные  
✅ `.DS_Store` - системные файлы Mac  

## Что ДОЛЖНО быть в Git

✅ `.env.example` - шаблон для .env  
✅ `docker-compose.yml` - основная конфигурация  
✅ `docker-compose.prod.yml` - production конфигурация  
✅ `Dockerfile` - файлы для сборки образов  
✅ Вся документация  
✅ Исходный код (backend, frontend)  
✅ Конфигурационные файлы  
✅ Скрипты  

---

## Быстрая команда (все в одном)

```bash
cd ~/securisk

# Добавить все файлы
git add .

# Создать коммит
git commit -m "feat: Docker контейнеризация SecuRisk v1.0.0"

# Отправить в репозиторий
git push origin main

# Создать тег версии
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## Проверка после push

После того как вы отправили код в Git:

1. Проверьте на GitHub/GitLab, что все файлы загружены
2. Клонируйте репозиторий в новую директорию для проверки:
   ```bash
   cd /tmp
   git clone <URL_вашего_репозитория> test-securisk
   cd test-securisk
   ./start.sh
   ```

---

## Важные файлы проекта

### Основные
- `docker-compose.yml` - оркестрация контейнеров
- `.env.example` - шаблон переменных окружения
- `.gitignore` - игнорируемые файлы
- `README.md` - основная документация

### Docker
- `backend/Dockerfile` - образ backend
- `frontend/Dockerfile` - образ frontend
- `nginx/nginx.conf` - конфигурация Nginx
- `nginx/conf.d/default.conf` - роутинг

### Документация
- `README.md` - полная документация (1500+ строк)
- `DOCKER_DEPLOY.md` - инструкции по Docker
- `QUICKSTART.md` - быстрый старт
- `CONTRIBUTING.md` - руководство для контрибьюторов
- `CHANGELOG.md` - история изменений

### Скрипты
- `quick-start.sh` - автоматический запуск
- `start.sh` - простой запуск
- `scripts/backup.sh` - резервное копирование
- `scripts/restore.sh` - восстановление

### Утилиты
- `Makefile` - команды для управления
- `.editorconfig` - настройки редактора
- `LICENSE` - лицензия MIT

---

## Следующие шаги

После push в Git:

1. ✅ Код в репозитории
2. ✅ Другие разработчики могут клонировать
3. ✅ Можно развернуть на любом сервере с Docker
4. ✅ Автоматическое развертывание (CI/CD)

### Настройка CI/CD (опционально)

Для автоматического развертывания добавьте `.github/workflows/deploy.yml` или `.gitlab-ci.yml`

---

**Готово! Теперь ваш проект SecuRisk полностью готов к публикации! 🎉**
