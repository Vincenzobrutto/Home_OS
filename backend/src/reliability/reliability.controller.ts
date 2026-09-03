import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ReliabilityService } from './reliability.service';

@Controller('houses/:houseId/memory-reliability')
export class ReliabilityController {
  constructor(private readonly reliability: ReliabilityService) {}

  @Get()
  evaluate(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.reliability.evaluateHouse(req.user.id, houseId);
  }
}
