import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StatutProjet } from '@prisma/client';

export class UpdateProjetDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string | null;

  @IsOptional()
  @IsDateString()
  dateFin?: string | null;

  @IsOptional()
  @IsEnum(StatutProjet)
  statut?: StatutProjet;
}
