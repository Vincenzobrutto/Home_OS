import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { GenesisService } from './genesis.service';
import { SaveHouseInfoDto } from './dto/save-house-info.dto';
import { StartScanDto } from './dto/start-scan.dto';
import { ConfirmObservationsDto } from './dto/confirm-observations.dto';
import { SaveGenesisStepDto } from './dto/save-genesis-step.dto';

@Controller()
export class GenesisController {
  constructor(private readonly genesisService: GenesisService) {}

  @Post('houses/:houseId/genesis/start')
  start(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.start(req.user.id, houseId);
  }

  @Get('houses/:houseId/genesis/resume')
  resume(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.resume(req.user.id, houseId);
  }

  @Patch('houses/:houseId/genesis/step')
  saveStep(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: SaveGenesisStepDto,
  ) {
    return this.genesisService.saveStep(req.user.id, houseId, dto.step);
  }

  @Patch('houses/:houseId/genesis/house-info')
  saveHouseInfo(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: SaveHouseInfoDto,
  ) {
    return this.genesisService.saveHouseInfo(req.user.id, houseId, dto);
  }

  @Post('houses/:houseId/genesis/scan')
  startScan(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: StartScanDto,
  ) {
    return this.genesisService.startScan(req.user.id, houseId, dto);
  }

  @Get('houses/:houseId/genesis/scan/:scanSessionId')
  getScanResults(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Param('scanSessionId', ParseUUIDPipe) scanSessionId: string,
  ) {
    return this.genesisService.getScanResults(
      req.user.id,
      houseId,
      scanSessionId,
    );
  }

  @Post('houses/:houseId/genesis/scan/:scanSessionId/confirm')
  confirmObservations(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Param('scanSessionId', ParseUUIDPipe) scanSessionId: string,
    @Body() dto: ConfirmObservationsDto,
  ) {
    return this.genesisService.confirmObservations(
      req.user.id,
      houseId,
      scanSessionId,
      dto,
    );
  }

  @Post('houses/:houseId/genesis/complete')
  complete(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.completeGenesis(req.user.id, houseId);
  }

  @Get('houses/:houseId/genesis')
  getResults(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.getResults(req.user.id, houseId);
  }

  @Get('houses/:houseId/genesis/timeline')
  getTimeline(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.getTimeline(req.user.id, houseId);
  }

  @Get('houses/:houseId/genesis/score-history')
  getScoreHistory(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.getScoreHistory(req.user.id, houseId);
  }

  @Post('houses/:houseId/genesis/recalculate')
  recalculateScore(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.genesisService.recalculateScore(req.user.id, houseId);
  }

  // Catalogo demo statico, non legato a nessuna casa specifica — solo
  // dietro sessione valida (il guard globale lo richiede comunque), niente
  // controllo di accesso per-casa da fare qui.
  @Get('genesis/demo-catalog')
  getDemoCatalog() {
    return this.genesisService.getDemoCatalog();
  }
}
