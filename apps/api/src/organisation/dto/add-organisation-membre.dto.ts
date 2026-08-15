import { IsOptional, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AddOrganisationMembreDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  poste?: string;
}
