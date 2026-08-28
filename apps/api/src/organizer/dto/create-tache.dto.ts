import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
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

  /** Échéance (date + heure) — utilisée par le calendrier. */
  @IsOptional()
  @IsDateString()
  dateEcheance?: string;

  /** Subject sous lequel ranger la tâche ; omis = bucket "No subject". */
  @IsOptional()
  @IsString()
  conversationId?: string;
}
