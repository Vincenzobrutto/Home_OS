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
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(req.user.id, houseId, dto);
  }

  @Get('houses/:houseId/assets')
  findAllForHouse(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.assetsService.findAllForHouse(req.user.id, houseId);
  }

  @Patch('assets/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(req.user.id, id, dto);
  }

  @Post('assets/:id/custom-fields')
  addCustomField(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.assetsService.addCustomField(req.user.id, id, dto);
  }

  @Patch('custom-fields/:id')
  updateCustomField(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.assetsService.updateCustomField(req.user.id, id, dto);
  }

  @Delete('custom-fields/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCustomField(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.removeCustomField(req.user.id, id);
  }

  @Get('assets/:id/timeline')
  getTimeline(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.getTimeline(req.user.id, id);
  }

  @Post('assets/:id/timeline-events')
  addTimelineEvent(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.assetsService.addTimelineEvent(req.user.id, id, dto);
  }

  @Patch('timeline-events/:id')
  updateTimelineEvent(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimelineEventDto,
  ) {
    return this.assetsService.updateTimelineEventContact(req.user.id, id, dto);
  }

  @Delete('assets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.remove(req.user.id, id);
  }

  @Post('assets/:id/dismiss')
  dismiss(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.dismiss(req.user.id, id);
  }

  @Post('assets/:id/reactivate')
  reactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.reactivate(req.user.id, id);
  }
}
