import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PrioriteTache } from '@prisma/client';

class ConvertPlanTacheDto {
  @IsString()
  @MinLength(2)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PrioriteTache)
  priorite?: PrioriteTache;

  @IsOptional()
  @IsString()
  assigneAId?: string;
}

export class ConvertPlanDto {
  @IsString()
  @MinLength(2)
  projetNom: string;

  @ValidateNested({ each: true })
  @Type(() => ConvertPlanTacheDto)
  @ArrayMinSize(1)
  taches: ConvertPlanTacheDto[];
}
