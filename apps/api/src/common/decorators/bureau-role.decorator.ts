import { SetMetadata } from '@nestjs/common';
import { RoleBureau } from '@prisma/client';

export const BUREAU_ROLE_KEY = 'bureauRole';
/** Exige ce rôle sur le bureau désigné par le paramètre de route :bureauId. */
export const BureauRole = (...roles: RoleBureau[]) => SetMetadata(BUREAU_ROLE_KEY, roles);
