import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PrioriteTache } from '@prisma/client';

export class CreateTacheDto {
  @IsString()
  @MinLength(2)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PrioriteTache)
  priorite?: PrioriteTache;
}
