# 📋 Команды для развертывания SecuRisk на вашем сервере

## Вариант 1: Если у вас есть Git репозиторий

```bash
# На вашем локальном компьютере
cd ~/securisk
git init
git add .
git commit -m "Initial commit"
git remote add origin <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
git push -u origin main

# На сервере Ubuntu
ssh user@your-server
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> ~/securisk
cd ~/securisk
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

---

## Вариант 2: Копирование через SCP

### На вашем локальном компьютере:

```bash
# Создайте архив (замените /app на путь к вашему проекту)
cd ~/securisk
tar -czf securisk.tar.gz \
    docker-compose.yml \
    .env.example \
    .gitignore \
    .dockerignore \
    Makefile \
    install-ubuntu.sh \
    backend/ \
    frontend/ \
    nginx/ \
    scripts/ \
    *.md

# Скопируйте на сервер
scp securisk.tar.gz user@your-server:~/
```

### На сервере:

```bash
# Распакуйте
cd ~
tar -xzf securisk.tar.gz
cd securisk

# Запустите установку
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

---

## Вариант 3: Пошаговое создание на сервере

Если нет возможности передать файлы, выполните на сервере:

```bash
# 1. Установите Docker
curl -fsSL https://get.docker.com | sudo bash

# 2. Создайте структуру
mkdir -p ~/securisk/{backend,frontend/src/pages,frontend/public,nginx/conf.d,scripts}
cd ~/securisk

# 3. Скачайте файлы из GitHub
# (здесь будут команды для скачивания каждого файла отдельно)
# или используйте Git:
git clone <URL> .
```

---

## Проверка после установки

```bash
# Проверьте контейнеры
docker compose ps

# Все 4 должны быть "Up":
# - securisk-mongodb
# - securisk-backend
# - securisk-frontend  
# - securisk-nginx

# Проверьте логи
docker compose logs -f

# Проверьте доступность
curl http://localhost

# Откройте в браузере
http://your-server-ip
```

---

## Минимальные файлы, которые нужны на сервере

```
securisk/
├── docker-compose.yml          # Обязательно
├── .env или .env.example       # Обязательно
├── install-ubuntu.sh           # Для автоустановки
├── backend/
│   ├── Dockerfile              # Обязательно
│   ├── requirements.txt        # Обязательно
│   └── server.py               # Обязательно
├── frontend/
│   ├── Dockerfile              # Обязательно
│   ├── package.json            # Обязательно
│   ├── src/                    # Обязательно
│   └── public/                 # Обязательно
└── nginx/
    ├── nginx.conf              # Обязательно
    └── conf.d/
        └── default.conf        # Обязательно
```

---

## Быстрая команда для теста

Если хотите быстро протестировать:

```bash
# На сервере выполните:
cd ~
git clone <URL> securisk
cd securisk
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker
docker compose up -d
```

---

## Следующие шаги после установки

1. ✅ Откройте http://your-server-ip
2. ✅ Войдите (admin/admin123)
3. ✅ Смените пароль администратора
4. ✅ Настройте firewall (если нужно)
5. ✅ Настройте HTTPS (для production)
6. ✅ Настройте backup (scripts/backup.sh)

---

**Готово! SecuRisk работает!** 🚀
