import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { ExpensesService } from './expenses.service';
@Controller('homes/:homeId') @UseGuards(DocumentAccessGuard)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}
  @Get('expense-capabilities') capabilities(@Req() r: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.capabilities(r.documentAccountId, h, q); }
  @Get('expense-summary') summary(@Req() r: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.summary(r.documentAccountId, h, q); }
  @Get('expenses') list(@Req() r: DocumentRequest, @Param('homeId') h: string, @Query() q: unknown) { return this.service.list(r.documentAccountId, h, q); }
  @Post('expenses') create(@Req() r: DocumentRequest, @Param('homeId') h: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.create(r.documentAccountId, h, b, k); }
  @Get('expenses/:id') get(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.get(r.documentAccountId, h, id, q); }
  @Get('expenses/:id/history') history(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Query() q: unknown) { return this.service.history(r.documentAccountId, h, id, q); }
  @Post('expenses/:id/updates') @HttpCode(200) update(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.update(r.documentAccountId, h, id, b, k); }
  @Post('expenses/:id/archive') @HttpCode(200) archive(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.action(r.documentAccountId, h, id, 'archive', b, k); }
  @Post('expenses/:id/restore') @HttpCode(200) restore(@Req() r: DocumentRequest, @Param('homeId') h: string, @Param('id') id: string, @Body() b: unknown, @Headers('idempotency-key') k?: string) { return this.service.action(r.documentAccountId, h, id, 'restore', b, k); }
}
