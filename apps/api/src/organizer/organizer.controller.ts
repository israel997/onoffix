import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { assertImageWeight, messageFileMulterOptions } from '../chat/chat-file.config';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';
import { AddOrganizerMembreDto } from './dto/add-organizer-membre.dto';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { OrganizerService } from './organizer.service';

const ANY_MEMBER = [RoleBureau.MANAGER, RoleBureau.COLLABORATEUR];

@UseGuards(BureauRoleGuard)
@Controller('bureaux/:bureauId/organizers')
export class BureauOrganizersController {
  constructor(private readonly organizerService: OrganizerService) {}

  @BureauRole(...ANY_MEMBER)
  @Post()
  create(
    @Param('bureauId') bureauId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizerDto,
  ) {
    return this.organizerService.create(bureauId, user.organisationId, user.userId, dto);
  }

  @BureauRole(...ANY_MEMBER)
  @Get()
  findAll(@Param('bureauId') bureauId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizerService.findAllForBureau(bureauId, user.organisationId);
  }
}

@UseGuards(OrganizerAccessGuard)
@Controller('organizers/:projetId')
export class OrganizerController {
  constructor(
    private readonly organizerService: OrganizerService,
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  findOne(@Param('projetId') projetId: string) {
    return this.organizerService.findOne(projetId);
  }

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
    await assertImageWeight(file);
    const conversation = await this.chatService.ensureConversationForProjet(projetId);
    const message = await this.chatService.createMessage(conversation.id, user.userId, contenu, {
      url: `/uploads/messages/${file.filename}`,
      nom: file.originalname,
      type: file.mimetype,
      tailleOctets: file.size,
    });
    this.chatGateway.broadcastOrganizerMessage(projetId, message);
    return message;
  }

  @Post('membres')
  addMembre(@Param('projetId') projetId: string, @Body() dto: AddOrganizerMembreDto) {
    return this.organizerService.addMembre(projetId, dto);
  }

  @Delete('membres/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMembre(@Param('projetId') projetId: string, @Param('userId') userId: string) {
    return this.organizerService.removeMembre(projetId, userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('projetId') projetId: string) {
    return this.organizerService.remove(projetId);
  }
}
