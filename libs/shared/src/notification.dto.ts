import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для уведомления в Telegram
 */
export class NotificationDto {
  @ApiProperty({
    description: 'Уникальный идентификатор уведомления',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  notificationId!: string;

  @ApiProperty({
    description: 'ID сообщения из RabbitMQ',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  messageId!: string;

  @ApiProperty({
    description: 'Текст уведомления',
    example: '[Notification] Привет! Это тестовое сообщение.',
  })
  text!: string;

  @ApiPropertyOptional({
    description: 'Время планируемой отправки',
    example: '2024-01-15T10:30:00.000Z',
  })
  scheduledAt?: string;
}

/**
 * DTO для результата отправки уведомления
 */
export class NotificationResultDto {
  @ApiProperty({
    description: 'Успешность отправки',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'ID отправленного сообщения в Telegram',
    example: 123,
  })
  telegramMessageId?: number;

  @ApiProperty({
    description: 'Ошибка при отправке',
    example: null,
  })
  error?: string;
}