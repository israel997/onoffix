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
import { OrganizerAccessGuard } from '../common/guards/organizer-access.guard';
import { StorageService } from '../common/storage.service';
import { assertImageWeight, messageFileMulterOptions } from '../chat/chat-file.config';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';
import { CreateTacheDto } from './dto/create-tache.dto';
import { OrganizerService } from './organizer.service';

const ANY_MEMBER = [RoleBureau.MANAGER, RoleBureau.COLLABORATEUR];

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/organizer')
export class BureauOrganizersController {
  constructor(private readonly organizerService: OrganizerService) {}

  @BureauRole(...ANY_MEMBER)
  @Get()
  findOne(@Param('bureauId') bureauId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizerService.findForBureau(bureauId, user.organisationId);
  }
}

@Controller('me/organizer')
export class PersonalOrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Get()
  findOne(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerService.findPersonal(user.userId);
  }
}

@UseGuards(OrganizerAccessGuard)
@Controller('organizers/:projetId')
export class OrganizerController {
  constructor(
    private readonly organizerService: OrganizerService,
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly storage: StorageService,
  ) {}

  @Get('messages')
  async messages(@Param('projetId') projetId: string) {
    const conversation = await this.chatService.ensureConversationForProjet(projetId);
    return this.chatService.listMessages(conversation.id);
  }

  @Post('messages/fichier')
  @UseInterceptors(FileInterceptor('file', messageFileMulterOptions))
  async sendFile(
    @Param('projetId') projetId: string,
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
    const conversation = await this.chatService.ensureConversationForProjet(projetId);
    const message = await this.chatService.createMessage(conversation.id, user.userId, contenu, {
      url,
      nom: file.originalname,
      type: file.mimetype,
      tailleOctets: file.size,
    });
    this.chatGateway.broadcastOrganizerMessage(projetId, message);
    return message;
  }

  @Post('taches')
  createTache(
    @Param('projetId') projetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTacheDto,
  ) {
    return this.organizerService.createTache(projetId, user, dto);
  }
}
