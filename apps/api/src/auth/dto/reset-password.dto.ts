import { IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../common/password.validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}
