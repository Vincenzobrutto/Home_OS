import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ComplianceService } from './compliance.service';

@Controller('houses/:houseId/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get()
  evaluate(@Req() req: Request, @Param('houseId') houseId: string) {
    return this.complianceService.evaluateHouse(req.user.id, houseId);
  }
}
