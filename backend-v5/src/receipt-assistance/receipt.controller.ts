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
  @Get('drafts/:id/object-candidates') objects(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.candidates(r.documentAccountId, h, id, 'object', q); }
  @Get('drafts/:id/expense-candidates') expenses(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.candidates(r.documentAccountId, h, id, 'expense', q); }
  @Post('drafts/:id/park') @HttpCode(200) park(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.action(r.documentAccountId, h, id, 'park', b, k); }
  @Post('drafts/:id/reopen') @HttpCode(200) reopen(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.action(r.documentAccountId, h, id, 'reopen', b, k); }
  @Get('object-fields/:id') fields(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.objectFields(r.documentAccountId, h, id, q); }
  @Get('comparisons') comparisons(@Req() r: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.comparisons(r.documentAccountId, h, q); }
  @Get('comparisons/:id') comparison(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.getComparison(r.documentAccountId, h, id, q); }
  @Post('comparisons/:id/resolutions') @HttpCode(200) resolve(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.resolveComparison(r.documentAccountId, h, id, b, k); }
  @Post('drafts/:id/confirmations') @HttpCode(200) confirm(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.confirm(r.documentAccountId, h, id, b, k); }
  @Get('drafts/:id/confirmation') recover(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown, @Headers('idempotency-key') k?: string) { return this.service.recoverConfirmation(r.documentAccountId, h, id, q, k); }
}
