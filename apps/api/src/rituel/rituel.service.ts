import { Injectable } from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import { todayDate } from '../common/date.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RituelService {
  constructor(private readonly prisma: PrismaService) {}

  /** Synthèse quotidienne du bureau : remplace une partie du DSM. */
  async getDailyBrief(bureauId: string) {
    const [taches, blocagesActifs] = await Promise.all([
      this.prisma.tache.findMany({
        where: { projet: { bureauId } },
        select: { id: true, titre: true, statut: true, sante: true, dateCible: true },
      }),
      this.prisma.tacheBlocage.findMany({
        where: { dateFin: null, tache: { projet: { bureauId } } },
        include: {
          tache: { select: { id: true, titre: true } },
          responsable: { select: { id: true, nom: true } },
        },
        orderBy: { dateDebut: 'asc' },
      }),
    ]);

    const termine = taches.filter((t) => t.statut === 'VALIDE').length;
    const bloque = taches.filter((t) => t.sante === 'BLOQUEE').length;
    const nonCommence = taches.filter((t) => t.statut === 'A_FAIRE').length;
    const enCours = taches.length - termine - nonCommence;
    const aRisque = taches
      .filter((t) => t.sante === 'A_RISQUE')
      .map((t) => ({ id: t.id, titre: t.titre }));

    // % du jour = tâches du jour validées / tâches du jour (dateCible = aujourd'hui),
    // sur le seul statut du workflow — plus de double-case de rituel.
    const today = todayDate();
    const dujour = taches.filter(
      (t) =>
        t.dateCible && t.dateCible.toISOString().slice(0, 10) === today.toISOString().slice(0, 10),
    );
    const dujourTermine = dujour.filter((t) => t.statut === 'VALIDE').length;

    return {
      date: today.toISOString().slice(0, 10),
      termine,
      enCours,
      bloque,
      aRisque,
      blocagesActifs: blocagesActifs.map((b) => ({
        id: b.id,
        type: b.type,
        cause: b.cause,
        tache: b.tache,
        responsable: b.responsable,
        depuis: b.dateDebut,
      })),
      pourcentageRituel:
        dujour.length === 0 ? null : Math.round((dujourTermine / dujour.length) * 100),
    };
  }

  /**
   * Qui a validé quoi aujourd'hui, groupé par personne — vue purement informative
   * pour Daily check-in. Un admin voit tous les bureaux de l'organisation, un membre
   * simple seulement ceux dont il fait partie (jamais les autres).
   */
  async getValidationsAujourdhui(user: AuthenticatedUser) {
    const debut = todayDate();
    const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000);

    const bureauIds =
      user.roleGlobal === RoleGlobal.ADMIN
        ? (
            await this.prisma.bureau.findMany({
              where: { organisationId: user.organisationId },
              select: { id: true },
            })
          ).map((b) => b.id)
        : (
            await this.prisma.userBureau.findMany({
              where: { userId: user.userId },
              select: { bureauId: true },
            })
          ).map((m) => m.bureauId);

    if (bureauIds.length === 0) return [];

    const taches = await this.prisma.tache.findMany({
      where: {
        statut: 'VALIDE',
        dateValidation: { gte: debut, lt: fin },
        projet: { bureauId: { in: bureauIds } },
        assigneAId: { not: null },
      },
      select: { id: true, titre: true, assigneA: { select: { id: true, nom: true } } },
      orderBy: { dateValidation: 'desc' },
    });

    const parPersonne = new Map<
      string,
      { user: { id: string; nom: string }; taches: { id: string; titre: string }[] }
    >();
    for (const t of taches) {
      if (!t.assigneA) continue;
      if (!parPersonne.has(t.assigneA.id)) {
        parPersonne.set(t.assigneA.id, { user: t.assigneA, taches: [] });
      }
      parPersonne.get(t.assigneA.id)!.taches.push({ id: t.id, titre: t.titre });
    }
    return Array.from(parPersonne.values());
  }
}
