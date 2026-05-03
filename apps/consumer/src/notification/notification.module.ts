import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}