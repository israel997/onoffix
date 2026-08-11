import { IsString } from 'class-validator';

export class SwitchOrganisationDto {
  @IsString()
  organisationId: string;
}
