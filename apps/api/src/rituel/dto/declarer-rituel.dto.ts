import { IsArray, IsString } from 'class-validator';

export class DeclarerRituelDto {
  @IsArray()
  @IsString({ each: true })
  tacheIds: string[];
}
