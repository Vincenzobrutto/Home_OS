import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConfirmUtilityBillPeriodDto {
  @Type(() => Date)
  @IsDate()
  periodStart: Date;

  @Type(() => Date)
  @IsDate()
  periodEnd: Date;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  consumptionKwh: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number | null;
}

export class ConfirmUtilityBillDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplier?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => ConfirmUtilityBillPeriodDto)
  periods: ConfirmUtilityBillPeriodDto[];
}
