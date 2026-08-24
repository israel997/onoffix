import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { ConvertPlanDto } from './dto/convert-plan.dto';
import { CreateTacheDto } from './dto/create-tache.dto';
import { SubjectDto } from './dto/subject.dto';
import { OrganizerScheduler } from './organizer.scheduler';
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
    private readonly organizerScheduler: OrganizerScheduler,
  ) {}

  @Get('subjects')
  listSubjects(@Param('projetId') projetId: string) {
    return this.organizerService.listSubjects(projetId);
  }

  @Post('subjects')
  createSubject(@Param('projetId') projetId: string, @Body() dto: SubjectDto) {
    return this.organizerService.createSubject(projetId, dto.nom);
  }

  @Patch('subjects/:subjectId')
  renameSubject(
    @Param('projetId') projetId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: SubjectDto,
  ) {
    return this.organizerService.renameSubject(projetId, subjectId, dto.nom);
  }

  @Delete('subjects/:subjectId')
  @HttpCode(204)
  async deleteSubject(@Param('projetId') projetId: string, @Param('subjectId') subjectId: string) {
    await this.organizerService.deleteSubject(projetId, subjectId);
  }

  @Get('subjects/:subjectId/messages')
  async messages(@Param('projetId') projetId: string, @Param('subjectId') subjectId: string) {
    await this.chatService.assertSubjectBelongsToProjet(subjectId, projetId);
    return this.chatService.listMessages(subjectId);
  }

  @Post('subjects/:subjectId/messages/fichier')
  @UseInterceptors(FileInterceptor('file', messageFileMulterOptions))
  async sendFile(
    @Param('projetId') projetId: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('contenu') contenu?: string,
    @Body('replyToId') replyToId?: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    await this.chatService.assertSubjectBelongsToProjet(subjectId, projetId);
    assertImageWeight(file);
    const url = await this.storage.upload(
      file.buffer,
      'messages',
      file.originalname,
      file.mimetype,
    );
    const message = await this.chatService.createMessage(subjectId, user.userId, {
      contenu,
      fichier: { url, nom: file.originalname, type: file.mimetype, tailleOctets: file.size },
      replyToId,
    });
    await this.organizerScheduler.scheduleMessageProcessing(message.id);
    this.chatGateway.broadcastOrganizerMessage(subjectId, message);
    return message;
  }

  @Get('subjects/:subjectId/plan')
  proposePlan(@Param('projetId') projetId: string, @Param('subjectId') subjectId: string) {
    return this.organizerService.proposePlan(projetId, subjectId);
  }

  @Post('plan/convertir')
  convertPlan(
    @Param('projetId') projetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConvertPlanDto,
  ) {
    return this.organizerService.convertPlan(projetId, user, dto);
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
