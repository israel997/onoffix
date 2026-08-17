import { IsString, Length } from 'class-validator';
import { NormalizedEmail } from '../../common/decorators/normalized-email.decorator';

export class VerifyOtpDto {
  @NormalizedEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
