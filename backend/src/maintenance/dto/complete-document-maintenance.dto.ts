import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
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

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costAmount?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string | null;
}
