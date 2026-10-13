import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const email = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
export class LoginDto {
  @Transform(email) @IsEmail({}, { message: 'Inserisci un’email valida.' }) @MaxLength(254) email!: string;
  @IsString() @MinLength(12, { message: 'La password deve avere almeno 12 caratteri.' }) @MaxLength(128) password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(trim) @IsString() @MinLength(1, { message: 'Inserisci il nome.' }) @MaxLength(80) name!: string;
}
export class CreateHomeDto {
  @Transform(trim) @IsString() @MinLength(1, { message: 'Inserisci il nome della casa.' }) @MaxLength(80) name!: string;
  @Transform(trim) @IsString() @MinLength(1, { message: 'Inserisci l’indirizzo.' }) @MaxLength(200) address!: string;
}
