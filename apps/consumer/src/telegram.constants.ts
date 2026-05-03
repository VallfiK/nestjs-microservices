export const TELEGRAM_CONFIG = {
  get BOT_TOKEN() { return process.env.TELEGRAM_BOT_TOKEN || ''; },
  get CHAT_ID() { return process.env.TELEGRAM_CHAT_ID || ''; },
  API_URL: 'https://api.telegram.org/bot',
};