import { RoleGlobal } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  accountId: string;
  organisationId: string;
  roleGlobal: RoleGlobal;
}
