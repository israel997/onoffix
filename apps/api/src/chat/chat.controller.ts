import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleBureau } from '@prisma/client';
import { BureauRole } from '../common/decorators/bureau-role.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BureauRoleGuard } from '../common/guards/bureau-role.guard';
import { StorageService } from '../common/storage.service';
import { assertImageWeight, messageFileMulterOptions } from './chat-file.config';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

const ANY_MEMBER = [RoleBureau.MANAGER, RoleBureau.COLLABORATEUR];

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/messages')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly storage: StorageService,
  ) {}

  @BureauRole(...ANY_MEMBER)
  @Get()
  async list(@Param('bureauId') bureauId: string) {
    const conversation = await this.chatService.ensureConversationForBureau(bureauId);
    return this.chatService.listMessages(conversation.id);
  }

  @BureauRole(...ANY_MEMBER)
  @Post('fichier')
  @UseInterceptors(FileInterceptor('file', messageFileMulterOptions))
  async sendFile(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('contenu') contenu?: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    assertImageWeight(file);
    const url = await this.storage.upload(
      file.buffer,
      'messages',
      file.originalname,
      file.mimetype,
    );
    const conversation = await this.chatService.ensureConversationForBureau(bureauId);
    const message = await this.chatService.createMessage(conversation.id, user.userId, contenu, {
      url,
      nom: file.originalname,
      type: file.mimetype,
      tailleOctets: file.size,
    });
    this.chatGateway.broadcastBureauMessage(bureauId, message);
    return message;
  }
}
