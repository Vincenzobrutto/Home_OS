import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { DocumentsService } from './documents.service';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ConfirmFloorPlanDto } from './dto/confirm-floor-plan.dto';
import { ConfirmUtilityBillDto } from './dto/confirm-utility-bill.dto';
import { ConfirmPropertyProfileDto } from './dto/confirm-property-profile.dto';

// 20MB: sufficiente per una foto ad alta risoluzione o un PDF multipagina
// scansionato, basso abbastanza da respingere in modo pulito un file
// caricato per errore invece di un timeout silenzioso più a valle (upload
// AI, storage). Stessi formati già gestiti da MIME_BY_EXT in
// documents.service.ts — un tipo diverso non avrebbe comunque una pipeline
// di lettura/anteprima.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_FILE_TYPE = /^(application\/pdf|image\/(png|jpe?g|webp))$/;

function documentUploadPipe() {
  return (
    new ParseFilePipeBuilder()
      // skipMagicNumbersValidation: il validatore di default di Nest legge i
      // byte reali del file per riconoscerne il tipo tramite il pacchetto
      // "file-type" (ESM-only, richiede --experimental-vm-modules sotto Jest
      // — non vale la complicazione per un'app a singolo utente per casa: qui
      // basta un controllo pulito sul Content-Type dichiarato dal client per
      // il caso comune, senza pretese antimalware).
      .addFileTypeValidator({
        fileType: ALLOWED_FILE_TYPE,
        skipMagicNumbersValidation: true,
      })
      .addMaxSizeValidator({ maxSize: MAX_UPLOAD_BYTES })
      .build({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new BadRequestException(
            `Formato non supportato o file troppo grande (massimo ${MAX_UPLOAD_BYTES / 1024 / 1024}MB). Formati accettati: PDF, PNG, JPG, WEBP.`,
          ),
      })
  );
}

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('houses/:houseId/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @UploadedFile(documentUploadPipe()) file: Express.Multer.File,
  ) {
    return this.documentsService.upload(req.user.id, houseId, file);
  }

  @Get('houses/:houseId/documents')
  listForHouse(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.documentsService.listForHouse(req.user.id, houseId);
  }

  @Post('houses/:houseId/floorplan-background')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFloorPlanBackground(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @UploadedFile(documentUploadPipe()) file: Express.Multer.File,
  ) {
    return this.documentsService.uploadFloorPlanBackground(
      req.user.id,
      houseId,
      file,
    );
  }

  @Get('documents/:id/file')
  async getFile(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download?: string,
  ) {
    const { buffer, mediaType, filename } = await this.documentsService.getFile(
      req.user.id,
      id,
    );
    return new StreamableFile(buffer, {
      type: mediaType,
      disposition: `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    });
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.remove(req.user.id, id);
  }

  @Post('documents/:id/analyze')
  analyze(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.analyze(req.user.id, id);
  }

  @Get('documents/:id/maintenance-proposals')
  maintenanceProposals(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.maintenanceProposals(req.user.id, id);
  }

  @Post('documents/:id/confirm')
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmDocumentDto,
  ) {
    return this.documentsService.confirm(req.user.id, id, dto);
  }

  @Post('documents/:id/confirm-floorplan')
  confirmFloorPlan(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmFloorPlanDto,
  ) {
    return this.documentsService.confirmFloorPlan(req.user.id, id, dto);
  }

  @Post('documents/:id/confirm-utility-bill')
  confirmUtilityBill(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmUtilityBillDto,
  ) {
    return this.documentsService.confirmUtilityBill(req.user.id, id, dto);
  }

  @Post('documents/:id/confirm-property-profile')
  confirmPropertyProfile(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPropertyProfileDto,
  ) {
    return this.documentsService.confirmPropertyProfile(req.user.id, id, dto);
  }

  @Get('houses/:houseId/gmail-candidates')
  findGmailCandidates(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.documentsService.findGmailCandidates(req.user.id, houseId);
  }

  @Get('houses/:houseId/drive-candidates')
  findDriveCandidates(
    @Req() req: AuthenticatedRequest,
    @Param('houseId', ParseUUIDPipe) houseId: string,
  ) {
    return this.documentsService.findDriveCandidates(req.user.id, houseId);
  }

  // Endpoint condiviso da Gmail e Drive: entrambe le integrazioni producono
  // candidati con la stessa forma (source diverso), quindi l'import è
  // un'unica azione generica invece di duplicarla per integrazione.
  @Post('documents/:id/import-candidate')
  importCandidate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.importCandidate(req.user.id, id);
  }

  // Generico: scarta un candidato Gmail/Drive in revisione, o un documento
  // già in Inbox non ancora confermato (vedi ignoreDocument).
  @Post('documents/:id/ignore')
  ignoreDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.ignoreDocument(req.user.id, id);
  }

  @Post('documents/:id/move-to-house')
  moveToHouse(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.moveToHouse(req.user.id, id);
  }

  @Post('documents/:id/search-online')
  searchOnline(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.searchOnline(req.user.id, id);
  }
}
