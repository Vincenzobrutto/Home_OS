import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CompleteMaintenancePlanDto {
  @Type(() => Date)
  @IsDate()
  completedAt: Date;

  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsUUID()
  documentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costAmount?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string | null;
}
