import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { ReceiptJobService } from './jobs.service';

@Controller('homes/:homeId/receipt-assistance')
@UseGuards(DocumentAccessGuard)
export class ReceiptJobsController {
  constructor(private readonly jobs: ReceiptJobService) {}
  @Post('jobs') @HttpCode(202) start(@Req() r: DocumentRequest, @Param('homeId') h: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.jobs.start(r.documentAccountId, h, b, k); }
  @Get('jobs/:id') get(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.jobs.get(r.documentAccountId, h, id, q); }
}
