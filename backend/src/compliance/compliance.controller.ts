import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ComplianceService } from './compliance.service';

@Controller('houses/:houseId/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get()
  evaluate(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.complianceService.evaluateHouse(req.user.id, houseId);
  }
}
