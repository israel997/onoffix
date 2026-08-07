import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleBureau, RoleGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BUREAU_ROLE_KEY } from '../decorators/bureau-role.decorator';
import type { RequestWithUser } from '../decorators/current-user.decorator';

/**
 * Vérifie que l'utilisateur a le rôle requis (ex. MANAGER) sur le bureau
 * ciblé par le paramètre de route :bureauId. Un admin d'organisation
 * (roleGlobal ADMIN) passe toujours, cf. 2.2 du cahier des charges.
 */
@Injectable()
export class BureauRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleBureau[]>(BUREAU_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const bureauId = request.params?.bureauId;
    if (!user || !bureauId || Array.isArray(bureauId)) {
      return false;
    }

    if (user.roleGlobal === RoleGlobal.ADMIN) {
      return true;
    }

    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId: user.userId, bureauId } },
    });

    if (!membership || !requiredRoles.includes(membership.roleDansBureau)) {
      throw new ForbiddenException('Rôle insuffisant sur ce bureau');
    }

    return true;
  }
}
