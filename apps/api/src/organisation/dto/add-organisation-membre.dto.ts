import { IsEmail, IsString, MinLength } from 'class-validator';

export class AddOrganisationMembreDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nom: string;
}
