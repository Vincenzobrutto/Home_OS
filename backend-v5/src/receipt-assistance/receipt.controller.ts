import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { ReceiptAssistanceService } from './receipt.service';

@Controller('homes/:homeId/receipt-assistance')
@UseGuards(DocumentAccessGuard)
export class ReceiptAssistanceController {
  constructor(private readonly service: ReceiptAssistanceService) {}
  @Get('capabilities') capabilities(@Req() r: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.capabilities(r.documentAccountId, h, q); }
  @Post('manual-drafts') @HttpCode(201) manual(@Req() r: DocumentRequest, @Param('homeId') h: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.manual(r.documentAccountId, h, b, k); }
  @Get('drafts/:id') get(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.get(r.documentAccountId, h, id, q); }
  @Post('drafts/:id/park') @HttpCode(200) park(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.action(r.documentAccountId, h, id, 'park', b, k); }
  @Post('drafts/:id/reopen') @HttpCode(200) reopen(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.action(r.documentAccountId, h, id, 'reopen', b, k); }
}
