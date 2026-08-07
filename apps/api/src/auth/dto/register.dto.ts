import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  organisationNom: string;

  @IsString()
  @MinLength(2)
  nom: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
