import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class ReactivateMaintenancePlanDto {
  @Type(() => Date)
  @IsDate()
  nextDueAt: Date;
}
