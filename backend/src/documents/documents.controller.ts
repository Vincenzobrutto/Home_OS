import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ConfirmFloorPlanDto } from './dto/confirm-floor-plan.dto';

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('houses/:houseId/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(houseId, file);
  }

  @Get('houses/:houseId/documents')
  listForHouse(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.documentsService.listForHouse(houseId);
  }

  @Post('houses/:houseId/floorplan-background')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFloorPlanBackground(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.uploadFloorPlanBackground(houseId, file);
  }

  @Get('documents/:id/file')
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download?: string,
  ) {
    const { buffer, mediaType, filename } =
      await this.documentsService.getFile(id);
    return new StreamableFile(buffer, {
      type: mediaType,
      disposition: `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    });
  }

  @Post('documents/:id/analyze')
  analyze(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.analyze(id);
  }

  @Get('documents/:id/maintenance-proposals')
  maintenanceProposals(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.maintenanceProposals(id);
  }

  @Post('documents/:id/confirm')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmDocumentDto,
  ) {
    return this.documentsService.confirm(id, dto);
  }

  @Post('documents/:id/confirm-floorplan')
  confirmFloorPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmFloorPlanDto,
  ) {
    return this.documentsService.confirmFloorPlan(id, dto);
  }

  @Get('houses/:houseId/gmail-candidates')
  findGmailCandidates(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.documentsService.findGmailCandidates(houseId);
  }

  @Get('houses/:houseId/drive-candidates')
  findDriveCandidates(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.documentsService.findDriveCandidates(houseId);
  }

  // Endpoint condiviso da Gmail e Drive: entrambe le integrazioni producono
  // candidati con la stessa forma (source diverso), quindi l'import è
  // un'unica azione generica invece di duplicarla per integrazione.
  @Post('documents/:id/import-candidate')
  importCandidate(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.importCandidate(id);
  }

  // Generico: scarta un candidato Gmail/Drive in revisione, o un documento
  // già in Inbox non ancora confermato (vedi ignoreDocument).
  @Post('documents/:id/ignore')
  ignoreDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.ignoreDocument(id);
  }

  @Post('documents/:id/move-to-house')
  moveToHouse(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.moveToHouse(id);
  }

  @Post('documents/:id/search-online')
  searchOnline(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.searchOnline(id);
  }
}
