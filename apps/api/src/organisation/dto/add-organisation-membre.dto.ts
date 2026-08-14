import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { RoleGlobal } from '@prisma/client';

export class AddOrganisationMembreDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nom: string;

  @IsOptional()
  @IsEnum(RoleGlobal)
  roleGlobal?: RoleGlobal;
}
