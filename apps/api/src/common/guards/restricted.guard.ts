import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { RequestWithUser } from '../decorators/current-user.decorator';

/** Un compte "restricted" (modération) ne peut plus que lire — toute écriture est bloquée. */
@Injectable()
export class RestrictedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user?.restricted) return true;
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return true;
    }
    throw new ForbiddenException('Votre compte est restreint en lecture seule');
  }
}
