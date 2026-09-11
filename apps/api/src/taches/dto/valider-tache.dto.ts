import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ValiderTacheDto {
  @IsIn(['ok', 'litige'])
  decision: 'ok' | 'litige';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  commentaire?: string;
}
