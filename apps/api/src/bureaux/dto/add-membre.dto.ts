import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleBureau } from '@prisma/client';

export class AddMembreDto {
  /** Doit correspondre à un utilisateur déjà présent dans l'organisation. */
  @IsEmail()
  email: string;

  @IsEnum(RoleBureau)
  roleDansBureau: RoleBureau;

  @IsOptional()
  @IsString()
  roleInterne?: string;
}
