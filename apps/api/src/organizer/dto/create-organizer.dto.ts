import { IsString, MinLength } from 'class-validator';

export class CreateOrganizerDto {
  @IsString()
  @MinLength(2)
  nom: string;
}
