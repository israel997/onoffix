import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NiveauAlerte, NotificationType, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChatService } from '../chat/chat.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizerService } from '../organizer/organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { RituelsScheduler } from '../queue/rituels.scheduler';
import { AddMembreDto } from './dto/add-membre.dto';
import { CreateBureauDto } from './dto/create-bureau.dto';
import { ReorderBureauxDto } from './dto/reorder-bureaux.dto';
import { UpdateBureauDto } from './dto/update-bureau.dto';
import { UpdateMembreDto } from './dto/update-membre.dto';
import { UpdateParametresDto } from './dto/update-parametres.dto';
import { SetAlerteDto } from './dto/set-alerte.dto';

const MAX_BUREAUX_PAR_ORGANISATION = 10;

const MEMBRE_SELECT = {
  roleDansBureau: true,
  roleInterne: true,
  user: { select: { id: true, nom: true, email: true, photoUrl: true } },
};

const INVITATION_SELECT = {
  id: true,
  roleDansBureau: true,
  roleInterne: true,
  createdAt: true,
  user: { select: { id: true, nom: true, email: true, photoUrl: true } },
};

@Injectable()
export class BureauxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rituelsScheduler: RituelsScheduler,
    private readonly organizerService: OrganizerService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
  ) {}

  async create(organisationId: string, dto: CreateBureauDto) {
    const ordre = await this.prisma.bureau.count({ where: { organisationId } });
    if (ordre >= MAX_BUREAUX_PAR_ORGANISATION) {
      throw new BadRequestException(
        `Une organisation ne peut pas avoir plus de ${MAX_BUREAUX_PAR_ORGANISATION} bureaux`,
      );
    }
    const bureau = await this.prisma.bureau.create({
      data: { organisationId, nom: dto.nom, ordre },
    });
    await this.rituelsScheduler.syncBureau(bureau);

    await this.organizerService.createDefaultForBureau(bureau.id);

    return bureau;
  }

  async findAllForUser(user: AuthenticatedUser) {
    const bureaux =
      user.roleGlobal === RoleGlobal.ADMIN
        ? await this.prisma.bureau.findMany({
            where: { organisationId: user.organisationId },
            orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
            include: { _count: { select: { membres: true } } },
          })
        : (
            await this.prisma.userBureau.findMany({
              where: { userId: user.userId },
              select: { bureau: { include: { _count: { select: { membres: true } } } } },
              orderBy: { bureau: { ordre: 'asc' } },
            })
          ).map((m) => m.bureau);

    return Promise.all(
      bureaux.map(async (bureau) => ({
        ...(await this.resolveAlerte(bureau)),
        unreadCount: await this.chatService.getBureauUnreadCount(bureau.id, user.userId),
        tachesCount: await this.prisma.tache.count({ where: { projet: { bureauId: bureau.id } } }),
      })),
    );
  }

  async findOne(bureauId: string, user: AuthenticatedUser) {
    const bureau = await this.prisma.bureau.findFirst({
      where: { id: bureauId, organisationId: user.organisationId },
      include: { membres: { select: MEMBRE_SELECT } },
    });
    if (!bureau) throw new NotFoundException('Bureau introuvable');
    return this.resolveAlerte(bureau);
  }

  /**
   * Une alerte "Set to Orange/Red" expire d'elle-même à alerteJusqua : pas besoin d'un
   * job planifié, on compare juste à l'heure courante à chaque lecture et on nettoie
   * en base si elle est dépassée.
   */
  private async resolveAlerte<
    T extends { id: string; niveauAlerte: NiveauAlerte; alerteJusqua: Date | null },
  >(bureau: T): Promise<T> {
    if (bureau.niveauAlerte === NiveauAlerte.AUCUNE) return bureau;
    if (bureau.alerteJusqua && bureau.alerteJusqua > new Date()) return bureau;

    await this.prisma.bureau.update({
      where: { id: bureau.id },
      data: { niveauAlerte: NiveauAlerte.AUCUNE, alerteJusqua: null },
    });
    return { ...bureau, niveauAlerte: NiveauAlerte.AUCUNE, alerteJusqua: null };
  }

  async setAlerte(bureauId: string, organisationId: string, dto: SetAlerteDto) {
    await this.assertInOrganisation(bureauId, organisationId);

    if (dto.niveau === NiveauAlerte.AUCUNE) {
      return this.prisma.bureau.update({
        where: { id: bureauId },
        data: { niveauAlerte: NiveauAlerte.AUCUNE, alerteJusqua: null },
      });
    }

    const dureeMs = ((dto.jours ?? 0) * 24 + (dto.heures ?? 0)) * 60 * 60 * 1000;
    if (dureeMs <= 0) {
      throw new BadRequestException('Indiquez une durée (jours et/ou heures) supérieure à zéro');
    }

    return this.prisma.bureau.update({
      where: { id: bureauId },
      data: { niveauAlerte: dto.niveau, alerteJusqua: new Date(Date.now() + dureeMs) },
    });
  }

  async update(bureauId: string, organisationId: string, dto: UpdateBureauDto) {
    await this.assertInOrganisation(bureauId, organisationId);
    return this.prisma.bureau.update({ where: { id: bureauId }, data: dto });
  }

  async updateParametres(bureauId: string, organisationId: string, dto: UpdateParametresDto) {
    await this.assertInOrganisation(bureauId, organisationId);
    const bureau = await this.prisma.bureau.update({ where: { id: bureauId }, data: dto });
    await this.rituelsScheduler.syncBureau(bureau);
    return bureau;
  }

  async setPhoto(bureauId: string, organisationId: string, photoUrl: string | null) {
    await this.assertInOrganisation(bureauId, organisationId);
    return this.prisma.bureau.update({ where: { id: bureauId }, data: { photoUrl } });
  }

  async remove(bureauId: string, organisationId: string) {
    await this.assertInOrganisation(bureauId, organisationId);
    await this.rituelsScheduler.removeBureauJobs(bureauId);
    await this.prisma.bureau.delete({ where: { id: bureauId } });
  }

  async reorder(organisationId: string, dto: ReorderBureauxDto) {
    const bureaux = await this.prisma.bureau.findMany({
      where: { organisationId, id: { in: dto.ordre } },
      select: { id: true },
    });
    if (bureaux.length !== dto.ordre.length) {
      throw new BadRequestException('La liste contient un bureau invalide');
    }

    await this.prisma.$transaction(
      dto.ordre.map((id, index) =>
        this.prisma.bureau.update({ where: { id }, data: { ordre: index } }),
      ),
    );
  }

  /**
   * L'ajout à un bureau exige le consentement du collaborateur visé : ceci crée une
   * invitation en attente (email + notification), l'adhésion réelle n'est créée qu'à
   * son acceptation via acceptInvitation().
   */
  async addMembre(
    bureauId: string,
    organisationId: string,
    dto: AddMembreDto,
    currentUser: AuthenticatedUser,
  ) {
    const bureau = await this.assertInOrganisation(bureauId, organisationId);

    const membre = await this.prisma.user.findFirst({
      where: { email: dto.email, organisationId },
    });
    if (!membre) {
      throw new NotFoundException(
        "Ce collaborateur n'existe pas encore dans l'organisation : ajoutez-le d'abord depuis Membres.",
      );
    }

    const existing = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: membre.id, bureauId } },
    });
    if (existing) {
      throw new ConflictException('Ce collaborateur est déjà membre de ce bureau');
    }

    const pendingInvitation = await this.prisma.bureauInvitation.findUnique({
      where: { bureauId_userId: { bureauId, userId: membre.id } },
    });
    if (pendingInvitation) {
      throw new ConflictException('Une invitation est déjà en attente pour ce collaborateur');
    }

    const [organisation, inviter] = await Promise.all([
      this.prisma.organisation.findUniqueOrThrow({
        where: { id: organisationId },
        select: { nom: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: currentUser.userId },
        select: { nom: true },
      }),
    ]);

    const invitation = await this.prisma.bureauInvitation.create({
      data: {
        bureauId,
        userId: membre.id,
        roleDansBureau: dto.roleDansBureau,
        roleInterne: dto.roleInterne,
      },
      select: INVITATION_SELECT,
    });

    await this.notificationsService.create(
      membre.id,
      NotificationType.INVITATION_BUREAU,
      `You've been invited to join ${bureau.nom}`,
      '/offices',
    );
    await this.emailService.sendBureauInvitationEmail(
      membre.email,
      membre.nom,
      bureau.nom,
      organisation.nom,
      inviter.nom,
    );

    return invitation;
  }

  listInvitations(bureauId: string) {
    return this.prisma.bureauInvitation.findMany({
      where: { bureauId },
      select: INVITATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  listMyInvitations(userId: string) {
    return this.prisma.bureauInvitation.findMany({
      where: { userId },
      select: {
        id: true,
        roleDansBureau: true,
        roleInterne: true,
        createdAt: true,
        bureau: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.bureauInvitation.findFirst({
      where: { id: invitationId, userId },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');

    await this.prisma.$transaction([
      this.prisma.userBureau.create({
        data: {
          userId: invitation.userId,
          bureauId: invitation.bureauId,
          roleDansBureau: invitation.roleDansBureau,
          roleInterne: invitation.roleInterne,
        },
      }),
      this.prisma.bureauInvitation.delete({ where: { id: invitationId } }),
    ]);
  }

  async declineInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.bureauInvitation.findFirst({
      where: { id: invitationId, userId },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    await this.prisma.bureauInvitation.delete({ where: { id: invitationId } });
  }

  async cancelInvitation(bureauId: string, invitationId: string) {
    const invitation = await this.prisma.bureauInvitation.findFirst({
      where: { id: invitationId, bureauId },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    await this.prisma.bureauInvitation.delete({ where: { id: invitationId } });
  }

  async updateMembre(bureauId: string, userId: string, dto: UpdateMembreDto) {
    await this.assertMembership(bureauId, userId);
    await this.prisma.userBureau.update({
      where: { userId_bureauId: { userId, bureauId } },
      data: dto,
    });
    return this.prisma.userBureau.findUniqueOrThrow({
      where: { userId_bureauId: { userId, bureauId } },
      select: MEMBRE_SELECT,
    });
  }

  async removeMembre(bureauId: string, userId: string) {
    await this.assertMembership(bureauId, userId);
    await this.prisma.userBureau.delete({ where: { userId_bureauId: { userId, bureauId } } });
  }

  /** Statistiques d'équipe : progression, charge, respect des délais. */
  async getStats(bureauId: string) {
    const [membres, taches] = await Promise.all([
      this.prisma.userBureau.findMany({ where: { bureauId }, select: { userId: true } }),
      this.prisma.tache.findMany({
        where: { projet: { bureauId } },
        select: {
          statut: true,
          sante: true,
          assigneAId: true,
          dateEcheance: true,
          dateValidation: true,
        },
      }),
    ]);

    const termine = taches.filter((t) => t.statut === 'VALIDE').length;
    const bloque = taches.filter((t) => t.sante === 'BLOQUEE').length;
    const nonCommence = taches.filter((t) => t.statut === 'A_FAIRE').length;
    const enCours = taches.length - termine - bloque - nonCommence;

    const avecEcheance = taches.filter((t) => t.dateEcheance);
    const respecteesDeadline = avecEcheance.filter(
      (t) => t.dateValidation && t.dateEcheance && t.dateValidation <= t.dateEcheance,
    );

    const membresActifs = new Set(
      taches
        .filter((t) => t.assigneAId && (t.statut === 'EN_COURS' || t.statut === 'ACCEPTEE'))
        .map((t) => t.assigneAId),
    );

    return {
      totalTaches: taches.length,
      progression: taches.length === 0 ? null : Math.round((termine / taches.length) * 100),
      tachesTerminees: termine,
      tachesEnCours: enCours,
      tachesBloquees: bloque,
      charge: membres.length === 0 ? null : Math.round((membresActifs.size / membres.length) * 100),
      respectDeadlines:
        avecEcheance.length === 0
          ? null
          : Math.round((respecteesDeadline.length / avecEcheance.length) * 100),
    };
  }

  private async assertInOrganisation(bureauId: string, organisationId: string) {
    const bureau = await this.prisma.bureau.findFirst({
      where: { id: bureauId, organisationId },
    });
    if (!bureau) throw new NotFoundException('Bureau introuvable');
    return bureau;
  }

  private async assertMembership(bureauId: string, userId: string) {
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId, bureauId } },
    });
    if (!membership) throw new ForbiddenException('Ce collaborateur ne fait pas partie du bureau');
    return membership;
  }
}
