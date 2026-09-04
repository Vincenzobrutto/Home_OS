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
import { HousesService } from './houses.service';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';
import { UpdatePropertyProfileDto } from './dto/update-property-profile.dto';

@Controller()
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  @Post('houses')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateHouseDto) {
    return this.housesService.create(req.user.id, dto);
  }

  @Get('houses/:id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.housesService.findOne(req.user.id, id);
  }

  @Patch('houses/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHouseDto,
  ) {
    return this.housesService.update(req.user.id, id, dto);
  }

  @Delete('houses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.housesService.remove(req.user.id, id);
  }

  @Get('houses/:id/export')
  exportData(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.housesService.exportData(req.user.id, id);
  }

  @Patch('houses/:id/property-profile')
  updatePropertyProfile(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyProfileDto,
  ) {
    return this.housesService.updatePropertyProfile(req.user.id, id, dto);
  }

  // Le case dell'utente della sessione corrente — non più
  // "users/:userId/houses" con un userId lato client, per non far leggere
  // a chiunque le case di un altro semplicemente indovinandone l'id.
  @Get('houses')
  findAllForCurrentUser(@Req() req: AuthenticatedRequest) {
    return this.housesService.findAllForUser(req.user.id);
  }
}
