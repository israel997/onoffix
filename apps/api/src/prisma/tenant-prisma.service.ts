import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { RequestWithUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from './prisma.service';
import { forOrganisation, ScopedPrismaClient } from './tenant-prisma.factory';

/**
 * Client Prisma pré-scopé à l'organisation de l'utilisateur authentifié
 * (req.user.organisationId, posé par JwtStrategy). Injectable dans tout
 * provider en aval d'un JwtAuthGuard.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  public readonly client: ScopedPrismaClient;

  constructor(@Inject(REQUEST) request: RequestWithUser, prisma: PrismaService) {
    const organisationId = request.user?.organisationId;
    if (!organisationId) {
      throw new UnauthorizedException('Organisation non résolue pour cette requête');
    }
    this.client = forOrganisation(prisma, organisationId);
  }
}
