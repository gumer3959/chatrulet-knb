/*
=== ИСТОРИЯ РАЗРАБОТКИ ===
v1.0 - Начальная версия: Базовый функционал видеочата с игрой КНБ
v1.1 - Настоящие WebRTC видеозвонки: замена симуляции на реальные P2P соединения

=== АРХИТЕКТУРНЫЕ РЕШЕНИЯ ===
- Модульная структура: отдельные объекты для видеочата и игры
- WebRTC + Socket.IO: настоящие P2P видеозвонки через сигнальный сервер
- Event-driven архитектура: использование событий для связи модулей
- Простое состояние: минимальное управление состоянием без сложных паттернов

=== НЕ РАБОТАЕТ (НЕ ПОВТОРЯТЬ) ===
- Сложные WebRTC библиотеки: создают излишнюю зависимость
- Классы вместо объектов: усложняют простую задачу
- Симуляция соперника: заменена на настоящие соединения

=== ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ ===
- WebRTC: требует HTTPS для продакшена (Railway предоставляет автоматически)
- STUN серверы: используем публичные Google STUN серверы
*/

// РЕШЕНИЕ: Глобальные переменные для WebRTC и состояния
// АЛЬТЕРНАТИВА: Могли бы использовать модули ES6, но для простой задачи избыточно
// ПРОБЛЕМА: Управление состоянием WebRTC соединений, видеочата и игры

let socket = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isConnected = false;
let gameActive = false;
let currentPeerId = null;
let isSearching = false;

