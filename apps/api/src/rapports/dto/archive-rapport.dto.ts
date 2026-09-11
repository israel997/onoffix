import { IsBoolean } from 'class-validator';

export class ArchiveRapportDto {
  @IsBoolean()
  archived: boolean;
}
