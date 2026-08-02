import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { HousesService } from './houses.service';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';

@Controller()
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  @Post('houses')
  create(@Body() dto: CreateHouseDto) {
    return this.housesService.create(dto);
  }

  @Get('houses/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.housesService.findOne(id);
  }

  @Patch('houses/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHouseDto) {
    return this.housesService.update(id, dto);
  }

  @Get('users/:userId/houses')
  findAllForOwner(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.housesService.findAllForOwner(userId);
  }
}
