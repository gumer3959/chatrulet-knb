# 🚀 Деплой на Railway.com

Пошаговое руководство по развертыванию видеочата с игрой КНБ на Railway.com

## 📋 Предварительные требования

- ✅ Аккаунт на [Railway.com](https://railway.app)
- ✅ Аккаунт на [GitHub](https://github.com) (рекомендуется)
- ✅ Установленный Git на компьютере

## 🎯 Способ 1: Деплой через GitHub (Рекомендуется)

### Шаг 1: Подготовка репозитория

1. **Создайте новый репозиторий на GitHub:**
   - Перейдите на [github.com](https://github.com)
   - Нажмите "New repository"
   - Название: `chatrulet-knb`
   - Сделайте репозиторий публичным
   - Нажмите "Create repository"

2. **Загрузите код в репозиторий:**
   ```bash
   # В папке проекта выполните:
   git init
   git add .
   git commit -m "Initial commit: Видеочат с игрой КНБ"
   git branch -M main
   git remote add origin https://github.com/ВАШ_USERNAME/chatrulet-knb.git
   git push -u origin main
   ```

### Шаг 2: Деплой на Railway

1. **Войдите в Railway:**
   - Перейдите на [railway.app](https://railway.app)
   - Нажмите "Login" и войдите через GitHub

2. **Создайте новый проект:**
   - Нажмите "New Project"
   - Выберите "Deploy from GitHub repo"
   - Найдите и выберите ваш репозиторий `chatrulet-knb`

3. **Настройте проект:**
   - Railway автоматически определит Node.js проект
   - Деплой начнется автоматически
   - Дождитесь завершения (2-3 минуты)

4. **Получите URL:**
   - После успешного деплоя нажмите "View Logs"
   - В разделе "Deployments" найдите ваш URL
   - Или перейдите в "Settings" → "Domains" → "Generate Domain"

## 🎯 Способ 2: Деплой через Railway CLI

### Шаг 1: Установка Railway CLI

```bash
# Windows (PowerShell)
iwr -useb https://railway.app/install.ps1 | iex

# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh
```

### Шаг 2: Авторизация и деплой

```bash
# Авторизация
railway login

# В папке проекта
railway init
railway up
```

## 🎯 Способ 3: Прямая загрузка файлов

1. **Создайте ZIP архив:**
   - Выделите все файлы проекта (кроме `node_modules/`)
   - Создайте ZIP архив

2. **Загрузите на Railway:**
   - В Railway нажмите "New Project"
   - Выберите "Deploy from template"
   - Загрузите ZIP файл

## ⚙️ Настройка переменных окружения (опционально)

В Railway Dashboard → Settings → Variables добавьте:

```
NODE_ENV=production
PORT=3000
```

## 🔧 Проверка деплоя

После успешного деплоя:

1. **Откройте ваш URL** (например: `https://chatrulet-knb-production.up.railway.app`)

2. **Проверьте health check:**
   ```
   https://ваш-домен.railway.app/health
   ```

3. **Проверьте API:**
   ```
   https://ваш-домен.railway.app/api/info
   ```

## 🐛 Решение проблем

### Проблема: "Build failed"
**Решение:**
- Проверьте, что `package.json` содержит правильные зависимости
- Убедитесь, что `server.js` находится в корне проекта

### Проблема: "Application failed to respond"
**Решение:**
- Проверьте логи в Railway Dashboard
- Убедитесь, что сервер слушает порт `process.env.PORT`

### Проблема: WebRTC не работает
**Решение:**
- Railway автоматически предоставляет HTTPS
- Проверьте, что браузер разрешает доступ к камере/микрофону

## 📱 Особенности Railway

### ✅ Преимущества:
- Автоматический HTTPS (SSL)
- Бесплатный план (500 часов в месяц)
- Автоматические деплои при push в GitHub
- Встроенные логи и мониторинг

### ⚠️ Ограничения бесплатного плана:
- 500 часов выполнения в месяц
- Приложение "засыпает" при неактивности
- Ограниченная память и CPU

## 🔄 Обновление приложения

### Через GitHub:
1. Внесите изменения в код
2. Сделайте commit и push
3. Railway автоматически пересоберет приложение

### Через CLI:
```bash
railway up
```

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все файлы загружены
3. Проверьте документацию Railway: [docs.railway.app](https://docs.railway.app)

---

**🎉 Готово!** Ваш видеочат с игрой КНБ теперь доступен в интернете с автоматическим HTTPS!
