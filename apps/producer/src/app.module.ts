import { Module } from '@nestjs/common';
import { MessagesModule } from './messages/messages.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [MessagesModule, RabbitMQModule],
  controllers: [],
  providers: [],
})
export class AppModule {}