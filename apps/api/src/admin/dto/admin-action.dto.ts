import { IsString, MinLength } from 'class-validator';

/** Confirmation par mot de passe exigée avant une action irréversible (ban, suppression). */
export class AdminActionDto {
  @IsString()
  @MinLength(1)
  password: string;
}
