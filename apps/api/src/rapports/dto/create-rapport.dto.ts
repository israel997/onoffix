import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRapportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nom: string;

  @IsIn(['GENERAL', 'WEEKLY'])
  type: 'GENERAL' | 'WEEKLY';
}
