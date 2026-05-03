import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { MessagesService } from './messages.service';
import { CreateMessageDto, MessageResponseDto, MessagePayload } from './dto/create-message.dto';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Отправить сообщение в очередь RabbitMQ' })
  @ApiResponse({ status: 202, description: 'Сообщение принято и отправлено в очередь' })
  async sendMessage(@Body() createMessageDto: CreateMessageDto): Promise<MessageResponseDto> {
    this.logger.log(`Получен запрос на отправку сообщения: ${createMessageDto.content}`);

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    const payload: MessagePayload = {
      id: messageId,
      content: createMessageDto.content,
      metadata: createMessageDto.metadata,
      timestamp,
      retryCount: 0,
    };

    const success = await this.messagesService.sendToQueue(payload);

    if (!success) {
      this.logger.error(`Не удалось отправить сообщение ${messageId} в очередь`);
      throw new Error('Ошибка при отправке сообщения в RabbitMQ');
    }

    this.logger.log(`Сообщение ${messageId} успешно отправлено в очередь`);

    return { messageId, status: 'queued', createdAt: timestamp };
  }
}