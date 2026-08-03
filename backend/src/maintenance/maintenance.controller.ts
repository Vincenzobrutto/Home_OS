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
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { CompleteMaintenancePlanDto } from './dto/complete-maintenance-plan.dto';
import { ReactivateMaintenancePlanDto } from './dto/reactivate-maintenance-plan.dto';

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get('assets/:assetId/maintenance-plans')
  list(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.maintenance.listForAsset(assetId);
  }

  @Post('assets/:assetId/maintenance-plans')
  create(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CreateMaintenancePlanDto,
  ) {
    return this.maintenance.create(assetId, dto);
  }

  @Get('houses/:houseId/maintenance-reminders')
  reminders(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.maintenance.remindersForHouse(houseId);
  }

  @Patch('maintenance-plans/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenancePlanDto,
  ) {
    return this.maintenance.update(id, dto);
  }

  @Post('maintenance-plans/:id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteMaintenancePlanDto,
  ) {
    return this.maintenance.complete(id, dto);
  }

  @Post('maintenance-plans/:id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenance.pause(id);
  }

  @Post('maintenance-plans/:id/reactivate')
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactivateMaintenancePlanDto,
  ) {
    return this.maintenance.reactivate(id, dto);
  }

  @Get('maintenance-plans/:id/occurrences')
  occurrences(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenance.occurrences(id);
  }

  @Delete('maintenance-plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenance.remove(id);
  }
}
