import { IsString, Matches, MinLength } from 'class-validator';
import { NormalizedEmail } from '../../common/decorators/normalized-email.decorator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../common/password.validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  organisationNom: string;

  @IsString()
  @MinLength(2)
  nom: string;

  @NormalizedEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}
