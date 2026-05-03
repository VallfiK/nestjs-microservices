import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ description: 'Содержимое сообщения', example: 'Привет!' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Дополнительные метаданные' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class MessageResponseDto {
  @ApiProperty()
  messageId!: string;
  @ApiProperty({ enum: ['queued', 'sent', 'failed'] })
  status!: 'queued' | 'sent' | 'failed';
  @ApiProperty()
  createdAt!: string;
}

export interface MessagePayload {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}