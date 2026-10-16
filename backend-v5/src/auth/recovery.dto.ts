import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches } from 'class-validator';
import { CodePointLength } from '../dto';
export class RecoveryRequestDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @CodePointLength(1,254,'Email') email!: string;
}
export class CompleteVerificationDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class CompleteRecoveryDto extends CompleteVerificationDto {
  @IsString() @CodePointLength(12,128,'Password') password!: string;
}
