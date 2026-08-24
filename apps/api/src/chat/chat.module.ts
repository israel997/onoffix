import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizerModule } from '../organizer/organizer.module';
import { ChatController } from './chat.controller';
import { DirectMessagesController, MyDirectMessagesController } from './direct-messages.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [JwtModule.register({}), NotificationsModule, forwardRef(() => OrganizerModule)],
  controllers: [ChatController, DirectMessagesController, MyDirectMessagesController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
