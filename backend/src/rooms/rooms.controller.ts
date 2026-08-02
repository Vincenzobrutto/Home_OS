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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('houses/:houseId/rooms')
  create(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(houseId, dto);
  }

  @Get('houses/:houseId/rooms')
  findAllForHouse(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.roomsService.findAllForHouse(houseId);
  }

  @Patch('rooms/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.remove(id);
  }
}
