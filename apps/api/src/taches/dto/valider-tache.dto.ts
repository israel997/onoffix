import { IsIn } from 'class-validator';

export class ValiderTacheDto {
  @IsIn(['ok', 'litige'])
  decision: 'ok' | 'litige';
}
