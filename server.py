#!/usr/bin/env python3
"""
Простой HTTP сервер для тестирования видеочата
РЕШЕНИЕ: Python встроенный сервер для быстрого тестирования
АЛЬТЕРНАТИВА: Node.js сервер, но Python проще для локального тестирования
ПРОБЛЕМА: Нужен HTTPS для WebRTC, но для начального тестирования HTTP достаточно
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # ВНИМАНИЕ: Добавляем заголовки для работы с медиа
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()

def start_server():
    """Запуск локального сервера для тестирования"""
    
    # Проверяем наличие файлов
    required_files = ['index.html', 'styles.css', 'script.js']
    missing_files = [f for f in required_files if not Path(f).exists()]
    
    if missing_files:
        print(f"❌ Отсутствуют файлы: {', '.join(missing_files)}")
        return
    
    print("🚀 Запуск сервера для видеочата...")
    print(f"📂 Директория: {os.getcwd()}")
    print(f"🌐 URL: http://localhost:{PORT}")
    print("⚠️  Для полной функциональности WebRTC нужен HTTPS")
    print("🛑 Для остановки нажмите Ctrl+C")
    
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"✅ Сервер запущен на порту {PORT}")
            
            # Автоматически открываем браузер
            webbrowser.open(f'http://localhost:{PORT}')
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Сервер остановлен")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Порт {PORT} уже используется")
            print("💡 Попробуйте другой порт или остановите другой сервер")
        else:
            print(f"❌ Ошибка запуска сервера: {e}")

if __name__ == "__main__":
    start_server()
