import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjetDto {
  @IsString()
  @MinLength(2)
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;
}
