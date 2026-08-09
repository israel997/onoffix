import { IsString } from 'class-validator';

export class AssignTacheDto {
  @IsString()
  userId: string;
}
