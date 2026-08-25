import { IsDateString, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  poste?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  // Petite fiche perso, visible par toute l'organisation (page Members).
  @IsOptional()
  @IsString()
  @MaxLength(120)
  hierarchie?: string;

  @IsOptional()
  @IsDateString()
  dateAnniversaire?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  aime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  naimePas?: string;
}
