import { IsEmail } from 'class-validator';

export class AccountStatusDto {
  @IsEmail()
  email: string;
}
