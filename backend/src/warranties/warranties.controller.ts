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
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';
import { WarrantiesService } from './warranties.service';

@Controller()
export class WarrantiesController {
  constructor(private readonly warranties: WarrantiesService) {}

  @Get('assets/:assetId/warranties')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.warranties.list(req.user.id, assetId);
  }

  @Get('houses/:houseId/warranties')
  listForHouse(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.warranties.listForHouse(req.user.id, houseId);
  }

  @Post('assets/:assetId/warranties')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CreateWarrantyDto,
  ) {
    return this.warranties.create(req.user.id, assetId, dto);
  }

  @Patch('warranties/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarrantyDto,
  ) {
    return this.warranties.update(req.user.id, id, dto);
  }
}
