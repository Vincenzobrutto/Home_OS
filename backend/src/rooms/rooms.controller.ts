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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('houses/:houseId/rooms')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(req.user.id, houseId, dto);
  }

  @Get('houses/:houseId/rooms')
  findAllForHouse(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.roomsService.findAllForHouse(req.user.id, houseId);
  }

  @Patch('rooms/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(req.user.id, id, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roomsService.remove(req.user.id, id);
  }
}
