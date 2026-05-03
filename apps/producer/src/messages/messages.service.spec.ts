import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { MessagePayload } from '@nestjs-microservices/shared';

describe('MessagesService', () => {
  let service: MessagesService;
  let rabbitMQService: RabbitMQService;

  const mockRabbitMQService = {
    isConnectionActive: jest.fn(),
    publishMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendToQueue', () => {
    it('should return true when message is sent successfully', async () => {
      const payload: MessagePayload = {
        id: 'test-uuid',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      mockRabbitMQService.isConnectionActive.mockReturnValue(true);
      mockRabbitMQService.publishMessage.mockResolvedValue(true);

      const result = await service.sendToQueue(payload);

      expect(result).toBe(true);
      expect(rabbitMQService.publishMessage).toHaveBeenCalledWith(payload);
    });

    it('should return false when RabbitMQ is not connected', async () => {
      const payload: MessagePayload = {
        id: 'test-uuid',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      mockRabbitMQService.isConnectionActive.mockReturnValue(false);
      mockRabbitMQService.publishMessage.mockResolvedValue(false);

      const result = await service.sendToQueue(payload);

      expect(result).toBe(false);
    });

    it('should return false when publishMessage throws an error', async () => {
      const payload: MessagePayload = {
        id: 'test-uuid',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      mockRabbitMQService.isConnectionActive.mockReturnValue(true);
      mockRabbitMQService.publishMessage.mockRejectedValue(new Error('Connection lost'));

      const result = await service.sendToQueue(payload);

      expect(result).toBe(false);
    });
  });
});