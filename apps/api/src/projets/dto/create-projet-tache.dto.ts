import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PrioriteTache } from '@prisma/client';

export class CreateProjetTacheDto {
  @IsString()
  @MinLength(2)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneAId?: string;

  @IsOptional()
  @IsEnum(PrioriteTache)
  priorite?: PrioriteTache;

  @IsOptional()
  @IsDateString()
  dateEcheance?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dureeEstimeeMinutes?: number;
}
