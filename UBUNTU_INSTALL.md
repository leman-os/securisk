# 📦 Установка SecuRisk на Ubuntu 24.04

Полная пошаговая инструкция для установки SecuRisk на чистом сервере Ubuntu 24.04.

---

## 📋 Содержание

1. [Требования](#требования)
2. [Автоматическая установка](#автоматическая-установка-рекомендуется)
3. [Ручная установка](#ручная-установка)
4. [Проверка работы](#проверка-работы)
5. [Решение проблем](#решение-проблем)

---

## ✅ Требования

### Минимальные требования к серверу:
- **ОС:** Ubuntu 24.04 LTS (свежая установка)
- **CPU:** 2 ядра
- **RAM:** 4 GB
- **Диск:** 20 GB свободного места
- **Сеть:** Доступ к интернету

### Пользователь:
- Пользователь с правами sudo
- SSH доступ к серверу

---

## 🚀 Автоматическая установка (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Скачайте проект

```bash
sudo apt update
sudo apt install -y git
git clone <URL_РЕПОЗИТОРИЯ> ~/securisk
cd ~/securisk
```

### Шаг 2: Запустите установку

```bash
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

### Шаг 3: Откройте браузер

http://localhost

**Логин:** admin  
**Пароль:** admin123

---

## 🔧 Ручная установка

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release git
```

### 2. Установка Docker

```bash
# Удаление старых версий
sudo apt remove -y docker docker-engine docker.io containerd runc

# Добавление репозитория Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Добавление пользователя
sudo usermod -aG docker $USER
newgrp docker

# Проверка
docker --version
docker compose version
```

### 3. Автозапуск Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 4. Скачивание проекта

```bash
git clone <URL> ~/securisk
cd ~/securisk
```

### 5. Настройка .env

```bash
cp .env.example .env
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
```

### 6. Запуск

```bash
docker compose build
docker compose up -d
```

Подождите 30-60 секунд для запуска всех сервисов.

### 7. Проверка

```bash
docker compose ps
```

Все 4 контейнера должны быть "Up":
- securisk-mongodb
- securisk-backend  
- securisk-frontend
- securisk-nginx

---

## 🧪 Проверка работы

### Контейнеры

```bash
docker compose ps
```

### Логи

```bash
docker compose logs -f
```

### Порты

```bash
sudo netstat -tulpn | grep -E ':80|:3000|:8001|:27017'
```

### Curl тесты

```bash
curl -I http://localhost
curl http://localhost/docs
```

### Браузер

Откройте: http://ВАШ_IP или http://localhost

---

## 🔄 Управление

```bash
# Остановка
docker compose stop

# Запуск
docker compose start

# Перезапуск
docker compose restart

# Логи
docker compose logs -f

# Остановка и удаление
docker compose down
```

---

## 🐛 Решение проблем

### Docker не запускается

```bash
sudo systemctl status docker
sudo systemctl start docker
```

### Порт 80 занят

```bash
sudo netstat -tulpn | grep :80
sudo systemctl stop apache2
sudo systemctl stop nginx
```

### Контейнеры не запускаются

```bash
docker compose logs
docker compose down
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

### 502 Bad Gateway

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose restart
```

### Не можете войти

```bash
docker exec -it securisk-mongodb mongosh securisk_db

db.users.insertOne({
  id: "admin-001",
  username: "admin",
  password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lkjVqKT8RnSm",
  full_name: "Administrator",
  email: "admin@securisk.local",
  role: "Администратор",
  created_at: new Date()
})
```

---

## 🎯 Чек-лист

- [ ] Docker установлен
- [ ] 4 контейнера запущены
- [ ] http://localhost открывается
- [ ] Вход работает (admin/admin123)
- [ ] Пароль изменен
- [ ] Firewall настроен

---

**SecuRisk готов! 🎉**

http://localhost  
admin / admin123
