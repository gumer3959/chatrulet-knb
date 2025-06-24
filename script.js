/* 
=== ИСТОРИЯ РАЗРАБОТКИ ===
v1.0 - Начальная версия: Базовый функционал видеочата с игрой КНБ

=== АРХИТЕКТУРНЫЕ РЕШЕНИЯ ===
- Модульная структура: отдельные объекты для видеочата и игры
- Event-driven архитектура: использование событий для связи модулей
- Простое состояние: минимальное управление состоянием без сложных паттернов

=== НЕ РАБОТАЕТ (НЕ ПОВТОРЯТЬ) ===
- Сложные WebRTC библиотеки: создают излишнюю зависимость
- Классы вместо объектов: усложняют простую задачу

=== ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ ===
- WebRTC: требует HTTPS для продакшена
- Симуляция соперника: в реальности нужен сервер для матчинга
*/

// РЕШЕНИЕ: Глобальные переменные для простоты управления состоянием
// АЛЬТЕРНАТИВА: Могли бы использовать модули ES6, но для простой задачи избыточно
// ПРОБЛЕМА: Управление состоянием видеочата и игры

let localStream = null;
let isConnected = false;
let gameActive = false;

// РЕШЕНИЕ: Объект для управления видеочатом
// АЛЬТЕРНАТИВА: Класс, но функциональный подход проще
const VideoChat = {
    // ВНИМАНИЕ: В реальном приложении нужен сигнальный сервер
    // ТЕСТИРОВАНО: Работает с локальной камерой
    
    async init() {
        this.bindEvents();
        this.updateUI();
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
            
            // Симулируем подключение к собеседнику
            this.simulateConnection();
            
        } catch (error) {
            console.error('Ошибка доступа к камере:', error);
            this.showStatus('Ошибка доступа к камере');
        }
    },

    simulateConnection() {
        // ВНИМАНИЕ: Это симуляция - в реальности нужен WebRTC peer connection
        isConnected = true;
        this.showStatus('Подключено! Можете начать игру');
        this.updateUI();
        
        // Показываем игровую секцию
        document.getElementById('gameSection').style.display = 'block';
        
        // Включаем чат
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
    },

    next() {
        // Симулируем поиск нового собеседника
        this.showStatus('Поиск нового собеседника...');
        Game.reset();
        
        setTimeout(() => {
            this.simulateConnection();
        }, 2000);
    },

    stop() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        isConnected = false;
        gameActive = false;
        
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
        
        startBtn.disabled = isConnected;
        nextBtn.disabled = !isConnected;
        stopBtn.disabled = !isConnected;
    },

    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (message && isConnected) {
            this.addMessage('Вы', message);
            input.value = '';
            
            // Симулируем ответ собеседника
            setTimeout(() => {
                const responses = [
                    'Привет!', 'Как дела?', 'Давай играть!', 
                    'Хорошая игра!', 'Еще раз?', 'Круто!'
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                this.addMessage('Собеседник', randomResponse);
            }, 1000 + Math.random() * 2000);
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

// РЕШЕНИЕ: Объект для управления игрой КНБ
// АЛЬТЕРНАТИВА: Интеграция в VideoChat, но разделение ответственности лучше
const Game = {
    playerScore: 0,
    opponentScore: 0,
    playerChoice: null,
    opponentChoice: null,
    
    init() {
        this.bindEvents();
        this.updateScore();
    },

    bindEvents() {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (isConnected && !gameActive) {
                    this.makeChoice(e.target.dataset.choice);
                }
            });
        });
    },

    makeChoice(choice) {
        if (gameActive) return;
        
        gameActive = true;
        this.playerChoice = choice;
        
        // Обновляем UI
        this.updateChoiceDisplay('player', choice);
        this.highlightChoice(choice);
        
        // Симулируем выбор соперника
        setTimeout(() => {
            this.simulateOpponentChoice();
        }, 1000 + Math.random() * 2000);
    },

    simulateOpponentChoice() {
        const choices = ['rock', 'paper', 'scissors'];
        this.opponentChoice = choices[Math.floor(Math.random() * choices.length)];
        
        this.updateChoiceDisplay('opponent', this.opponentChoice);
        
        setTimeout(() => {
            this.determineWinner();
        }, 1000);
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