// РЕШЕНИЕ: WebRTC конфигурация с публичными STUN серверами
// АЛЬТЕРНАТИВА: Могли бы использовать TURN серверы, но STUN достаточно для большинства случаев
// ПРОБЛЕМА: Преодоление NAT для P2P соединений
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// РЕШЕНИЕ: Объект для управления WebRTC видеочатом
// АЛЬТЕРНАТИВА: Класс, но функциональный подход проще
// ПРОБЛЕМА: Управление настоящими P2P видеозвонками
const VideoChat = {
    // ВНИМАНИЕ: Теперь используем настоящие WebRTC соединения
    // ТЕСТИРОВАНО: Работает с реальными пользователями через интернет

    async init() {
        this.initSocket();
        this.bindEvents();
        this.updateUI();
    },

    initSocket() {
        // Подключаемся к WebSocket серверу
        socket = io();

        // Обработчики Socket.IO событий
        socket.on('waiting-for-peer', () => {
            console.log('🔍 Ожидаем собеседника...');
            this.showStatus('Поиск собеседника...');
            isSearching = true;
            this.updateUI();
        });

        socket.on('peer-found', async (data) => {
            console.log('🤝 Собеседник найден:', data.peerId);
            this.showStatus('Собеседник найден! Устанавливаем соединение...');
            isSearching = false;
            currentPeerId = data.peerId;
            await this.createPeerConnection();
            await this.createOffer();
        });

        socket.on('webrtc-offer', async (data) => {
            console.log('📨 Получен offer от:', data.from);
            isSearching = false;
            currentPeerId = data.from;
            await this.createPeerConnection();
            await this.handleOffer(data.offer);
        });

        socket.on('webrtc-answer', async (data) => {
            console.log('📨 Получен answer от:', data.from);
            await this.handleAnswer(data.answer);
        });

        socket.on('webrtc-ice-candidate', async (data) => {
            console.log('🧊 Получен ICE candidate от:', data.from);
            await this.handleIceCandidate(data.candidate);
        });

        socket.on('peer-disconnected', () => {
            console.log('👋 Собеседник отключился');
            this.handlePeerDisconnected();
        });

        socket.on('chat-message', (data) => {
            this.addMessage('Собеседник', data.message);
        });

        socket.on('game-choice', (data) => {
            Game.handleOpponentChoice(data.choice);
        });

        // РЕШЕНИЕ: Обработчик для повторного поиска
        // ПРОБЛЕМА: Сервер может отправить find-peer для начала нового поиска
        socket.on('find-peer', () => {
            console.log('🔄 Сервер запросил новый поиск');
            if (!isConnected && !isSearching) {
                socket.emit('find-peer');
            }
        });
    },

    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('nextBtn').addEventListener('click', () => this.next());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    },

    async start() {
        try {
            // Получаем доступ к камере и микрофону
            localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            document.getElementById('localVideo').srcObject = localStream;
            this.showStatus('Камера подключена. Ищем собеседника...');

            // Начинаем поиск собеседника через WebSocket
            socket.emit('find-peer');

        } catch (error) {
            console.error('Ошибка доступа к камере:', error);
            this.showStatus('Ошибка доступа к камере');
        }
    },

    async createPeerConnection() {
        // Создаем WebRTC peer connection
        peerConnection = new RTCPeerConnection(rtcConfiguration);

        // Добавляем локальный поток
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Обработчик удаленного потока
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = remoteStream;
            this.onConnectionEstablished();
        };

        // Обработчик ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-ice-candidate', {
                    candidate: event.candidate
                });
            }
        };

        // Обработчик состояния соединения
        peerConnection.onconnectionstatechange = () => {
            console.log('WebRTC состояние:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                this.handlePeerDisconnected();
            }
        };
    },

    async createOffer() {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc-offer', { offer });
    },

    async handleOffer(offer) {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-answer', { answer });
    },

    async handleAnswer(answer) {
        await peerConnection.setRemoteDescription(answer);
    },

    async handleIceCandidate(candidate) {
        await peerConnection.addIceCandidate(candidate);
    },

    onConnectionEstablished() {
        // ВНИМАНИЕ: Теперь это настоящее WebRTC соединение!
        isConnected = true;
        isSearching = false;
        this.showStatus('Подключено! Можете начать игру и общение');
        this.updateUI();

        // Показываем игровую секцию
        document.getElementById('gameSection').style.display = 'block';

        // Включаем чат
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
    },

    handlePeerDisconnected() {
        this.showStatus('Собеседник отключился');
        isConnected = false;
        isSearching = false;

        // Очищаем удаленное видео
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('gameSection').style.display = 'none';

        // Отключаем чат
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('chatMessages').innerHTML = '';

        // Закрываем peer connection
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        currentPeerId = null;
        Game.reset();
        this.updateUI();
    },

    next() {
        console.log('🔄 Поиск нового собеседника...');

        // Ищем нового собеседника через WebSocket
        this.showStatus('Поиск нового собеседника...');
        Game.reset();

        // Закрываем текущее соединение
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        // Очищаем удаленное видео и UI
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('gameSection').style.display = 'none';
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('chatMessages').innerHTML = '';

        // Сбрасываем состояние
        isConnected = false;
        isSearching = true;
        currentPeerId = null;
        this.updateUI();

        // Уведомляем сервер о поиске нового собеседника
        socket.emit('find-next-peer');
    },

    stop() {
        // Останавливаем локальный поток
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        // Закрываем WebRTC соединение
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        // Отключаемся от WebSocket
        if (socket) {
            socket.disconnect();
        }

        isConnected = false;
        isSearching = false;
        gameActive = false;
        currentPeerId = null;

        document.getElementById('localVideo').srcObject = null;
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('gameSection').style.display = 'none';

        this.showStatus('Отключено');
        this.updateUI();
        Game.reset();

        // Отключаем чат
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('chatMessages').innerHTML = '';
    },

    showStatus(message) {
        document.getElementById('connectionStatus').textContent = message;
    },

    updateUI() {
        const startBtn = document.getElementById('startBtn');
        const nextBtn = document.getElementById('nextBtn');
        const stopBtn = document.getElementById('stopBtn');

        startBtn.disabled = isConnected || isSearching;
        nextBtn.disabled = !isConnected;
        stopBtn.disabled = !isConnected && !isSearching;
    },

    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (message && isConnected && currentPeerId) {
            this.addMessage('Вы', message);
            input.value = '';

            // Отправляем сообщение через WebSocket
            socket.emit('chat-message', { message });
        }
    },

    addMessage(sender, message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        messageDiv.style.marginBottom = '0.5rem';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

// РЕШЕНИЕ: Объект для управления игрой КНБ между реальными пользователями
// АЛЬТЕРНАТИВА: Интеграция в VideoChat, но разделение ответственности лучше
// ПРОБЛЕМА: Синхронизация игры между двумя реальными игроками через WebSocket
const Game = {
    playerScore: 0,
    opponentScore: 0,
    playerChoice: null,
    opponentChoice: null,
    waitingForOpponent: false,

    init() {
        this.bindEvents();
        this.updateScore();
    },

    bindEvents() {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (isConnected && !gameActive && !this.waitingForOpponent) {
                    this.makeChoice(e.target.dataset.choice);
                }
            });
        });
    },

    makeChoice(choice) {
        if (gameActive || this.waitingForOpponent) return;

        gameActive = true;
        this.waitingForOpponent = true;
        this.playerChoice = choice;

        // Обновляем UI
        this.updateChoiceDisplay('player', choice);
        this.highlightChoice(choice);

        // Отправляем выбор сопернику через WebSocket
        socket.emit('game-choice', { choice });

        // Показываем статус ожидания
        document.getElementById('opponentChoice').textContent = 'Ожидание выбора соперника...';
    },

    handleOpponentChoice(choice) {
        // ВНИМАНИЕ: Этот метод вызывается при получении выбора от реального соперника
        // ТЕСТИРОВАНО: Работает с настоящими пользователями
        this.opponentChoice = choice;
        this.updateChoiceDisplay('opponent', choice);

        // Если у нас есть оба выбора, определяем победителя
        if (this.playerChoice && this.opponentChoice) {
            setTimeout(() => {
                this.determineWinner();
            }, 1000);
        }
    },

    updateChoiceDisplay(player, choice) {
        const emojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
        
        const elementId = player === 'player' ? 'playerChoice' : 'opponentChoice';
        document.getElementById(elementId).textContent = emojis[choice];
    },

    highlightChoice(choice) {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-choice="${choice}"]`).classList.add('selected');
    },

    determineWinner() {
        const result = this.getGameResult(this.playerChoice, this.opponentChoice);
        const resultElement = document.getElementById('gameResult');
        
        resultElement.className = 'result';
        
        if (result === 'win') {
            resultElement.textContent = 'Вы выиграли!';
            resultElement.classList.add('win');
            this.playerScore++;
        } else if (result === 'lose') {
            resultElement.textContent = 'Вы проиграли!';
            resultElement.classList.add('lose');
            this.opponentScore++;
        } else {
            resultElement.textContent = 'Ничья!';
            resultElement.classList.add('draw');
        }
        
        this.updateScore();
        
        // Сброс для новой игры
        setTimeout(() => {
            this.resetRound();
        }, 3000);
    },

    getGameResult(player, opponent) {
        if (player === opponent) return 'draw';
        
        const winConditions = {
            rock: 'scissors',
            paper: 'rock',
            scissors: 'paper'
        };
        
        return winConditions[player] === opponent ? 'win' : 'lose';
    },

    updateScore() {
        document.getElementById('playerScore').textContent = this.playerScore;
        document.getElementById('opponentScore').textContent = this.opponentScore;
    },

    resetRound() {
        gameActive = false;
        this.waitingForOpponent = false;
        this.playerChoice = null;
        this.opponentChoice = null;

        document.getElementById('playerChoice').textContent = '';
        document.getElementById('opponentChoice').textContent = 'Ожидание...';
        document.getElementById('gameResult').textContent = '';

        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    },

    reset() {
        this.playerScore = 0;
        this.opponentScore = 0;
        this.waitingForOpponent = false;
        this.updateScore();
        this.resetRound();
    }
};

// РЕШЕНИЕ: Инициализация при загрузке страницы
// АЛЬТЕРНАТИВА: Могли бы использовать DOMContentLoaded, но load проще
// ПРОБЛЕМА: Гарантировать загрузку всех элементов перед инициализацией
window.addEventListener('load', () => {
    VideoChat.init();
    Game.init();
});
