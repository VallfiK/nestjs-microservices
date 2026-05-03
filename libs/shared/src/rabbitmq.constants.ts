/**
 * Shared константы для RabbitMQ
 */
export const RABBITMQ_CONFIG = {
  HOST: process.env.RABBITMQ_HOST || 'localhost',
  PORT: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
  USER: process.env.RABBITMQ_USER || 'guest',
  PASSWORD: process.env.RABBITMQ_PASSWORD || 'guest',
  QUEUE: process.env.RABBITMQ_QUEUE || 'notifications',
  DEAD_LETTER_QUEUE: 'notifications_dlq',
  EXCHANGE: 'notifications_exchange',
  ROUTING_KEY: 'notification.create',
};

export const RABBITMQ_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 10000,
};