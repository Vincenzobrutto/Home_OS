import { Type } from 'class-transformer';
import { IsDefined, IsObject, ValidateNested } from 'class-validator';
import { UpdatePropertyProfileDto } from '../../houses/dto/update-property-profile.dto';

export class ConfirmPropertyProfileDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdatePropertyProfileDto)
  fields: UpdatePropertyProfileDto;
}
