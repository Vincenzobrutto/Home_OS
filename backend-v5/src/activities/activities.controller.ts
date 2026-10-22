import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { ActivitiesService } from './activities.service';
@Controller('homes/:homeId')
@UseGuards(DocumentAccessGuard)
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}
  @Get('activity-capabilities') capabilities(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.capabilities(req.documentAccountId, h, q); }
  @Get('activity-summary') summary(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.summary(req.documentAccountId, h, q); }
  @Get('activities') list(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.list(req.documentAccountId, h, q); }
  @Post('activities') create(@Req() req: DocumentRequest, @Param('homeId') h: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.create(req.documentAccountId, h, b, key); }
  @Get('activities/:id') detail(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.get(req.documentAccountId, h, id, q); }
  @Get('activities/:id/history') history(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.history(req.documentAccountId, h, id, q); }
  @Post('activities/:id/updates') @HttpCode(200) update(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.update(req.documentAccountId, h, id, b, key); }
  @Post('activities/:id/complete') @HttpCode(200) complete(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.action(req.documentAccountId, h, id, 'complete', b, key); }
  @Post('activities/:id/follow-up') followUp(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.followUp(req.documentAccountId, h, id, b, key); }
  @Post('activities/:id/cancel') @HttpCode(200) cancel(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.action(req.documentAccountId, h, id, 'cancel', b, key); }
  @Post('activities/:id/reopen') @HttpCode(200) reopen(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.action(req.documentAccountId, h, id, 'reopen', b, key); }
}
