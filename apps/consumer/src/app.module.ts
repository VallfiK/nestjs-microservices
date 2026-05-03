import { Module } from '@nestjs/common';
import { ConsumerModule } from './consumer/consumer.module';
import { TelegramModule } from './telegram/telegram.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [ConsumerModule, TelegramModule, TelegramBotModule, NotificationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}