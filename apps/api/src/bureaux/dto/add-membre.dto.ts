import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleBureau } from '@prisma/client';
import { NormalizedEmail } from '../../common/decorators/normalized-email.decorator';

export class AddMembreDto {
  /** Doit correspondre à un utilisateur déjà présent dans l'organisation. */
  @NormalizedEmail()
  email: string;

  @IsEnum(RoleBureau)
  roleDansBureau: RoleBureau;

  @IsOptional()
  @IsString()
  roleInterne?: string;
}
