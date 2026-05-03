# Архитектура микросервисов Nest.js + RabbitMQ + Telegram

## Обзор

Проект реализует микросервисную архитектуру для асинхронной обработки сообщений и отправки уведомлений в Telegram.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Клиент    │────▶│  Producer   │────▶│  RabbitMQ   │────▶│  Consumer   │
│   (HTTP)    │     │  Service    │     │  (Queue)    │     │  Service    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
                                                            ┌─────────────┐
                                                            │   Telegram   │
                                                            │   Bot API    │
                                                            │ (Notifications)
                                                            └─────────────┘

Двусторонняя связь:
                                    ◀────── /start, /help ──────
                                    ◀────── Inline Buttons ──────
┌─────────────┐                     │
│ Telegram    │─────────────────────┘
│ Bot (Polling)│◀──── Updates ────
└─────────────┘
```

## Компоненты

### 1. Producer Service (Port 3000)

Отвечает за приём HTTP запросов и публикацию сообщений в RabbitMQ.

#### Структура:
```
apps/producer/src/
├── main.ts                    # Точка входа, Swagger настройка
├── app.module.ts              # Главный модуль приложения
├── messages/
│   ├── messages.module.ts    # Модуль управления сообщениями
│   ├── messages.controller.ts # HTTP эндпоинты (POST /messages)
│   ├── messages.service.ts   # Бизнес-логика отправки
│   └── dto/                   # Data Transfer Objects
└── rabbitmq/
    ├── rabbitmq.module.ts     # Модуль RabbitMQ
    └── rabbitmq.service.ts     # Логика подключения и публикации
```

#### Поток данных Producer:
1. Клиент отправляет `POST /messages` с телом `{ content: string, metadata?: object }`
2. MessagesController валидирует входные данные через ValidationPipe
3. MessagesService генерирует UUID и создаёт MessagePayload
4. RabbitMQService публикует сообщение в exchange `notifications_exchange`
5. Возвращается ответ `{ messageId: uuid, status: 'queued', createdAt: timestamp }`

#### Retry механизм в Producer:
- При неудаче публикации - повтор до 3 раз с exponential backoff
- Задержка: 1с → 2с → 4с (max 10с)
- После исчерпания попыток - возврат ошибки клиенту

---

### 2. Consumer Service (Port 3001)

Слушает очередь RabbitMQ и перенаправляет уведомления в Telegram.

#### Структура:
```
apps/consumer/src/
├── main.ts                    # Точка входа
├── app.module.ts              # Главный модуль
├── consumer/
│   ├── consumer.module.ts     # Модуль обработки сообщений
│   └── consumer.service.ts     # Логика потребления из RabbitMQ
├── notification/
│   ├── notification.module.ts # Модуль уведомлений
│   └── notification.service.ts# Бизнес-логика обработки
├── telegram/
│   ├── telegram.module.ts      # Модуль Telegram
│   └── telegram.service.ts     # Отправка через Bot API (outbound notifications)
└── telegram-bot/
    ├── telegram-bot.module.ts  # Модуль Telegram Bot
    └── telegram-bot.service.ts  # Polling + обработка callback кнопок (inbound commands)
```

#### Поток данных Consumer:
1. ConsumerService подключается к RabbitMQ и начинает слушать очередь `notifications`
2. При получении сообщения - парсинг JSON payload
3. NotificationService создаёт уведомление и отправляет в TelegramService
4. TelegramService делает POST запрос к `https://api.telegram.org/bot{TOKEN}/sendMessage`
5. При успехе - `channel.ack(msg)` подтверждение обработки
6. При неудаче - retry с увеличением счётчика или отправка в DLQ

#### Обработка ошибок Consumer:
- **Success**: `channel.ack(msg)` - сообщение удаляется из очереди
- **Retryable error**: Переотправка в очередь с `retryCount + 1` и задержкой
- **Max retries exceeded**: `channel.nack(msg, false, false)` - отправка в Dead Letter Queue

