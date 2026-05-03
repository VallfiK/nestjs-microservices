import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule as ProducerAppModule } from '../src/app.module';

describe('ProducerService (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProducerAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/messages (POST)', () => {
    it('должен отправить сообщение и вернуть 202', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({ content: 'Тестовое сообщение' })
        .expect(202);

      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('должен вернуть 400 при пустом content', async () => {
      await request(app.getHttpServer())
        .post('/messages')
        .send({})
        .expect(400);
    });

    it('должен принять сообщение с metadata', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({
          content: 'Сообщение с metadata',
          metadata: { source: 'test', priority: 'high' },
        })
        .expect(202);

      expect(response.body.messageId).toBeDefined();
      expect(response.body.status).toBe('queued');
    });

    it('должен вернуть UUID формат для messageId', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({ content: 'Проверка UUID' })
        .expect(202);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.messageId).toMatch(uuidRegex);
    });
  });
});