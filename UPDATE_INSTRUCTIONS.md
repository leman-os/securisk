# 🔄 Инструкция по обновлению SecuRisk БЕЗ ПОТЕРИ ДАННЫХ

## ✅ Что было исправлено:

1. **MTTA/MTTR/MTTC в часах** - во всех местах (Dashboard, Incidents, таблица)
2. **Выбор столбцов** - в таблице инцидентов можно выбрать, какие столбцы показывать
3. **Фильтры** - по датам, статусу, критичности
4. **Экспорт в CSV** - с учетом выбранных столбцов и фильтров
5. **Исправлена форма Users** - белое окно

---

## 📋 Пошаговая инструкция обновления

### ШАГ 1: Резервное копирование БД (ОБЯЗАТЕЛЬНО!)

```bash
# Подключитесь к серверу
ssh user@your-server

# Создайте backup MongoDB
mongodump --db securisk_db --out /backup/securisk_$(date +%Y%m%d_%H%M%S)

# Или можно сделать полный архив
mongodump --db securisk_db --archive=/backup/securisk_$(date +%Y%m%d_%H%M%S).archive --gzip

# Проверьте, что backup создан
ls -lh /backup/
```

**✅ ВАЖНО:** Без backup НЕ продолжайте!

---

### ШАГ 2: Сохраните текущий код (на всякий случай)

```bash
# Перейдите в директорию проекта
cd /opt/securisk

# Создайте резервную копию
sudo tar -czf /backup/securisk_code_$(date +%Y%m%d_%H%M%S).tar.gz .

# Проверьте размер
ls -lh /backup/securisk_code*.tar.gz
```

---

### ШАГ 3: Остановите frontend (НЕ трогайте backend!)

```bash
# Backend продолжит работать, остановим только frontend если он запущен через supervisor
# Обычно frontend работает как статика через Nginx, поэтому просто обновим файлы

# Проверьте, есть ли frontend в supervisor
sudo supervisorctl status | grep frontend

# Если есть - остановите
sudo supervisorctl stop securisk-frontend
```

---

### ШАГ 4: Обновите код из Git

```bash
cd /opt/securisk

# Сохраните локальные изменения (если есть)
git stash

# Обновите код
git pull origin main

# Если были конфликты - посмотрите
git status
```

---

### ШАГ 5: Обновите Backend

```bash
cd /opt/securisk/backend

# Активируйте виртуальное окружение
source venv/bin/activate

# Обновите зависимости (если нужно)
pip install -r requirements.txt

# Проверьте .env файл - он должен остаться без изменений
cat .env

# Перезапустите backend
sudo supervisorctl restart securisk-backend

# Проверьте статус
sudo supervisorctl status securisk-backend

# Посмотрите логи
sudo supervisorctl tail -50 securisk-backend
```

**✅ Проверьте:** Backend должен запуститься без ошибок

---

### ШАГ 6: Обновите Frontend

```bash
cd /opt/securisk/frontend

# Проверьте .env
cat .env
# Должно быть: REACT_APP_BACKEND_URL=/api

# Установите/обновите зависимости
yarn install

# ВАЖНО: Соберите production версию
yarn build

# Проверьте, что build создан
ls -la build/
```

**✅ Проверьте:** Директория `build/` должна существовать

---

### ШАГ 7: Перезапустите Nginx

```bash
# Проверьте конфигурацию Nginx
sudo nginx -t

# Если всё ок - перезапустите
sudo systemctl reload nginx

# Или
sudo systemctl restart nginx
```

---

### ШАГ 8: Проверка работы

```bash
# 1. Проверьте статус сервисов
sudo systemctl status mongod
sudo systemctl status nginx
sudo supervisorctl status

# 2. Проверьте backend логи
sudo supervisorctl tail -50 securisk-backend

# 3. Проверьте Nginx логи
sudo tail -50 /var/log/nginx/error.log

# 4. Проверьте через curl
curl http://localhost
curl http://localhost/api/docs

# 5. Откройте в браузере
# http://ваш-IP
```

---

### ШАГ 9: Проверка изменений

Откройте приложение в браузере и проверьте:

**1. Dashboard:**
- [ ] MTTA/MTTR/MTTC показывают часы (например: 24ч, 15.28ч)

