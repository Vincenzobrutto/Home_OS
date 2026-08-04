import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { UtilityBillsService } from './utility-bills.service';

@Controller()
export class UtilityBillsController {
  constructor(private readonly utilityBillsService: UtilityBillsService) {}

  @Get('houses/:houseId/energy-consumption')
  consumption(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.utilityBillsService.consumption(houseId, year);
  }
}
