import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  accountId: string;
  organisationId: string;
  roleGlobal: 'ADMIN' | 'MEMBRE';
  restricted: boolean;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
