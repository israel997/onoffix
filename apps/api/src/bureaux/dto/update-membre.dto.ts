import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleBureau } from '@prisma/client';

export class UpdateMembreDto {
  @IsOptional()
  @IsEnum(RoleBureau)
  roleDansBureau?: RoleBureau;

  @IsOptional()
  @IsString()
  roleInterne?: string;
}
