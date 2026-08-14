import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithUser } from '../decorators/current-user.decorator';

/** Réservé aux comptes listés dans SUPER_ADMIN_EMAILS — administration de la plateforme. */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    const account = await this.prisma.account.findUnique({
      where: { id: user.accountId },
      select: { email: true },
    });

    const allowlist = this.configService
      .get<string>('SUPER_ADMIN_EMAILS', 'israellawani.pro@gmail.com')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!account || !allowlist.includes(account.email.toLowerCase())) {
      throw new ForbiddenException('Accès réservé aux administrateurs de la plateforme');
    }

    return true;
  }
}
