import { Module } from '@nestjs/common';
import { DocumentsController, DocumentSearchController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentPolicy, DocumentAccessGuard } from './access';
import { LocalFileStorage } from './storage';
@Module({ controllers: [DocumentsController, DocumentSearchController], providers: [DocumentsService, DocumentPolicy, DocumentAccessGuard, LocalFileStorage], exports: [DocumentsService, DocumentPolicy, DocumentAccessGuard] })
export class DocumentsModule {}
