import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
