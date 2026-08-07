import { SetMetadata } from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleGlobal[]) => SetMetadata(ROLES_KEY, roles);
