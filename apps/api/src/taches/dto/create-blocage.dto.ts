import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TypeBlocage } from '@prisma/client';

export class CreateBlocageDto {
  @IsEnum(TypeBlocage)
  type: TypeBlocage;

  // Un blocage sans explication n'aide personne à comprendre ce qui coince.
  @IsString()
  @MinLength(3)
  cause: string;

  @IsOptional()
  @IsString()
  bloquantTacheId?: string;

  @IsOptional()
  @IsString()
  responsableId?: string;
}
