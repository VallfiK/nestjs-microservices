import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { TelegramService } from '../telegram/telegram.service';
import { MessagePayload } from '@nestjs-microservices/shared';

describe('NotificationService', () => {
  let service: NotificationService;
  let telegramService: TelegramService;

  const mockTelegramService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    telegramService = module.get<TelegramService>(TelegramService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification with correct structure', () => {
      const payload: MessagePayload = {
        id: 'test-message-id',
        content: 'Test content',
        timestamp: '2024-01-15T10:30:00.000Z',
        retryCount: 0,
      };

      const notification = service.createNotification(payload);

      expect(notification).toHaveProperty('notificationId');
      expect(notification.messageId).toBe('test-message-id');
      expect(notification.text).toBe('[Notification] Test content');
      expect(notification.scheduledAt).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('processNotification', () => {
    it('should return success when Telegram sends message successfully', async () => {
      const payload: MessagePayload = {
        id: 'test-id',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      mockTelegramService.sendMessage.mockResolvedValue({
        success: true,
        messageId: 123,
      });

      const result = await service.processNotification(payload);

      expect(result.success).toBe(true);
      expect(result.telegramMessageId).toBe(123);
    });

    it('should return error when Telegram fails', async () => {
      const payload: MessagePayload = {
        id: 'test-id',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      mockTelegramService.sendMessage.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      const result = await service.processNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });
});