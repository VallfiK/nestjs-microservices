import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    text: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number } };
    data: string;
  };
}

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
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private botToken: string;
  private offset = 0;
  private isRunning = false;

  onModuleInit() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (this.botToken) {
      this.startPolling();
    } else {
      this.logger.warn('Telegram bot token не настроен');
    }
  }

  private async startPolling(): Promise<void> {
    this.isRunning = true;
    this.logger.log('Telegram bot polling запущен');

    while (this.isRunning) {
      try {
        await this.getUpdates();
      } catch (error) {
        this.logger.error('Ошибка polling:', error);
        await this.sleep(5000);
      }
    }
  }

  private async getUpdates(): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.offset}&timeout=30`;

    try {
      const response = await axios.get<TelegramResponse>(url, { timeout: 35000 });

      if (response.data.ok && response.data.result) {
        const updates = response.data.result as unknown as TelegramUpdate[];

        for (const update of updates) {
          this.offset = update.update_id + 1;

          if (update.message) {
            await this.handleMessage(update.message);
          } else if (update.callback_query) {
            await this.handleCallback(update.callback_query);
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        this.logger.warn('Polling timeout, retrying...');
      } else {
        throw error;
      }
    }
  }

  private async handleMessage(message: { chat: { id: number }; text: string }): Promise<void> {
    this.logger.log(`Сообщение от ${message.chat.id}: ${message.text}`);

    if (message.text === '/start') {
      await this.sendKeyboard(message.chat.id, 'Добро пожаловать! Выберите действие:');
    } else if (message.text === '/help') {
      await this.sendMessage(message.chat.id, 'Доступные команды:\n/start - Начать\n/check - Проверка связи\n/error - Симуляция ошибки');
    }
  }

  private async handleCallback(query: { id: string; data: string; message?: { chat: { id: number } }; from?: { id: number } }): Promise<void> {
    // CallbackQuery может прийти либо с message.chat.id, либо без него (inline mode)
    const chatId = query.message?.chat?.id || query.from?.id;
    if (!chatId) {
      this.logger.warn(`Callback без chatId: ${JSON.stringify(query)}`);
      return;
    }

    this.logger.log(`Callback: data=${query.data}, chatId=${chatId}, from=${query.from?.id}`);

    // Отвечаем на callback query сразу (чтобы убрать "часики")
    await this.answerCallback(query.id);

    if (query.data === 'check') {
      await this.sendMessage(chatId, `✅ Проверка связи успешна!\nОтвет отправлен в чат ${chatId}`);
    } else if (query.data === 'error') {
      await this.sendMessage(chatId, `❌ Симуляция ошибки!\nОбработано для чата ${chatId}`);
    }
  }

  private async answerCallback(queryId: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;
    await axios.post(url, { callback_query_id: queryId });
  }

  async sendMessage(chatId: number, text: string): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await axios.post<TelegramResponse>(url, {
        chat_id: chatId,
        text,
      });

      if (response.data.ok) {
        this.logger.log(`Сообщение отправлено в чат ${chatId}`);
        return true;
      }
      this.logger.error(`Telegram error: ${response.data.description}`);
      return false;
    } catch (error) {
      this.logger.error('Ошибка отправки сообщения:', error);
      return false;
    }
  }

  async sendKeyboard(chatId: number, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    this.logger.log(`Отправка клавиатуры в чат ${chatId}`);

    const response = await axios.post(url, {
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Проверка связи', callback_data: 'check' },
            { text: '❌ Симуляция ошибки', callback_data: 'error' },
          ],
        ],
      },
    });

    if (response.data.ok) {
      this.logger.log(`Клавиатура отправлена в чат ${chatId}`);
    } else {
      this.logger.error(`Ошибка отправки клавиатуры: ${response.data.description}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}