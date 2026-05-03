import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
  error_code?: number;
  description?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  private get chatId(): string {
    return process.env.TELEGRAM_CHAT_ID || '';
  }

  async sendMessage(text: string): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn(`Telegram не настроен: token=${!!this.botToken}, chatId=${!!this.chatId}`);
      return { success: false, error: 'Telegram не настроен' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await axios.post<TelegramResponse>(url, {
        chat_id: this.chatId,
        text: `[Notification] ${text}`,
        parse_mode: 'Markdown',
      });

      if (response.data.ok && response.data.result) {
        this.logger.log(`Сообщение отправлено в Telegram. Message ID: ${response.data.result.message_id}`);
        return {
          success: true,
          messageId: response.data.result.message_id,
        };
      }

      return {
        success: false,
        error: response.data.description || 'Неизвестная ошибка',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.logger.error(`Ошибка при отправке сообщения в Telegram: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async validateBotToken(): Promise<boolean> {
    if (!this.botToken) return false;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const response = await axios.get(url);
      return response.data.ok === true;
    } catch {
      return false;
    }
  }
}