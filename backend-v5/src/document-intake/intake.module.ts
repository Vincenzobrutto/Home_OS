import { Body, Controller, Get, Headers, Module, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentAccessGuard, type DocumentRequest } from '../documents/access';
import { IntakeBatchesService } from './batches.service';
import { IntakeUploadsService } from './uploads.service';
import { INTAKE_LIMITS } from './domain';
import { object } from '../review/domain';

@Controller('homes/:homeId/document-intake')
@UseGuards(DocumentAccessGuard)
export class DocumentIntakeController {
  constructor(private readonly batches: IntakeBatchesService, private readonly uploads: IntakeUploadsService) {}
  @Get('capabilities') capabilities(@Req() req: DocumentRequest, @Param('homeId') home: string, @Query() q: unknown) { return this.batches.capabilities(req.documentAccountId, home, q); }
  @Post('batches') create(@Req() req: DocumentRequest, @Param('homeId') home: string, @Body() body: unknown, @Headers('idempotency-key') key?: string) { return this.batches.create(req.documentAccountId, home, body, key); }
  @Get('batches/:batchId') get(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') id: string, @Query() q: unknown) { return this.batches.get(req.documentAccountId, home, id, q); }
  @Post('batches/:batchId/items/:itemId/file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: INTAKE_LIMITS.maxFileBytes, files: 1, fields: 0, parts: 2, fieldNameSize: 100 } }))
  upload(@Req() req: DocumentRequest, @Param('homeId') home: string, @Param('batchId') batchId: string, @Param('itemId') itemId: string, @Body() body: unknown, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Headers('idempotency-key') key?: string) { object(body, []); return this.uploads.upload(req.documentAccountId, home, batchId, itemId, file, key); }
}
// Isolated until real uploads, source redaction and review are complete. Do not register yet.
@Module({ imports: [DocumentsModule], controllers: [DocumentIntakeController], providers: [IntakeBatchesService, IntakeUploadsService] })
export class DocumentIntakeModule {}
