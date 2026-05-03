import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RABBITMQ_CONFIG, RABBITMQ_RETRY_CONFIG } from '../rabbitmq.constants';
import { MessagePayload } from '../message-payload.interface';
import { NotificationService } from '../notification/notification.service';
import { TELEGRAM_CONFIG } from '../telegram.constants';

@Injectable()
export class ConsumerService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly logger = new Logger(ConsumerService.name);
  private isConnected = false;

  constructor(private readonly notificationService: NotificationService) {
    this.logger.log('ConsumerService создан');
    this.logger.log(`Telegram enabled: ${!!TELEGRAM_CONFIG.BOT_TOKEN}, ChatID: ${TELEGRAM_CONFIG.CHAT_ID}`);
  }

  async onModuleInit() {
    await this.connect();
    await this.startConsuming();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    let attempts = 0;
    const maxAttempts = RABBITMQ_RETRY_CONFIG.MAX_RETRIES;

    while (attempts < maxAttempts) {
      try {
        const connectionUrl = `amqp://${RABBITMQ_CONFIG.USER}:${RABBITMQ_CONFIG.PASSWORD}@${RABBITMQ_CONFIG.HOST}:${RABBITMQ_CONFIG.PORT}`;
        this.connection = await amqp.connect(connectionUrl) as unknown as amqp.ChannelModel;
        this.channel = await (this.connection as any).createChannel();

        await this.channel.prefetch(1);

        this.isConnected = true;
        this.logger.log('Подключение к RabbitMQ установлено (Consumer)');

        (this.connection as any).on('error', (err: Error) => {
          this.logger.error('Ошибка подключения к RabbitMQ', err);
          this.isConnected = false;
        });

        (this.connection as any).on('close', () => {
          this.logger.warn('Соединение с RabbitMQ закрыто');
          this.isConnected = false;
          this.reconnect();
        });

        return;
      } catch (error) {
        attempts++;
        const delay = Math.min(
          RABBITMQ_RETRY_CONFIG.INITIAL_DELAY_MS *
            Math.pow(RABBITMQ_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempts - 1),
          RABBITMQ_RETRY_CONFIG.MAX_DELAY_MS,
        );
        this.logger.warn(
          `Попытка подключения ${attempts}/${maxAttempts} не удалась. Повтор через ${delay}мс`,
        );
        if (attempts < maxAttempts) {
          await this.sleep(delay);
        } else {
          this.logger.error('Не удалось подключиться к RabbitMQ после максимальных попыток');
          throw error;
        }
      }
    }
  }

  private async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('Нет подключения к RabbitMQ');
    }

    this.logger.log(`Проверка очереди ${RABBITMQ_CONFIG.QUEUE}...`);

    const queueInfo = await this.channel.checkQueue(RABBITMQ_CONFIG.QUEUE);
    this.logger.log(`Очередь ${RABBITMQ_CONFIG.QUEUE}: messageCount=${queueInfo.messageCount}, consumerCount=${queueInfo.consumerCount}`);

    this.logger.log(`Начало прослушивания очереди: ${RABBITMQ_CONFIG.QUEUE}`);

    await this.channel.consume(
      RABBITMQ_CONFIG.QUEUE,
      async (msg) => {
        if (!msg) {
          this.logger.warn('Получен null message (возможно consumer cancelled)');
          return;
        }

        const messageId = msg.properties.messageId || 'unknown';
        this.logger.log(`Получено сообщение: ${messageId}, deliveryTag: ${msg.fields.deliveryTag}`);

        try {
          const content = msg.content.toString();
          const payload: MessagePayload = JSON.parse(content);

          const result = await this.notificationService.processNotification(payload);

          if (result.success) {
            this.channel?.ack(msg);
            this.logger.log(`Сообщение ${messageId} успешно обработано`);
          } else {
            await this.handleFailedMessage(msg, payload, result.error || 'Unknown error');
          }
        } catch (error) {
          this.logger.error(`Ошибка при обработке сообщения ${messageId}:`, error);
          await this.handleParseError(msg);
        }
      },
      { noAck: false },
    );
  }

  private async handleFailedMessage(
    msg: amqp.ConsumeMessage,
    payload: MessagePayload,
    error: string,
  ): Promise<void> {
    const maxRetries = RABBITMQ_RETRY_CONFIG.MAX_RETRIES;
    const retryCount = (payload.retryCount || 0) + 1;

    if (retryCount < maxRetries) {
      this.logger.warn(
        `Сообщение ${payload.id} не удалось обработать. Попытка ${retryCount}/${maxRetries}. Ошибка: ${error}`,
      );

      const delay = Math.min(
        RABBITMQ_RETRY_CONFIG.INITIAL_DELAY_MS *
          Math.pow(RABBITMQ_RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount - 1),
        RABBITMQ_RETRY_CONFIG.MAX_DELAY_MS,
      );

      await this.sleep(delay);

      const updatedPayload = { ...payload, retryCount };
      const newMsg = Buffer.from(JSON.stringify(updatedPayload));

      this.channel?.publish(RABBITMQ_CONFIG.EXCHANGE, RABBITMQ_CONFIG.ROUTING_KEY, newMsg, {
        persistent: true,
        contentType: 'application/json',
        messageId: payload.id,
      });

      this.channel?.ack(msg);
      this.logger.log(`Сообщение ${payload.id} переотправлено для повторной обработки`);
    } else {
      this.logger.error(
        `Сообщение ${payload.id} не удалось обработать после ${maxRetries} попыток. Отправка в DLQ.`,
      );
      this.channel?.nack(msg, false, false);
    }
  }

  private async handleParseError(msg: amqp.ConsumeMessage): Promise<void> {
    this.logger.error('Не удалось распарсить сообщение. Отправка в DLQ.');
    this.channel?.nack(msg, false, false);
  }

  private async reconnect(): Promise<void> {
    this.logger.log('Попытка переподключения к RabbitMQ...');
    try {
      await this.connect();
      await this.startConsuming();
    } catch (error) {
      this.logger.error('Переподключение не удалось', error);
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
      this.isConnected = false;
      this.logger.log('Отключение от RabbitMQ выполнено');
    } catch (error) {
      this.logger.error('Ошибка при отключении от RabbitMQ', error);
    }
  }
}