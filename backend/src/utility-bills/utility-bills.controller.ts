import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { UtilityBillsService } from './utility-bills.service';

@Controller()
export class UtilityBillsController {
  constructor(private readonly utilityBillsService: UtilityBillsService) {}

  @Get('houses/:houseId/energy-consumption')
  consumption(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.utilityBillsService.consumption(req.user.id, houseId, year);
  }
}
