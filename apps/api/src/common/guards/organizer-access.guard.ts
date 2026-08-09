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

/** Vérifie que l'utilisateur est admin ou membre invité de l'organizer ciblé par :projetId. */
@Injectable()
export class OrganizerAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const projetId = request.params?.projetId;
    if (!user || !projetId || Array.isArray(projetId)) return false;

    const projet = await this.prisma.projet.findFirst({
      where: { id: projetId, estOrganizer: true, bureau: { organisationId: user.organisationId } },
      select: { id: true },
    });
    if (!projet) throw new NotFoundException('Organizer introuvable');

    if (user.roleGlobal === RoleGlobal.ADMIN) return true;

    const membership = await this.prisma.projetMembre.findUnique({
      where: { projetId_userId: { projetId, userId: user.userId } },
    });
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de cet organizer');

    return true;
  }
}
