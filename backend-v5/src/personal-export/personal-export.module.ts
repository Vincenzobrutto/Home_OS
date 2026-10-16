import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { PersonalExportController } from './personal-export.controller';
import { PersonalExportService } from './personal-export.service';

@Module({ imports: [DocumentsModule], controllers: [PersonalExportController], providers: [PersonalExportService] })
export class PersonalExportModule {}
