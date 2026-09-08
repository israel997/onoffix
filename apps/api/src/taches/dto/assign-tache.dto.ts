import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AssignTacheDto {
  @IsString()
  userId: string;

  /** Remplace l'assigné principal au lieu de l'ajouter en co-assigné s'il y en a déjà un. */
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
