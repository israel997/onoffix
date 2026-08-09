import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBureauDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nom?: string;
}
