import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizedEmail } from '../../common/decorators/normalized-email.decorator';

export class AddOrganisationMembreDto {
  @NormalizedEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  poste?: string;
}
