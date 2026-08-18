import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PrioriteTache } from '@prisma/client';

export class UpdateTacheDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Date cible du rituel quotidien (format YYYY-MM-DD), ou null pour la retirer. */
  @IsOptional()
  @IsDateString()
  dateCible?: string | null;

  /** Déplace la tâche vers un autre Subject (groupe) du même bureau. */
  @IsOptional()
  @IsString()
  conversationId?: string | null;

  @IsOptional()
  @IsEnum(PrioriteTache)
  priorite?: PrioriteTache;

  /** Charge estimée en minutes, ou null pour la retirer. */
  @IsOptional()
  @IsInt()
  @Min(0)
  dureeEstimeeMinutes?: number | null;
}
