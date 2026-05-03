import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id';

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramService],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  describe('sendMessage', () => {
    it('should return error when bot token is not configured', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const result = await service.sendMessage('Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram не настроен');
    });

    it('should return error when chat ID is not configured', async () => {
      delete process.env.TELEGRAM_CHAT_ID;

      const result = await service.sendMessage('Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram не настроен');
    });
  });

  describe('validateBotToken', () => {
    it('should return false when token is empty', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const result = await service.validateBotToken();

      expect(result).toBe(false);
    });
  });
});