import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { NiveauAlerte } from '@prisma/client';

export class SetAlerteDto {
  @IsEnum(NiveauAlerte)
  niveau!: NiveauAlerte;

  @IsOptional()
  @IsInt()
  @Min(0)
  jours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  heures?: number;
}
