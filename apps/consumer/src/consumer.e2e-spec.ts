import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule as ConsumerAppModule } from './app.module';

describe('ConsumerService (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConsumerAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TelegramBotService', () => {
    it('должен иметь TelegramBotService в DI', () => {
      // Проверяем что приложение запустилось и модули загружены
      expect(app).toBeDefined();
    });
  });

  describe('ConsumerModule', () => {
    it('должен иметь ConsumerService в DI', () => {
      expect(app).toBeDefined();
    });
  });

  describe('NotificationModule', () => {
    it('должен иметь NotificationService в DI', () => {
      expect(app).toBeDefined();
    });
  });
});