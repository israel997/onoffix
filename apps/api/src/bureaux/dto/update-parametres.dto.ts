import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { CouleurBureau } from '@prisma/client';

export class UpdateParametresDto {
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'heureDeclaration doit être au format HH:mm' })
  heureDeclaration?: string;

  @IsOptional()
  @IsString()
  fuseauHoraire?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  delaiRelanceMinutes?: number;

  @IsOptional()
  @IsBoolean()
  classementFiabiliteVisible?: boolean;

  @IsOptional()
  @IsEnum(CouleurBureau)
  couleur?: CouleurBureau;
}
