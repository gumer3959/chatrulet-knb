/* 
=== ИСТОРИЯ РАЗРАБОТКИ ===
v1.0 - Node.js сервер для Railway деплоя

=== АРХИТЕКТУРНЫЕ РЕШЕНИЯ ===
- Express.js: стандарт для Node.js веб-серверов
- CORS: для кроссдоменных запросов
- Статические файлы: простая раздача через express.static

=== ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ ===
- HTTPS: Railway автоматически предоставляет SSL
- WebRTC: будет работать корректно с HTTPS на Railway
*/

const express = require('express');
const cors = require('cors');
const path = require('path');

// РЕШЕНИЕ: Express сервер для совместимости с Railway
// АЛЬТЕРНАТИВА: Могли бы использовать встроенный http модуль, но Express проще
// ПРОБЛЕМА: Нужен надежный веб-сервер для продакшена

const app = express();
const PORT = process.env.PORT || 3000;

// ВНИМАНИЕ: CORS нужен для WebRTC в продакшене
// ТЕСТИРОВАНО: Работает с Railway HTTPS
app.use(cors({
    origin: true,
    credentials: true
}));

// Middleware для логирования
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname)));

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check для Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'ChatRulet KNB'
    });
});

// API для получения информации о сервисе
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Чат Рулетка с игрой КНБ',
        version: '1.0.0',
        features: [
            'Видеочат',
            'Игра Камень-Ножницы-Бумага',
            'Текстовый чат',
            'Адаптивный дизайн'
        ],
        environment: process.env.NODE_ENV || 'development'
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        timestamp: new Date().toISOString()
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log(`📱 Готов к деплою на Railway.com`);
    
    if (process.env.RAILWAY_ENVIRONMENT) {
        console.log(`☁️  Railway окружение: ${process.env.RAILWAY_ENVIRONMENT}`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, завершение работы...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Получен сигнал SIGINT, завершение работы...');
    process.exit(0);
});
