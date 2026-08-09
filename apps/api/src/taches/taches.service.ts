import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleBureau, RoleGlobal, StatutTache } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
};

@Injectable()
export class TachesService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadWithBureau(tacheId: string, organisationId: string) {
    const tache = await this.prisma.tache.findFirst({
      where: { id: tacheId, projet: { bureau: { organisationId } } },
      include: { projet: { select: { bureauId: true } } },
    });
    if (!tache) throw new NotFoundException('Tâche introuvable');
    return tache;
  }

  private async assertManager(bureauId: string, user: AuthenticatedUser) {
    if (user.roleGlobal === RoleGlobal.ADMIN) return;
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    if (!membership || membership.roleDansBureau !== RoleBureau.MANAGER) {
      throw new ForbiddenException('Seul un manager du bureau peut effectuer cette action');
    }
  }

  private async assertBureauMember(bureauId: string, user: AuthenticatedUser) {
    if (user.roleGlobal === RoleGlobal.ADMIN) return;
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de ce bureau');
  }

  async assigner(tacheId: string, user: AuthenticatedUser, assigneeUserId: string) {
    const tache = await this.loadWithBureau(tacheId, user.organisationId);
    await this.assertManager(tache.projet.bureauId, user);

    const assigneeMembership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: assigneeUserId, bureauId: tache.projet.bureauId } },
    });
    if (!assigneeMembership) {
      throw new BadRequestException('Ce collaborateur ne fait pas partie de ce bureau');
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: { assigneAId: assigneeUserId, assigneParId: user.userId },
      include: TACHE_INCLUDE,
    });
  }

  async demarrer(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user.organisationId);
    await this.assertBureauMember(tache.projet.bureauId, user);

    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut démarrer cette tâche');
    }
    const demarrableDepuis: StatutTache[] = [StatutTache.A_FAIRE, StatutTache.A_REVOIR];
    if (!demarrableDepuis.includes(tache.statut)) {
      throw new BadRequestException('Cette tâche ne peut pas être démarrée dans son état actuel');
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.EN_COURS, dateDebut: tache.dateDebut ?? new Date() },
      include: TACHE_INCLUDE,
    });
  }

  async declarer(tacheId: string, user: AuthenticatedUser) {
    const tache = await this.loadWithBureau(tacheId, user.organisationId);
    await this.assertBureauMember(tache.projet.bureauId, user);

    if (tache.assigneAId !== user.userId) {
      throw new ForbiddenException('Seule la personne assignée peut déclarer cette tâche faite');
    }
    if (tache.statut !== StatutTache.EN_COURS) {
      throw new BadRequestException("Il faut d'abord démarrer la tâche avant de la déclarer faite");
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.DECLARE, dateDeclaration: new Date() },
      include: TACHE_INCLUDE,
    });
  }

  async valider(tacheId: string, user: AuthenticatedUser, decision: 'ok' | 'litige') {
    const tache = await this.loadWithBureau(tacheId, user.organisationId);

    const isAssigner = tache.assigneParId === user.userId;
    if (!isAssigner) {
      await this.assertManager(tache.projet.bureauId, user);
    }

    if (tache.statut !== StatutTache.DECLARE) {
      throw new BadRequestException('Cette tâche n’a pas encore été déclarée comme faite');
    }

    if (decision === 'ok') {
      return this.prisma.tache.update({
        where: { id: tacheId },
        data: { statut: StatutTache.VALIDE, dateValidation: new Date(), valideParId: user.userId },
        include: TACHE_INCLUDE,
      });
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data: { statut: StatutTache.A_REVOIR },
      include: TACHE_INCLUDE,
    });
  }
}
