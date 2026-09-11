import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RapportJourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  jour: number;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  bonsPoints?: string;

  @IsOptional()
  @IsString()
  pointsNegatifs?: string;

  @IsOptional()
  @IsString()
  objectifs?: string;
}

export class UpdateRapportDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nom?: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RapportJourDto)
  jours?: RapportJourDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedUserIds?: string[];
}
