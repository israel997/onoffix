import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  /** Requis seulement si le compte appartient à plusieurs organisations. */
  @IsOptional()
  @IsString()
  organisationId?: string;
}
