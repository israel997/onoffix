import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../common/password.validator';

export class AddOrganisationMembreDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nom: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}
