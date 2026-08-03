import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CompleteDocumentMaintenanceItemDto {
  @IsUUID()
  maintenancePlanId: string;

  @Type(() => Date)
  @IsDate()
  completedAt: Date;

  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CompleteDocumentMaintenanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CompleteDocumentMaintenanceItemDto)
  items: CompleteDocumentMaintenanceItemDto[];
}
