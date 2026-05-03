import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RABBITMQ_CONFIG, RABBITMQ_RETRY_CONFIG, MessagePayload } from '../rabbitmq.constants';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly logger = new Logger(RabbitMQService.name);
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
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

        await this.setupQueues();

        this.isConnected = true;
        this.logger.log('Подключение к RabbitMQ установлено');

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

  private async setupQueues(): Promise<void> {
    if (!this.channel) return;

    await this.channel.assertExchange(
      `${RABBITMQ_CONFIG.EXCHANGE}_dlx`,
      'direct',
      { durable: true },
    );

    await this.channel.assertQueue(RABBITMQ_CONFIG.DEAD_LETTER_QUEUE, {
      durable: true,
    });
    await this.channel.bindQueue(
      RABBITMQ_CONFIG.DEAD_LETTER_QUEUE,
      `${RABBITMQ_CONFIG.EXCHANGE}_dlx`,
      RABBITMQ_CONFIG.ROUTING_KEY,
    );

    await this.channel.assertQueue(RABBITMQ_CONFIG.QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': `${RABBITMQ_CONFIG.EXCHANGE}_dlx`,
        'x-dead-letter-routing-key': RABBITMQ_CONFIG.ROUTING_KEY,
      },
    });

    await this.channel.assertExchange(RABBITMQ_CONFIG.EXCHANGE, 'direct', {
      durable: true,
    });
    await this.channel.bindQueue(
      RABBITMQ_CONFIG.QUEUE,
      RABBITMQ_CONFIG.EXCHANGE,
      RABBITMQ_CONFIG.ROUTING_KEY,
    );

    this.logger.log('Очереди RabbitMQ настроены');
  }

  async publishMessage(payload: MessagePayload): Promise<boolean> {
    let attempts = 0;
    const maxAttempts = RABBITMQ_RETRY_CONFIG.MAX_RETRIES;

    while (attempts < maxAttempts) {
      try {
        if (!this.channel || !this.isConnected) {
          throw new Error('Нет подключения к RabbitMQ');
        }

        const messageBuffer = Buffer.from(JSON.stringify(payload));

        const sent = this.channel.publish(
          RABBITMQ_CONFIG.EXCHANGE,
          RABBITMQ_CONFIG.ROUTING_KEY,
          messageBuffer,
          {
            persistent: true,
            contentType: 'application/json',
            messageId: payload.id,
            timestamp: Date.now(),
          },
        );

        if (sent) {
          this.logger.log(`Сообщение ${payload.id} отправлено в очередь`);
          return true;
        }
        throw new Error('Channel write returned false');
      } catch (error) {
        attempts++;
        const delay = Math.min(
          RABBITMQ_RETRY_CONFIG.INITIAL_DELAY_MS *
            Math.pow(RABBITMQ_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempts - 1),
          RABBITMQ_RETRY_CONFIG.MAX_DELAY_MS,
        );

        this.logger.warn(
          `Ошибка отправки сообщения ${payload.id}. Попытка ${attempts}/${maxAttempts}`,
        );

        if (attempts >= maxAttempts) {
          this.logger.error(
            `Не удалось отправить сообщение ${payload.id} после ${maxAttempts} попыток`,
          );
          return false;
        }

        await this.sleep(delay);

        if (!this.isConnected) {
          await this.connect();
        }
      }
    }

    return false;
  }

  private async reconnect(): Promise<void> {
    this.logger.log('Попытка переподключения к RabbitMQ...');
    try {
      await this.connect();
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

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}