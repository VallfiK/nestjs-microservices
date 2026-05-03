# NestJS Microservices + RabbitMQ + Telegram

Микросервисная архитектура для асинхронной обработки сообщений с отправкой уведомлений в Telegram.

## Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Клиент    │────▶│  Producer   │────▶│  RabbitMQ   │────▶│  Consumer   │
│   (HTTP)    │     │  Service    │     │  (Queue)    │     │  Service    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
                                                            ┌─────────────┐
                                                            │   Telegram   │
                                                            └─────────────┘
```

## Структура проекта

```
apps/
├── producer/           # HTTP API для отправки сообщений (port 3000)
│   └── src/
│       ├── messages/   # Controller, Service, DTO
│       └── rabbitmq/   # Подключение и публикация в RabbitMQ
└── consumer/           # Обработка очереди и Telegram (port 3001)
    └── src/
        ├── consumer/   # Слушает RabbitMQ
        ├── notification/
        ├── telegram/   # Отправка уведомлений
        └── telegram-bot/ # Polling бот с кнопками
libs/shared/            # Общие DTO и константы
```

---

## Требования

- Node.js 18+
- Docker и Docker Compose
- Telegram Bot Token (от [@BotFather](https://t.me/BotFather))

---

## Установка и запуск

### 1. Клонирование и установка зависимостей

```bash
git clone <repository-url>
cd nestjs-microservices
npm install
```

### 2. Настройка переменных окружения

Создай файл `.env` в корне проекта:

```env
# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE=notifications

# Telegram Bot (получи от @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Ports
PORT_PRODUCER=3000
PORT_CONSUMER=3001
```

#### Как получить Telegram Bot Token:
1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Отправь `/newbot`
3. Следуй инструкциям и получи токен (формат: `123456789:ABCdef...`)
4. Добавь бота в свой чат и отправь `/start`

#### Как получить Chat ID:
1. Открой браузер и перейди:
   ```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```
2. Найди поле `chat.id` в ответе

### 3. Запуск RabbitMQ

```bash
# Через Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Или через docker-compose
docker-compose up -d rabbitmq
```

Доступ к RabbitMQ Management UI: http://localhost:15672 (guest/guest)

### 4. Запуск сервисов

**Терминал 1 - Producer:**
```bash
npm run start:producer
```

**Терминал 2 - Consumer:**
```bash
npm run start:consumer
```

### 5. Проверка работы

#### Producer API (отправка сообщений):
```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"Тестовое сообщение\"}"
```

**Ожидаемый ответ:**
```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Swagger документация:
- Producer: http://localhost:3000/api
- Consumer: http://localhost:3001/api

---

## Telegram Bot

Бот поддерживает команды и inline-кнопки:

| Команда | Описание |
|---------|----------|
| `/start` | Показать клавиатуру с кнопками |
| `/help` | Список команд |

### Inline кнопки:

| Кнопка | Действие |
|--------|----------|
| ✅ Проверка связи | Отправляет "Проверка связи успешна" |
| ❌ Симуляция ошибки | Отправляет "Симуляция ошибки" |

---

## Запуск через Docker Compose

### 1. Сборка и запуск всех сервисов:

```bash
docker-compose up --build
```

### 2. Проверка статуса:

```bash
docker-compose ps
```

### 3. Просмотр логов:

```bash
docker-compose logs -f producer
docker-compose logs -f consumer
```

---

## Тесты

```bash
# Все тесты (unit)
npm test

# Тесты с покрытием
npm run test:cov

# e2e тесты (требует запущенного RabbitMQ)
npm run test:e2e
```

---

## Структура RabbitMQ

### Exchanges:
- `notifications_exchange` (direct) - основной exchange
- `notifications_exchange_dlx` (direct) - dead letter exchange

### Queues:
- `notifications` - основная очередь сообщений
- `notifications_dlq` - dead letter queue для неудачных сообщений

### Message Flow:
```
Producer → notifications_exchange → notifications queue → Consumer → Telegram
                                    │
                                    └── (on nack) → DLQ
```

---

## Troubleshooting

### Очередь не существует
```bash
docker exec rabbitmq rabbitmqctl delete_queue notifications
# Перезапусти producer
```

### Consumer не получает сообщения
```bash
# Проверь количество consumers
docker exec rabbitmq rabbitmqctl list_queues name messages consumers
```

### Telegram не работает (401)
- Проверь правильность токена в `.env`
- Убедись что бот добавлен в чат

---

## Скриншоты

### Скриншот 1: Структура проекта
<!-- [Сюда вставить скриншот структуры проекта] -->

### Скриншот 2: Запуск Producer и Consumer
<!-- [Сюда вставить скриншот запущенных сервисов] -->

### Скриншот 3: Отправка сообщения через curl
<!-- [Сюда вставить скриншот curl запроса и ответа] -->

### Скриншот 4: Swagger документация
<!-- [Сюда вставить скриншот Swagger UI] -->

### Скриншот 5: Telegram бот с кнопками
<!-- [Сюда вставить скриншот бота с inline кнопками] -->

### Скриншот 6: RabbitMQ Management
<!-- [Сюда вставить скриншот RabbitMQ UI] -->

---

## Лицензия

MIT