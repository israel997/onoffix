import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

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
}