---

### 3. Shared Library

Общие типы и константы для обоих сервисов.

```
libs/shared/src/
├── index.ts                   # Экспорт всех модулей
├── message.dto.ts             # DTO для сообщений
├── notification.dto.ts        # DTO для уведомлений
├── rabbitmq.constants.ts      # Конфигурация RabbitMQ
└── telegram.constants.ts      # Конфигурация Telegram API
```

---

## RabbitMQ Архитектура

### Exchanges и Queues:

```
Exchange: notifications_exchange (type: direct, durable: true)
    │
    ├── Routing Key: notification.create
    └── Queue: notifications (durable: true)
                │ x-dead-letter-exchange: notifications_exchange_dlx

Exchange: notifications_exchange_dlx (type: direct, durable: true)
    │
    └── Queue: notifications_dlq (durable: true)
```

### Message Flow:
```
Producer ──publish──▶ notifications_exchange ──route──▶ notifications queue ──consume──▶ Consumer
                                          │
                                          └── (on nack) ──dlx──▶ notifications_dlq
```

### Message Properties:
- `persistent: true` - сохранение на диск
- `contentType: 'application/json'` - JSON формат
- `messageId` - UUID для идемпотентности
- `timestamp` - время создания

---

## Telegram Integration

### Формат сообщения:
```
[Notification] {content}
```

### Отправка:
```typescript
POST https://api.telegram.org/bot{TOKEN}/sendMessage
{
  "chat_id": "{CHAT_ID}",
  "text": "[Notification] {content}",
  "parse_mode": "Markdown"
}
```

### Ошибки:
- 401 Unauthorized - неверный токен
- 400 Bad Request - неверный chat_id
- 429 Too Many Requests - rate limit

---

## Docker Deployment

### Контейнеры:
1. **rabbitmq** - RabbitMQ 3 с Management UI (port 15672)
2. **producer** - Producer Service (port 3000)
3. **consumer** - Consumer Service (port 3001)

### Переменные окружения:
```yaml
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE=notifications

TELEGRAM_BOT_TOKEN={token}
TELEGRAM_CHAT_ID={chat_id}
```

---

## Принципы архитектуры

### SOLID:
- **S**ingle Responsibility: каждый модуль делает одну вещь
- **O**pen/Closed: расширяем через модули, не изменяем существующие
- **L**iskov Substitution: интерфейсы позволяют подмену реализаций
- **I**nterface Segregation: мелкие DTO вместо крупных объектов
- **D**ependency Inversion: модули зависят от абстракций

### Clean Architecture:
```
Controller ──Service──Repository/Data
   │            │
   ▼            ▼
 DTO      Validation
```

### Идемпотентность:
- Каждое сообщение имеет UUID (`v4`)
- При повторной отправке - то же UUID, что позволяет deduplicate
- Retry с exponential backoff предотвращает thundering herd

---

## Telegram Bot (Polling режим)

### Команды бота:
- `/start` - показывает клавиатуру с кнопками
- `/help` - список команд

### Inline кнопки:
```
[✅ Проверка связи] [❌ Симуляция ошибки]
```

### Callback обработка:
- `check` → Отправляет "✅ Проверка связи успешна!" в тот же чат
- `error` → Отправляет "❌ Симуляция ошибки!" в тот же чат

### Polling механизм:
- Бот использует `getUpdates` с offset для получения обновлений
- Держит соединение открытым с timeout 30 секунд
- Обрабатывает callback_query и отвечает через `answerCallbackQuery`

---

## Swagger Documentation

После запуска:
- Producer: http://localhost:3000/api
- Consumer: http://localhost:3001/api

---

## Тесты

### Unit тесты:
- `MessagesService` - покрытие публикации в RabbitMQ
- `NotificationService` - обработка уведомлений
- `TelegramService` - отправка сообщений

### Запуск:
```bash
npm test
```