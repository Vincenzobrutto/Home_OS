import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { CompleteMaintenancePlanDto } from './dto/complete-maintenance-plan.dto';
import { ReactivateMaintenancePlanDto } from './dto/reactivate-maintenance-plan.dto';
import { CompleteDocumentMaintenanceDto } from './dto/complete-document-maintenance.dto';

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post('documents/:documentId/complete-maintenance')
  completeFromDocument(
    @Req() req: AuthenticatedRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CompleteDocumentMaintenanceDto,
  ) {
    return this.maintenance.completeFromDocument(req.user.id, documentId, dto);
  }

  @Get('assets/:assetId/maintenance-plans')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.maintenance.listForAsset(req.user.id, assetId);
  }

  @Post('assets/:assetId/maintenance-plans')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CreateMaintenancePlanDto,
  ) {
    return this.maintenance.create(req.user.id, assetId, dto);
  }

  @Get('assets/:assetId/maintenance-suggestions')
  suggestions(
    @Req() req: AuthenticatedRequest,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.maintenance.suggestionsForAsset(req.user.id, assetId);
  }

  @Post('assets/:assetId/maintenance-suggestions/:code/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  dismissSuggestion(
    @Req() req: AuthenticatedRequest,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Param('code') code: string,
  ) {
    return this.maintenance.dismissSuggestion(req.user.id, assetId, code);
  }

  @Get('houses/:houseId/maintenance-reminders')
  reminders(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.maintenance.remindersForHouse(req.user.id, houseId);
  }

  @Patch('maintenance-plans/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenancePlanDto,
  ) {
    return this.maintenance.update(req.user.id, id, dto);
  }

  @Post('maintenance-plans/:id/complete')
  complete(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteMaintenancePlanDto,
  ) {
    return this.maintenance.complete(req.user.id, id, dto);
  }

  @Post('maintenance-plans/:id/pause')
  pause(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.pause(req.user.id, id);
  }

  @Post('maintenance-plans/:id/reactivate')
  reactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactivateMaintenancePlanDto,
  ) {
    return this.maintenance.reactivate(req.user.id, id, dto);
  }

  @Get('maintenance-plans/:id/occurrences')
  occurrences(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.occurrences(req.user.id, id);
  }

  @Delete('maintenance-plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.remove(req.user.id, id);
  }
}
