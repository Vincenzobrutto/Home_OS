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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';

@Controller()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('houses/:houseId/assets')
  create(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(houseId, dto);
  }

  @Get('houses/:houseId/assets')
  findAllForHouse(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.assetsService.findAllForHouse(houseId);
  }

  @Patch('assets/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Post('assets/:id/custom-fields')
  addCustomField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.assetsService.addCustomField(id, dto);
  }

  @Patch('custom-fields/:id')
  updateCustomField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.assetsService.updateCustomField(id, dto);
  }

  @Delete('custom-fields/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCustomField(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.removeCustomField(id);
  }

  @Get('assets/:id/timeline')
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getTimeline(id);
  }

  @Post('assets/:id/timeline-events')
  addTimelineEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.assetsService.addTimelineEvent(id, dto);
  }

  @Patch('timeline-events/:id')
  updateTimelineEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimelineEventDto,
  ) {
    return this.assetsService.updateTimelineEventContact(id, dto);
  }

  @Delete('assets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }

  @Post('assets/:id/dismiss')
  dismiss(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.dismiss(id);
  }

  @Post('assets/:id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.reactivate(id);
  }
}
