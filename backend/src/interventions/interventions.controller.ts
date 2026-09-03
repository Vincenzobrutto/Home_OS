import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { ListInterventionsDto } from './dto/list-interventions.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { InterventionsService } from './interventions.service';

@Controller()
export class InterventionsController {
  constructor(private readonly interventions: InterventionsService) {}

  @Get('houses/:houseId/interventions')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Query() query: ListInterventionsDto,
  ) {
    return this.interventions.list(req.user.id, houseId, query);
  }

  @Post('houses/:houseId/interventions')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateInterventionDto,
  ) {
    return this.interventions.create(req.user.id, houseId, dto);
  }

  @Get('interventions/:id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interventions.findOne(req.user.id, id);
  }

  @Patch('interventions/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterventionDto,
  ) {
    return this.interventions.update(req.user.id, id, dto);
  }
}
