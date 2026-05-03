import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TelegramService } from '../telegram/telegram.service';
import { MessagePayload } from '../message-payload.interface';

interface NotificationDto {
  notificationId: string;
  messageId: string;
  text: string;
  scheduledAt?: string;
}

interface NotificationResultDto {
  success: boolean;
  telegramMessageId?: number;
  error?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly telegramService: TelegramService) {}

  createNotification(payload: MessagePayload): NotificationDto {
    return {
      notificationId: uuidv4(),
      messageId: payload.id,
      text: `[Notification] ${payload.content}`,
      scheduledAt: payload.timestamp,
    };
  }

  async processNotification(payload: MessagePayload): Promise<NotificationResultDto> {
    this.logger.log(`Обработка уведомления для сообщения ${payload.id}`);

    const notification = this.createNotification(payload);

    const result = await this.telegramService.sendMessage(payload.content);

    if (result.success) {
      this.logger.log(`Уведомление ${notification.notificationId} успешно отправлено`);
      return {
        success: true,
        telegramMessageId: result.messageId,
      };
    }

    this.logger.error(`Ошибка при отправке уведомления ${notification.notificationId}: ${result.error}`);
    return {
      success: false,
      error: result.error,
    };
  }
}