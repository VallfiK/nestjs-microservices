import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для создания сообщения
 */
export class CreateMessageDto {
  @ApiProperty({
    description: 'Содержимое сообщения',
    example: 'Привет! Это тестовое сообщение.',
  })
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: 'Дополнительные метаданные',
    example: { source: 'api', priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO для ответа после создания сообщения
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Уникальный идентификатор сообщения (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  messageId!: string;

  @ApiProperty({
    description: 'Статус сообщения',
    enum: ['queued', 'sent', 'failed'],
    example: 'queued',
  })
  status!: 'queued' | 'sent' | 'failed';

  @ApiProperty({
    description: 'Время создания сообщения (ISO string)',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: string;
}

/**
 * DTO для внутреннего сообщения в RabbitMQ
 */
export interface MessagePayload {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}