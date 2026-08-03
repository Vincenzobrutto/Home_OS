import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MaintenanceRecurrenceUnit } from '@prisma/client';

export class CreateMaintenancePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(MaintenanceRecurrenceUnit)
  recurrenceUnit: MaintenanceRecurrenceUnit;

  @IsInt()
  @Min(1)
  @Max(365)
  recurrenceInterval: number;

  @Type(() => Date)
  @IsDate()
  nextDueAt: Date;

  @IsInt()
  @Min(0)
  @Max(365)
  reminderDaysBefore: number;

  @IsOptional()
  @IsUUID()
  preferredContactId?: string | null;

  @IsBoolean()
  isMandatory: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
