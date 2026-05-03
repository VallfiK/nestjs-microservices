import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { MessagePayload } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async sendToQueue(payload: MessagePayload): Promise<boolean> {
    this.logger.log(`Подготовка к отправке сообщения ${payload.id}`);

    if (!this.rabbitMQService.isConnectionActive()) {
      this.logger.warn('RabbitMQ не подключен. Попытка переподключения...');
    }

    try {
      const result = await this.rabbitMQService.publishMessage(payload);
      return result;
    } catch (error) {
      this.logger.error(`Ошибка при отправке сообщения ${payload.id}`, error);
      return false;
    }
  }
}