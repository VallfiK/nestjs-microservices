/**
 * Shared константы для Telegram API
 */
export const TELEGRAM_CONFIG = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  API_URL: 'https://api.telegram.org/bot',
};

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  error_code?: number;
  description?: string;
}