**2. Страница Инциденты:**
- [ ] Над таблицей есть кнопки "Столбцы" и "Экспорт CSV"
- [ ] Фильтры по датам работают
- [ ] В таблице MTTA/MTTR/MTTC в часах
- [ ] Клик на "Столбцы" - показывает галочки
- [ ] Клик на "Экспорт CSV" - скачивает файл

**3. Страница Пользователи:**
- [ ] Кнопка "Добавить пользователя" открывает форму (не белый экран)

---

## 🔥 Если что-то пошло не так - ОТКАТ

### Откат Backend:

```bash
# Остановите backend
sudo supervisorctl stop securisk-backend

# Вернитесь к предыдущей версии
cd /opt/securisk
git reset --hard HEAD~1

# Перезапустите
sudo supervisorctl start securisk-backend
```

### Откат Frontend:

```bash
cd /opt/securisk
git reset --hard HEAD~1

cd frontend
yarn build

sudo systemctl reload nginx
```

### Восстановление БД:

```bash
# Если нужно восстановить БД
mongorestore --db securisk_db --archive=/backup/securisk_YYYYMMDD_HHMMSS.archive --gzip --drop
```

---

## 📊 Проверка метрик (MTTA/MTTR/MTTC)

### Пример: Как должно быть

**Было (в минутах):**
- MTTA: 1440 мин
- MTTR: 917 мин  
- MTTC: 557 мин

**Стало (в часах):**
- MTTA: 24ч (1440/60)
- MTTR: 15.28ч (917/60)
- MTTC: 9.29ч (557/60)

### Проверка через API:

```bash
# Получите токен
TOKEN=$(curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token')

# Проверьте метрики
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/incidents/metrics/summary | jq

# Должно показать avg_mtta, avg_mttr, avg_mttc в часах
```

---

## 🎯 Краткая команда (если всё понятно)

```bash
# Весь процесс одной командой (для опытных)
cd /opt/securisk && \
mongodump --db securisk_db --archive=/backup/securisk_$(date +%Y%m%d).archive --gzip && \
git pull origin main && \
cd backend && source venv/bin/activate && pip install -r requirements.txt && \
sudo supervisorctl restart securisk-backend && \
cd ../frontend && yarn install && yarn build && \
sudo systemctl reload nginx && \
echo "✅ Обновление завершено!"
```

---

## 💡 Частые проблемы

### Проблема 1: Frontend не обновился

```bash
# Очистите кэш браузера (Ctrl+Shift+R)
# Или проверьте, что build обновлен
ls -lt /opt/securisk/frontend/build/static/js/ | head -5

# Пересоберите
cd /opt/securisk/frontend
rm -rf build
yarn build
sudo systemctl reload nginx
```

### Проблема 2: Backend показывает старые данные

```bash
# Проверьте, что код обновился
cd /opt/securisk/backend
git log -1

# Перезапустите с force
sudo supervisorctl stop securisk-backend
sleep 2
sudo supervisorctl start securisk-backend
```

### Проблема 3: MTTA/MTTR/MTTC всё ещё в минутах

```bash
# Проверьте код backend
grep -n "mtta_values.append" /opt/securisk/backend/server.py

# Должно быть: mtta_values.append(incident['mtta'] / 60)
# Если нет деления на 60 - код не обновился

# Проверьте frontend
grep -n "incident.mtta" /opt/securisk/frontend/src/pages/Incidents.jsx

# Должно быть: {(incident.mtta / 60).toFixed(2)}ч
```

---

## ✅ Финальный чеклист

После обновления проверьте:

- [ ] Backup БД создан
- [ ] Backend запущен без ошибок
- [ ] Frontend собран (build/ существует)
- [ ] Nginx перезапущен
- [ ] Приложение открывается в браузере
- [ ] Dashboard показывает MTTA/MTTR/MTTC в часах
- [ ] Таблица инцидентов показывает часы
- [ ] Кнопки "Столбцы" и "Экспорт CSV" работают
- [ ] Фильтры по датам работают
- [ ] Форма добавления пользователя открывается
- [ ] Данные сохранились

---

## 📞 Если нужна помощь

1. Посмотрите логи:
```bash
sudo supervisorctl tail -100 securisk-backend stderr
sudo tail -100 /var/log/nginx/error.log
```

2. Проверьте, что MongoDB работает:
```bash
mongosh securisk_db --eval "db.stats()"
```

3. Сделайте screenshot ошибки и опишите проблему

---

**Обновление должно занять 5-10 минут. Удачи! 🚀**
