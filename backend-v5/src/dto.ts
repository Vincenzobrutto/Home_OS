import { Transform } from 'class-transformer';
import { IsEmail, IsString, ValidateBy } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const email = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
function CodePointLength(min: number, max: number, label: string) {
  return ValidateBy({ name: 'codePointLength', validator: { validate: (value: unknown) => typeof value === 'string' && [...value].length >= min && [...value].length <= max, defaultMessage: () => `${label}: da ${min} a ${max} caratteri.` } });
}
export class LoginDto {
  @Transform(email) @IsEmail({}, { message: 'Inserisci un’email valida.' }) @CodePointLength(1, 254, 'Email') email!: string;
  @IsString() @CodePointLength(12, 128, 'Password') password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(trim) @IsString() @CodePointLength(1, 80, 'Nome') name!: string;
}
export class CreateHomeDto {
  @Transform(trim) @IsString() @CodePointLength(1, 80, 'Nome della casa') name!: string;
  @Transform(trim) @IsString() @CodePointLength(1, 200, 'Indirizzo') address!: string;
}
