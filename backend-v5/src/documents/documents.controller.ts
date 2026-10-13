import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { DocumentAccessGuard, DocumentRequest } from './access';
import { UploadDocumentDto, ListDocumentsDto, ExportDocumentsDto } from './dto';
import { MAX_FILE_BYTES } from './storage';
import { SessionsService } from '../security';
export function attachment(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
@Controller('homes/:homeId/documents')
@UseGuards(DocumentAccessGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService, private readonly sessions: SessionsService) {}
  @Get() list(@Req() req: DocumentRequest, @Param('homeId') homeId: string, @Query() query: ListDocumentsDto) { return this.documents.list(req.documentAccountId, homeId, query); }
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 2, parts: 3, fieldSize: 2048, fieldNameSize: 100 } }))
  upload(@Req() req: DocumentRequest, @Param('homeId') homeId: string, @Body() dto: UploadDocumentDto, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Headers('idempotency-key') key?: string) { return this.documents.upload(req.documentAccountId, homeId, dto, file, key); }
  @Post('export') @HttpCode(200)
  async export(@Req() req: DocumentRequest, @Param('homeId') homeId: string, @Body() dto: ExportDocumentsDto, @Res() res: Response) {
    const bytes = await this.documents.export(req.documentAccountId, homeId, dto.documentIds);
    await this.sessions.require(req, true);
    res.setHeader('Content-Type', 'application/zip'); res.setHeader('Content-Disposition', attachment('documenti-dimora.zip')); res.send(bytes);
  }
  @Get(':documentId') get(@Req() req: DocumentRequest, @Param('homeId') homeId: string, @Param('documentId', new ParseUUIDPipe()) id: string) { return this.documents.get(req.documentAccountId, homeId, id); }
  @Get(':documentId/file')
  async file(@Req() req: DocumentRequest, @Param('homeId') homeId: string, @Param('documentId', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const file = await this.documents.file(req.documentAccountId, homeId, id);
    await this.sessions.require(req);
    res.setHeader('Content-Type', file.mimeType); res.setHeader('Content-Disposition', attachment(file.filename)); res.send(file.bytes);
  }
}
