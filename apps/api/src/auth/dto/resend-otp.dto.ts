import { NormalizedEmail } from '../../common/decorators/normalized-email.decorator';

export class ResendOtpDto {
  @NormalizedEmail()
  email: string;
}
