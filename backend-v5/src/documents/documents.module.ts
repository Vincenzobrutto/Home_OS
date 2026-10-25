import { Module } from '@nestjs/common';
import { DocumentsController, DocumentSearchController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentPolicy, DocumentAccessGuard } from './access';
import { LocalFileStorage } from './storage';
import { WindowsDefenderScanner } from './file-control';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';
@Module({ controllers: [DocumentsController, DocumentSearchController, TrashController], providers: [DocumentsService, TrashService, DocumentPolicy, DocumentAccessGuard, LocalFileStorage, WindowsDefenderScanner], exports: [DocumentsService, DocumentPolicy, DocumentAccessGuard, LocalFileStorage] })
export class DocumentsModule {}
