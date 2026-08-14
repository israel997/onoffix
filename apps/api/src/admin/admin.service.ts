import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Friction supplémentaire avant une action destructrice (ban, suppression d'organisation) —
// le compte est déjà protégé par SuperAdminGuard, ce mot de passe n'est qu'une double confirmation.
const ADMIN_ACTION_PASSWORD = 'DKQ775@';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private assertActionPassword(password: string) {
    if (password !== ADMIN_ACTION_PASSWORD) {
      throw new ForbiddenException('Mot de passe incorrect');
    }
  }

  async listOrganisations() {
    const organisations = await this.prisma.organisation.findMany({
      orderBy: { dateCreation: 'desc' },
      include: { _count: { select: { users: true } } },
    });

    const ownerIds = organisations.map((o) => o.proprietaireId);
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, nom: true, email: true },
    });
    const ownerById = new Map(owners.map((o) => [o.id, o]));

    return organisations.map((org) => ({
      id: org.id,
      nom: org.nom,
      dateCreation: org.dateCreation,
      membresCount: org._count.users,
      proprietaire: ownerById.get(org.proprietaireId) ?? null,
    }));
  }

  async listMembers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organisation: { select: { nom: true } },
        account: {
          select: { email: true, createdAt: true, pays: true, banned: true, restricted: true },
        },
      },
    });

    return users.map((u) => ({
      userId: u.id,
      accountId: u.accountId,
      nom: u.nom,
      email: u.account.email,
      organisationNom: u.organisation.nom,
      roleGlobal: u.roleGlobal,
      dateInscription: u.account.createdAt,
      pays: u.account.pays,
      banned: u.account.banned,
      restricted: u.account.restricted,
    }));
  }

  async promote(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Membre introuvable');
    return this.prisma.user.update({
      where: { id: userId },
      data: { roleGlobal: RoleGlobal.ADMIN },
    });
  }

  async setBanned(accountId: string, banned: boolean, password?: string) {
    if (banned) this.assertActionPassword(password ?? '');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Compte introuvable');

    await this.prisma.account.update({ where: { id: accountId }, data: { banned } });

    if (banned) {
      const userIds = (
        await this.prisma.user.findMany({ where: { accountId }, select: { id: true } })
      ).map((u) => u.id);
      await this.prisma.refreshToken.updateMany({
        where: { userId: { in: userIds }, revoked: false },
        data: { revoked: true },
      });
    }

    return { accountId, banned };
  }

  async setRestricted(accountId: string, restricted: boolean) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Compte introuvable');

    await this.prisma.account.update({ where: { id: accountId }, data: { restricted } });
    return { accountId, restricted };
  }

  /** Supprime une organisation (cascade) puis les comptes devenus orphelins (aucune autre adhésion). */
  async deleteOrganisation(organisationId: string, password: string) {
    this.assertActionPassword(password);

    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: { users: { select: { accountId: true } } },
    });
    if (!organisation) throw new NotFoundException('Organisation introuvable');

    const accountIds = [...new Set(organisation.users.map((u) => u.accountId))];

    await this.prisma.organisation.delete({ where: { id: organisationId } });

    for (const accountId of accountIds) {
      const remaining = await this.prisma.user.count({ where: { accountId } });
      if (remaining === 0) {
        await this.prisma.account.delete({ where: { id: accountId } });
      }
    }

    return { organisationId };
  }
}
