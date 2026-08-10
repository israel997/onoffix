import { IsString, MinLength } from 'class-validator';

export class UpdateOrganisationDto {
  @IsString()
  @MinLength(2)
  nom: string;
}
