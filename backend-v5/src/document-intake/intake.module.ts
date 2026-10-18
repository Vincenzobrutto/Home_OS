import { Body, Controller, Get, Headers, Module, Optional, Param, Post, Query, Req, ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentAccessGuard, type DocumentRequest } from '../documents/access';
import { IntakeBatchesService } from './batches.service';
import { IntakeUploadsService } from './uploads.service';
import { INTAKE_LIMITS } from './domain';
import { object } from '../review/domain';
import { IntakeAnalysisService } from './analysis.service';
import { PdfTextExtractor } from '../review/pdf-text';

@Controller('homes/:homeId/document-intake')
@UseGuards(DocumentAccessGuard)
export class DocumentIntakeController {
  constructor(private readonly batches: IntakeBatchesService, private readonly uploads: IntakeUploadsService, @Optional() private readonly analysis?: IntakeAnalysisService) {}
  @Get('capabilities') capabilities(@Req() req: DocumentRequest, @Param('homeId') home: string, @Query() q: unknown) { return this.batches.capabilities(req.documentAccountId, home, q); }
  @Post('batches') create(@Req() req: DocumentRequest, @Param('homeId') home: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.create(req.documentAccountId, home, body, key); }
  @Post('batches/from-documents') prepareExisting(@Req() req: DocumentRequest, @Param('homeId') home: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.prepareExisting(req.documentAccountId, home, body, key); }
  @Post('batches/:batchId/items') append(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.append(req.documentAccountId, home, id, body, key); }
  @Get('batches/:batchId') get(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Query() q: unknown) { return this.batches.get(req.documentAccountId, home, id, q); }
  @Get('batches') list(@Req() req: DocumentRequest, @Param('homeId') home: string, @Query() q: unknown) { return this.batches.list(req.documentAccountId, home, q); }
  @Post('batches/:batchId/analyses') analyze(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { if (!this.analysis) throw new ServiceUnavailableException(); return this.analysis.start(req.documentAccountId, home, id, body, key); }
  @Post('batches/:batchId/items/:itemId/review') review(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Param('itemId') item: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.review(req.documentAccountId, home, id, item, body, key); }
  @Post('batches/:batchId/items/:itemId/removal') remove(@Req() req: DocumentRequest, @Param('homeId') home:string, @Param('batchId') id:string, @Param('itemId') item:string, @Body() body:unknown, @Headers('idempotency-key') key?:string){return this.uploads.remove(req.documentAccountId,home,id,item,body,key);}
  @Post('batches/:batchId/items/:itemId/upload-cancellation') cancel(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Param('itemId') item: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.cancelUpload(req.documentAccountId, home, id, item, body, key); }
  @Get('batches/:batchId/items/:itemId/reviews/:key') reviewReceipt(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Param('itemId') item: string, @Param('key') key: string, @Query() q: unknown) { return this.batches.reviewReceipt(req.documentAccountId, home, id, item, key, q); }
  @Post('batches/:batchId/items/:itemId/duplicate-resolution') reuseDuplicate(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Param('itemId') item: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.reuseDuplicate(req.documentAccountId, home, id, item, body, key); }
  @Post('batches/:batchId/confirmations') confirm(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.confirm(req.documentAccountId, home, id, body, key); }
  @Post('batches/:batchId/organizations') organize(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.organize(req.documentAccountId, home, id, body, key); }
  @Get('batches/:batchId/organizations/:key') organizationReceipt(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Param('key') key: string, @Query() q: unknown) { return this.batches.organizationReceipt(req.documentAccountId, home, id, key, q); }
  @Get('batches/:batchId/confirmations/:key') confirmation(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Param('key') key: string, @Query() q: unknown) { return this.batches.confirmation(req.documentAccountId, home, id, key, q); }
  @Post('batches/:batchId/items/:itemId/file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: INTAKE_LIMITS.maxFileBytes, files: 1, fields: 0, parts: 2, fieldNameSize: 100 } }))
  upload(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') batchId: string, @Param('itemId') itemId: string, @Body() body: unknown, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Headers('idempotency-key') key?: string) { object(body, []); return this.uploads.upload(req.documentAccountId, home, batchId, itemId, file, key); }
}
// Registered after B1/B2 and local-classifier integration checks. No external AI provider.
@Module({ imports: [DocumentsModule], controllers: [DocumentIntakeController], providers: [IntakeBatchesService, IntakeUploadsService, PdfTextExtractor, IntakeAnalysisService], exports: [IntakeBatchesService] })
export class DocumentIntakeModule {}
