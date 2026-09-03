import { IsString, IsNotEmpty } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;
}
