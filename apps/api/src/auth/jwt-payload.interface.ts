import { RoleGlobal } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  organisationId: string;
  roleGlobal: RoleGlobal;
}
