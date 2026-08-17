import { IsOptional, IsString } from 'class-validator';
import { NormalizedEmail } from '../../common/decorators/normalized-email.decorator';

export class LoginDto {
  @NormalizedEmail()
  email: string;

  @IsString()
  password: string;

  /** Requis seulement si le compte appartient à plusieurs organisations. */
  @IsOptional()
  @IsString()
  organisationId?: string;
}
