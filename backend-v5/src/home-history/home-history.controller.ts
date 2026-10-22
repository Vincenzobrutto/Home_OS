import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { HomeHistoryService } from './home-history.service';

/** BL-03 storia della casa: lettura aggregata personale ed eventi inseriti a mano. */
@Controller('homes/:homeId')
@UseGuards(DocumentAccessGuard)
export class HomeHistoryController {
  constructor(private readonly service: HomeHistoryService) {}
  @Get('history') list(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.list(req.documentAccountId, h, q); }
  @Post('history/events') create(@Req() req: DocumentRequest, @Param('homeId') h: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.create(req.documentAccountId, h, b, key); }
  @Get('history/events/:id') detail(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.get(req.documentAccountId, h, id, q); }
  @Post('history/events/:id/updates') @HttpCode(200) update(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.update(req.documentAccountId, h, id, b, key); }
  @Post('history/events/:id/removal') @HttpCode(200) remove(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') key?: string) { return this.service.remove(req.documentAccountId, h, id, b, key); }
}
