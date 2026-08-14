import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleBureau, RoleGlobal } from '@prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { CreateProjetTacheDto } from './dto/create-projet-tache.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
  conversation: { select: { id: true, nom: true } },
};

@Injectable()
export class ProjetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(bureauId: string, user: AuthenticatedUser, dto: CreateProjetDto) {
    await this.assertManager(bureauId, user);
    return this.prisma.projet.create({
      data: {
        bureauId,
        nom: dto.nom,
        description: dto.description,
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : undefined,
        dateFin: dto.dateFin ? new Date(dto.dateFin) : undefined,
      },
    });
  }

  listForBureau(bureauId: string) {
    return this.prisma.projet.findMany({
      where: { bureauId, estOrganizer: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(projetId: string) {
    return this.prisma.projet.findUniqueOrThrow({
      where: { id: projetId },
      include: {
        taches: { orderBy: { createdAt: 'desc' }, include: TACHE_INCLUDE },
      },
    });
  }

  async update(projetId: string, user: AuthenticatedUser, dto: UpdateProjetDto) {
    const projet = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });
    await this.assertManager(projet.bureauId!, user);

    return this.prisma.projet.update({
      where: { id: projetId },
      data: {
        nom: dto.nom,
        description: dto.description,
        dateDebut:
          dto.dateDebut === undefined ? undefined : dto.dateDebut ? new Date(dto.dateDebut) : null,
        dateFin: dto.dateFin === undefined ? undefined : dto.dateFin ? new Date(dto.dateFin) : null,
        statut: dto.statut,
      },
    });
  }

  async remove(projetId: string, user: AuthenticatedUser) {
    const projet = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });
    await this.assertManager(projet.bureauId!, user);
    await this.prisma.projet.delete({ where: { id: projetId } });
  }

  async createTache(projetId: string, user: AuthenticatedUser, dto: CreateProjetTacheDto) {
    const projet = await this.prisma.projet.findUniqueOrThrow({ where: { id: projetId } });
    await this.assertManager(projet.bureauId!, user);

    if (dto.assigneAId) {
      const membership = await this.prisma.userBureau.findUnique({
        where: { userId_bureauId: { userId: dto.assigneAId, bureauId: projet.bureauId! } },
      });
      if (!membership)
        throw new ForbiddenException('Ce collaborateur ne fait pas partie de ce bureau');
    }

    return this.prisma.tache.create({
      data: {
        projetId,
        titre: dto.titre,
        description: dto.description,
        assigneAId: dto.assigneAId,
        assigneParId: dto.assigneAId ? user.userId : undefined,
        priorite: dto.priorite,
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
        dureeEstimeeMinutes: dto.dureeEstimeeMinutes,
      },
      include: TACHE_INCLUDE,
    });
  }

  /** Statistiques projet : progression, prévu vs réel, retards, blocages, risques. */
  async getStats(projetId: string) {
    const taches = await this.prisma.tache.findMany({
      where: { projetId },
      select: {
        id: true,
        statut: true,
        sante: true,
        dateEcheance: true,
        dureeEstimeeMinutes: true,
        blocages: { where: { dateFin: null }, select: { id: true } },
      },
    });

    const now = new Date();
    const termine = taches.filter((t) => t.statut === 'VALIDE').length;
    const enRetard = taches.filter(
      (t) => t.dateEcheance && t.dateEcheance < now && t.statut !== 'VALIDE',
    ).length;
    const risques = taches.filter((t) => t.sante === 'A_RISQUE').length;
    const blocagesActifs = taches.reduce((sum, t) => sum + t.blocages.length, 0);
    const tempsPrevuMinutes = taches.reduce((sum, t) => sum + (t.dureeEstimeeMinutes ?? 0), 0);

    const tacheIds = taches.map((t) => t.id);
    const sessions =
      tacheIds.length === 0
        ? []
        : await this.prisma.tacheSession.findMany({
            where: { tacheId: { in: tacheIds }, fin: { not: null } },
            select: { debut: true, fin: true },
          });
    const tempsReelMinutes = Math.round(
      sessions.reduce((sum, s) => sum + (s.fin!.getTime() - s.debut.getTime()), 0) / 60000,
    );

    return {
      progression: taches.length === 0 ? null : Math.round((termine / taches.length) * 100),
      tempsPrevuMinutes,
      tempsReelMinutes,
      tachesEnRetard: enRetard,
      blocages: blocagesActifs,
      risques,
    };
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
}
