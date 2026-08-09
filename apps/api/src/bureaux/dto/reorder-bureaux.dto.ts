import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderBureauxDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ordre: string[];
}
