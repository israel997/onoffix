import { IsEnum } from 'class-validator';
import { RoleGlobal } from '@prisma/client';

export class UpdateMembreRoleDto {
  @IsEnum(RoleGlobal)
  roleGlobal: RoleGlobal;
}
