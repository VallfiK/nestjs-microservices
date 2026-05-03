import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { NotificationModule } from '../notification/notification.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [NotificationModule, TelegramModule],
  providers: [ConsumerService],
  exports: [ConsumerService],
})
export class ConsumerModule {}