import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { CreateProjetTacheDto } from './dto/create-projet-tache.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';

const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

type EvenementType =
  | 'TACHE_CREEE'
  | 'TACHE_DEMARREE'
  | 'TACHE_DECLAREE'
  | 'TACHE_VALIDEE'
  | 'BLOCAGE_OUVERT'
  | 'BLOCAGE_RESOLU';

interface Evenement {
  date: Date;
  type: EvenementType;
  tacheId: string;
  titre: string;
  detail?: string | null;
}

const TACHE_INCLUDE = {
  assigneA: { select: { id: true, nom: true } },
  assignePar: { select: { id: true, nom: true } },
  valideur: { select: { id: true, nom: true } },
  conversation: { select: { id: true, nom: true } },
};

@Injectable()
export class ProjetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

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

  /**
   * Rapport complet du projet : synthèse exécutive, timeline rejouable jour par jour,
   * évolution quotidienne (replay cumulatif des événements), contribution par membre,
   * blocages, comparatif prévu/réel et analyse narrative générée par IA.
   */
  async genererRapport(projetId: string) {
    const projet = await this.prisma.projet.findUniqueOrThrow({
      where: { id: projetId },
      include: { bureau: { select: { id: true, nom: true } } },
    });

    const taches = await this.prisma.tache.findMany({
      where: { projetId },
      select: {
        id: true,
        titre: true,
        statut: true,
        dateEcheance: true,
        createdAt: true,
        dateDebut: true,
        dateDeclaration: true,
        dateValidation: true,
        dureeEstimeeMinutes: true,
        assigneA: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tacheIds = taches.map((t) => t.id);
    const [blocages, sessions] = await Promise.all([
      this.prisma.tacheBlocage.findMany({
        where: { tacheId: { in: tacheIds } },
        include: {
          responsable: { select: { id: true, nom: true } },
          tache: { select: { id: true, titre: true } },
        },
        orderBy: { dateDebut: 'asc' },
      }),
      this.prisma.tacheSession.findMany({
        where: { tacheId: { in: tacheIds }, fin: { not: null } },
        select: { tacheId: true, userId: true, debut: true, fin: true },
      }),
    ]);

    // ---- Timeline : un événement daté par changement d'état de tâche ou de blocage ----
    const evenements: Evenement[] = [];
    for (const t of taches) {
      evenements.push({ date: t.createdAt, type: 'TACHE_CREEE', tacheId: t.id, titre: t.titre });
      if (t.dateDebut) {
        evenements.push({
          date: t.dateDebut,
          type: 'TACHE_DEMARREE',
          tacheId: t.id,
          titre: t.titre,
        });
      }
      if (t.dateDeclaration) {
        evenements.push({
          date: t.dateDeclaration,
          type: 'TACHE_DECLAREE',
          tacheId: t.id,
          titre: t.titre,
        });
      }
      if (t.dateValidation) {
        evenements.push({
          date: t.dateValidation,
          type: 'TACHE_VALIDEE',
          tacheId: t.id,
          titre: t.titre,
        });
      }
    }
    for (const b of blocages) {
      evenements.push({
        date: b.dateDebut,
        type: 'BLOCAGE_OUVERT',
        tacheId: b.tacheId,
        titre: b.tache.titre,
        detail: b.cause,
      });
      if (b.dateFin) {
        evenements.push({
          date: b.dateFin,
          type: 'BLOCAGE_RESOLU',
          tacheId: b.tacheId,
          titre: b.tache.titre,
          detail: b.cause,
        });
      }
    }
    evenements.sort((a, b) => a.date.getTime() - b.date.getTime());

    const jourDe = (d: Date) => d.toISOString().slice(0, 10);
    const parJour = new Map<string, Evenement[]>();
    for (const e of evenements) {
      const jour = jourDe(e.date);
      if (!parJour.has(jour)) parJour.set(jour, []);
      parJour.get(jour)!.push(e);
    }
    const timeline = [...parJour.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, jourEvenements]) => ({
        date,
        evenements: jourEvenements.map((e) => ({
          type: e.type,
          tacheId: e.tacheId,
          titre: e.titre,
          detail: e.detail ?? null,
        })),
      }));

    // ---- Évolution quotidienne : replay cumulatif jour par jour (rejouable) ----
    const evolutionEquipe: {
      date: string;
      tachesValidees: number;
      tachesDemarrees: number;
      blocagesActifs: number;
    }[] = [];
    for (const jour of timeline) {
      const precedent = evolutionEquipe[evolutionEquipe.length - 1];
      let tachesValidees = precedent?.tachesValidees ?? 0;
      let tachesDemarrees = precedent?.tachesDemarrees ?? 0;
      let blocagesActifs = precedent?.blocagesActifs ?? 0;
      for (const e of jour.evenements) {
        if (e.type === 'TACHE_VALIDEE') tachesValidees++;
        if (e.type === 'TACHE_DEMARREE') tachesDemarrees++;
        if (e.type === 'BLOCAGE_OUVERT') blocagesActifs++;
        if (e.type === 'BLOCAGE_RESOLU') blocagesActifs--;
      }
      evolutionEquipe.push({ date: jour.date, tachesValidees, tachesDemarrees, blocagesActifs });
    }

    // ---- Contribution par membre ----
    const parMembre = new Map<
      string,
      {
        user: { id: string; nom: string };
        tachesAssignees: number;
        tachesTerminees: number;
        tempsReelMinutes: number;
        blocagesRencontres: number;
      }
    >();
    for (const t of taches) {
      if (!t.assigneA) continue;
      if (!parMembre.has(t.assigneA.id)) {
        parMembre.set(t.assigneA.id, {
          user: t.assigneA,
          tachesAssignees: 0,
          tachesTerminees: 0,
          tempsReelMinutes: 0,
          blocagesRencontres: 0,
        });
      }
      const entry = parMembre.get(t.assigneA.id)!;
      entry.tachesAssignees++;
      if (t.statut === 'VALIDE') entry.tachesTerminees++;
    }
    const tacheParId = new Map(taches.map((t) => [t.id, t]));
    for (const b of blocages) {
      const assigneId = tacheParId.get(b.tacheId)?.assigneA?.id;
      if (assigneId && parMembre.has(assigneId)) {
        parMembre.get(assigneId)!.blocagesRencontres++;
      }
    }
    for (const s of sessions) {
      if (parMembre.has(s.userId)) {
        parMembre.get(s.userId)!.tempsReelMinutes += Math.round(
          (s.fin!.getTime() - s.debut.getTime()) / 60000,
        );
      }
    }
    const contributionMembres = [...parMembre.values()].sort(
      (a, b) => b.tachesTerminees - a.tachesTerminees,
    );

    // ---- Blocages (historique complet, actifs et résolus) ----
    const blocagesDetail = blocages.map((b) => ({
      id: b.id,
      type: b.type,
      cause: b.cause,
      tache: b.tache,
      responsable: b.responsable,
      dateDebut: b.dateDebut,
      dateFin: b.dateFin,
      dureeJours: Math.round(
        ((b.dateFin ?? new Date()).getTime() - b.dateDebut.getTime()) / MILLISECONDES_PAR_JOUR,
      ),
    }));

    // ---- Synthèse exécutive + comparatif prévu / réel ----
    const tempsPrevuMinutes = taches.reduce((sum, t) => sum + (t.dureeEstimeeMinutes ?? 0), 0);
    const tempsReelMinutes = Math.round(
      sessions.reduce((sum, s) => sum + (s.fin!.getTime() - s.debut.getTime()), 0) / 60000,
    );
    const tachesTerminees = taches.filter((t) => t.statut === 'VALIDE').length;
    const now = new Date();
    const tachesEnRetard = taches.filter(
      (t) => t.dateEcheance && t.dateEcheance < now && t.statut !== 'VALIDE',
    ).length;
    const progression =
      taches.length === 0 ? null : Math.round((tachesTerminees / taches.length) * 100);

    const joursEntre = (a: Date, b: Date) =>
      Math.round((b.getTime() - a.getTime()) / MILLISECONDES_PAR_JOUR);

    const datesDebut = taches.map((t) => t.dateDebut).filter((d): d is Date => !!d);
    const dateDebutReelle =
      datesDebut.length > 0
        ? new Date(Math.min(...datesDebut.map((d) => d.getTime())))
        : projet.createdAt;

    const projetTermine = taches.length > 0 && tachesTerminees === taches.length;
    const datesValidation = taches.map((t) => t.dateValidation).filter((d): d is Date => !!d);
    const dateFinReelle =
      projetTermine && datesValidation.length > 0
        ? new Date(Math.max(...datesValidation.map((d) => d.getTime())))
        : null;

    const dureePrevueJours =
      projet.dateDebut && projet.dateFin ? joursEntre(projet.dateDebut, projet.dateFin) : null;
    const dureeReelleJours = dateDebutReelle
      ? joursEntre(dateDebutReelle, dateFinReelle ?? now)
      : null;
    const ecartJours =
      dureePrevueJours !== null && dureeReelleJours !== null
        ? dureeReelleJours - dureePrevueJours
        : null;

    // ---- Analyse narrative générée par IA (best-effort, jamais bloquant) ----
    const analyseIa = await this.aiService.genererAnalyseRapport({
      projetNom: projet.nom,
      tachesTotal: taches.length,
      tachesTerminees,
      tachesEnRetard,
      progression,
      dureePrevueJours,
      dureeReelleJours,
      ecartJours,
      blocagesCount: blocages.length,
      blocagesActifs: blocages.filter((b) => !b.dateFin).length,
      contributionMembres: contributionMembres.map((m) => ({
        nom: m.user.nom,
        tachesTerminees: m.tachesTerminees,
        tachesAssignees: m.tachesAssignees,
      })),
    });

    return {
      projet: {
        id: projet.id,
        nom: projet.nom,
        description: projet.description,
        statut: projet.statut,
        dateDebut: projet.dateDebut,
        dateFin: projet.dateFin,
        createdAt: projet.createdAt,
        bureau: projet.bureau,
      },
      syntheseExecutive: {
        tachesTotal: taches.length,
        tachesTerminees,
        tachesEnRetard,
        progression,
        tempsPrevuMinutes,
        tempsReelMinutes,
        ecartTempsMinutes: tempsReelMinutes - tempsPrevuMinutes,
      },
      comparatifPrevuReel: {
        dateDebutPrevue: projet.dateDebut,
        dateFinPrevue: projet.dateFin,
        dateDebutReelle,
        dateFinReelle,
        dureePrevueJours,
        dureeReelleJours,
        ecartJours,
      },
      timeline,
      evolutionEquipe,
      contributionMembres,
      blocages: blocagesDetail,
      analyseNarrative: analyseIa?.narrative ?? null,
      bilan: analyseIa
        ? {
            pointsPositifs: analyseIa.pointsPositifs,
            pointsAmelioration: analyseIa.pointsAmelioration,
            recommandations: analyseIa.recommandations,
          }
        : null,
    };
  }

  private async assertManager(bureauId: string, user: AuthenticatedUser) {
    if (user.roleGlobal === RoleGlobal.ADMIN) return;
    if (user.roleGlobal !== RoleGlobal.MANAGER) {
      throw new ForbiddenException('Seul un manager du bureau peut effectuer cette action');
    }
    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });
    if (!membership) {
      throw new ForbiddenException('Seul un manager du bureau peut effectuer cette action');
    }
  }
}
