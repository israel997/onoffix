import { IsBoolean } from 'class-validator';

export class VisibiliteRapportDto {
  @IsBoolean()
  prive: boolean;
}
