import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMembrePosteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  poste?: string | null;
}
