/*
=== ИСТОРИЯ РАЗРАБОТКИ ===
v1.0 - Node.js сервер для Railway деплоя
v1.1 - Добавлен WebSocket сервер для настоящих видеозвонков

=== АРХИТЕКТУРНЫЕ РЕШЕНИЯ ===
- Express.js: стандарт для Node.js веб-серверов
- Socket.IO: для WebRTC сигнализации и матчинга
- CORS: для кроссдоменных запросов
- Статические файлы: простая раздача через express.static

=== ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ ===
- HTTPS: Railway автоматически предоставляет SSL
- WebRTC: будет работать корректно с HTTPS на Railway
*/

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// РЕШЕНИЕ: Express + Socket.IO для WebRTC сигнализации
// АЛЬТЕРНАТИВА: Могли бы использовать встроенный http модуль, но Express проще
// ПРОБЛЕМА: Нужен надежный веб-сервер и WebSocket для настоящих видеозвонков

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
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

// РЕШЕНИЕ: Система матчинга пользователей для видеочата
// АЛЬТЕРНАТИВА: Могли бы использовать комнаты, но очередь проще
// ПРОБЛЕМА: Соединение случайных пользователей для видеочата

let waitingUsers = []; // Очередь ожидающих пользователей
let activeRooms = new Map(); // Активные комнаты с парами пользователей

// WebSocket обработка для WebRTC сигнализации
io.on('connection', (socket) => {
    console.log(`👤 Пользователь подключился: ${socket.id}`);

    // Поиск собеседника
    socket.on('find-peer', () => {
        console.log(`🔍 Пользователь ${socket.id} ищет собеседника`);

        if (waitingUsers.length > 0) {
            // Есть ожидающий пользователь - создаем пару
            const peer = waitingUsers.shift();
            const roomId = `room_${socket.id}_${peer.id}`;

            // Создаем комнату
            socket.join(roomId);
            peer.join(roomId);

            activeRooms.set(socket.id, { roomId, peerId: peer.id });
            activeRooms.set(peer.id, { roomId, peerId: socket.id });

            // Уведомляем обоих о найденном собеседнике
            socket.emit('peer-found', { peerId: peer.id, roomId });
            peer.emit('peer-found', { peerId: socket.id, roomId });

            console.log(`✅ Создана пара: ${socket.id} ↔ ${peer.id} в комнате ${roomId}`);
        } else {
            // Добавляем в очередь ожидания
            waitingUsers.push(socket);
            socket.emit('waiting-for-peer');
            console.log(`⏳ Пользователь ${socket.id} добавлен в очередь`);
        }
    });

    // WebRTC сигнализация
    socket.on('webrtc-offer', (data) => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.peerId).emit('webrtc-offer', {
                offer: data.offer,
                from: socket.id
            });
        }
    });

    socket.on('webrtc-answer', (data) => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.peerId).emit('webrtc-answer', {
                answer: data.answer,
                from: socket.id
            });
        }
    });

    socket.on('webrtc-ice-candidate', (data) => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.peerId).emit('webrtc-ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    // Сообщения чата
    socket.on('chat-message', (data) => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.peerId).emit('chat-message', {
                message: data.message,
                from: socket.id
            });
        }
    });

    // Игра КНБ
    socket.on('game-choice', (data) => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.peerId).emit('game-choice', {
                choice: data.choice,
                from: socket.id
            });
        }
    });

    // Поиск нового собеседника
    socket.on('find-next-peer', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            // Уведомляем текущего собеседника о разрыве
            socket.to(room.peerId).emit('peer-disconnected');

            // Удаляем из активных комнат
            activeRooms.delete(socket.id);
            activeRooms.delete(room.peerId);

            // Покидаем комнату
            socket.leave(room.roomId);
            io.sockets.sockets.get(room.peerId)?.leave(room.roomId);
        }

        // Начинаем новый поиск
        socket.emit('find-peer');
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
        console.log(`👋 Пользователь отключился: ${socket.id}`);

        // Удаляем из очереди ожидания
        waitingUsers = waitingUsers.filter(user => user.id !== socket.id);

        // Уведомляем собеседника об отключении
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.peerId).emit('peer-disconnected');
            activeRooms.delete(room.peerId);
            activeRooms.delete(socket.id);
        }
    });
});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log(`📱 Готов к деплою на Railway.com`);
    console.log(`🔌 WebSocket сервер активен для видеозвонков`);

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
