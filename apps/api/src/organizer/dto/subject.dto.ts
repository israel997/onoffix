import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nom: string;
}
