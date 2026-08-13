import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TypeBlocage } from '@prisma/client';

export class CreateBlocageDto {
  @IsEnum(TypeBlocage)
  type: TypeBlocage;

  @IsOptional()
  @IsString()
  cause?: string;

  @IsOptional()
  @IsString()
  bloquantTacheId?: string;

  @IsOptional()
  @IsString()
  responsableId?: string;
}
