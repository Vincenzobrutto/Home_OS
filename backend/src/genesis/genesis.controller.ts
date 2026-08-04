import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { GenesisService } from './genesis.service';
import { SaveHouseInfoDto } from './dto/save-house-info.dto';
import { StartScanDto } from './dto/start-scan.dto';
import { ConfirmObservationsDto } from './dto/confirm-observations.dto';
import { SaveGenesisStepDto } from './dto/save-genesis-step.dto';

@Controller()
export class GenesisController {
  constructor(private readonly genesisService: GenesisService) {}

  @Post('houses/:houseId/genesis/start')
  start(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.start(houseId);
  }

  @Get('houses/:houseId/genesis/resume')
  resume(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.resume(houseId);
  }

  @Patch('houses/:houseId/genesis/step')
  saveStep(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: SaveGenesisStepDto,
  ) {
    return this.genesisService.saveStep(houseId, dto.step);
  }

  @Patch('houses/:houseId/genesis/house-info')
  saveHouseInfo(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: SaveHouseInfoDto,
  ) {
    return this.genesisService.saveHouseInfo(houseId, dto);
  }

  @Post('houses/:houseId/genesis/scan')
  startScan(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: StartScanDto,
  ) {
    return this.genesisService.startScan(houseId, dto);
  }

  @Get('houses/:houseId/genesis/scan/:scanSessionId')
  getScanResults(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Param('scanSessionId', ParseUUIDPipe) scanSessionId: string,
  ) {
    return this.genesisService.getScanResults(houseId, scanSessionId);
  }

  @Post('houses/:houseId/genesis/scan/:scanSessionId/confirm')
  confirmObservations(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Param('scanSessionId', ParseUUIDPipe) scanSessionId: string,
    @Body() dto: ConfirmObservationsDto,
  ) {
    return this.genesisService.confirmObservations(houseId, scanSessionId, dto);
  }

  @Post('houses/:houseId/genesis/complete')
  complete(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.completeGenesis(houseId);
  }

  @Get('houses/:houseId/genesis')
  getResults(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.getResults(houseId);
  }

  @Get('houses/:houseId/genesis/timeline')
  getTimeline(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.getTimeline(houseId);
  }

  @Get('houses/:houseId/genesis/score-history')
  getScoreHistory(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.getScoreHistory(houseId);
  }

  @Post('houses/:houseId/genesis/recalculate')
  recalculateScore(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.genesisService.recalculateScore(houseId);
  }

  @Get('genesis/demo-catalog')
  getDemoCatalog() {
    return this.genesisService.getDemoCatalog();
  }
}
