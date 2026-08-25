import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../common/storage.service';
import { assertImageWeight, messageFileMulterOptions } from './chat-file.config';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Controller('me/direct-messages')
export class MyDirectMessagesController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.listMyDirectConversations(user.userId);
  }

  @Get('unread')
  async unread(@CurrentUser() user: AuthenticatedUser) {
    return { hasUnread: await this.chatService.hasUnreadDirectMessages(user.userId) };
  }

  @Post(':otherUserId')
  start(@Param('otherUserId') otherUserId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findOrCreateDirectConversation(
      user.userId,
      otherUserId,
      user.organisationId,
    );
  }
}

@Controller('direct-messages/:conversationId')
export class DirectMessagesController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly storage: StorageService,
  ) {}

  @Get('messages')
  async messages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.chatService.assertDirectAccess(conversationId, user.userId);
    await this.chatService.markDirectConversationRead(conversationId, user.userId);
    return this.chatService.listMessages(conversationId);
  }

  @Post('messages/fichier')
  @UseInterceptors(FileInterceptor('file', messageFileMulterOptions))
  async sendFile(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('contenu') contenu?: string,
    @Body('replyToId') replyToId?: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    await this.chatService.assertDirectAccess(conversationId, user.userId);
    assertImageWeight(file);
    const url = await this.storage.upload(
      file.buffer,
      'messages',
      file.originalname,
      file.mimetype,
    );
    const message = await this.chatService.createMessage(conversationId, user.userId, {
      contenu,
      fichier: { url, nom: file.originalname, type: file.mimetype, tailleOctets: file.size },
      replyToId,
      lien: `/chat/${conversationId}`,
    });
    this.chatGateway.broadcastDmMessage(conversationId, message);
    return message;
  }
}
