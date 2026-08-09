import { IsEmail } from 'class-validator';

export class AddOrganizerMembreDto {
  @IsEmail()
  email: string;
}
