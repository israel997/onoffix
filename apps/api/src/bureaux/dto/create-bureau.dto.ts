import { IsString, MinLength } from 'class-validator';

export class CreateBureauDto {
  @IsString()
  @MinLength(2)
  nom: string;
}
