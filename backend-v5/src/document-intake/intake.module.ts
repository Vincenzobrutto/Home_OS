import { Body, Controller, Get, Headers, Module, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentAccessGuard, type DocumentRequest } from '../documents/access';
import { IntakeBatchesService } from './batches.service';

@Controller('homes/:homeId/document-intake')
@UseGuards(DocumentAccessGuard)
export class DocumentIntakeController {
  constructor(private readonly batches: IntakeBatchesService) {}
  @Get('capabilities') capabilities(@Req() req: DocumentRequest, @Param('homeId') home: string, @Query() q: unknown) { return this.batches.capabilities(req.documentAccountId, home, q); }
  @Post('batches') create(@Req() req: DocumentRequest, @Param('homeId') home: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.create(req.documentAccountId, home, body, key); }
  @Get('batches/:batchId') get(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Query() q: unknown) { return this.batches.get(req.documentAccountId, home, id, q); }
}
// Isolated until real uploads, source redaction and review are complete. Do not register yet.
@Module({ imports: [DocumentsModule], controllers: [DocumentIntakeController], providers: [IntakeBatchesService] })
export class DocumentIntakeModule {}
