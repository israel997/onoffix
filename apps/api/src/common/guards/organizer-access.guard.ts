import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithUser } from '../decorators/current-user.decorator';

/**
 * Vérifie l'accès à l'organizer ciblé par :projetId.
 * - Organizer de bureau : admin ou membre du bureau.
 * - Organizer personnel : strictement le propriétaire, même les admins n'y ont pas accès.
 */
@Injectable()
export class OrganizerAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const projetId = request.params?.projetId;
    if (!user || !projetId || Array.isArray(projetId)) return false;

    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      select: {
        estOrganizer: true,
        bureauId: true,
        proprietaireId: true,
        bureau: { select: { organisationId: true } },
      },
    });
    if (!projet || !projet.estOrganizer) throw new NotFoundException('Organizer introuvable');

    if (projet.proprietaireId) {
      if (projet.proprietaireId !== user.userId) {
        throw new ForbiddenException('Cet organizer est personnel et privé');
      }
      return true;
    }

    if (!projet.bureau || projet.bureau.organisationId !== user.organisationId) {
      throw new NotFoundException('Organizer introuvable');
    }

    if (user.roleGlobal === RoleGlobal.ADMIN) return true;

    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId: projet.bureauId! } },
    });
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de ce bureau');

    return true;
  }
}
