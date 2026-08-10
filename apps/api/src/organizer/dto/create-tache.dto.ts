import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTacheDto {
  @IsString()
  @MinLength(2)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;
}
