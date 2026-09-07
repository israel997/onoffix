import { IsBoolean } from 'class-validator';

export class ArchiveSubjectDto {
  @IsBoolean()
  archived: boolean;
}
