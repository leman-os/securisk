# 🚀 SecuRisk - Быстрый старт на Ubuntu 24.04

## Одна команда для установки

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/securisk/main/install-ubuntu.sh | sudo bash
```

## Или пошагово:

### 1. Скачайте проект

```bash
git clone <URL> ~/securisk
cd ~/securisk
```

### 2. Запустите установку

```bash
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

### 3. Откройте браузер

```
http://localhost
```

**Логин:** admin  
**Пароль:** admin123

---

## Управление

```bash
# Статус
docker compose ps

# Логи
docker compose logs -f

# Перезапуск
docker compose restart

# Остановка
docker compose stop

# Запуск
docker compose start
```

---

## Проблемы?

### Контейнеры не запускаются

```bash
docker compose down
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

### Порт 80 занят

```bash
sudo systemctl stop apache2
sudo systemctl stop nginx
docker compose restart
```

### Не можете войти

```bash
docker exec -it securisk-mongodb mongosh securisk_db

db.users.insertOne({
  username: "admin",
  password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lkjVqKT8RnSm",
  full_name: "Administrator",
  role: "Администратор",
  created_at: new Date()
})
```

---

## Что установлено?

✅ Docker + Docker Compose  
✅ MongoDB (база данных)  
✅ FastAPI Backend (Python)  
✅ React Frontend  
✅ Nginx (reverse proxy)  

---

## Порты

- **80** - HTTP (внешний)
- **3000** - Frontend (внутренний)
- **8001** - Backend API (внутренний)
- **27017** - MongoDB (внутренний)

---

## Требования

- Ubuntu 24.04 LTS
- 2 CPU, 4GB RAM
- 20GB диск
- Права sudo

---

**Готово! Ваш SecuRisk работает! 🎉**
