import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { HomeObjectsController } from './home-objects.controller';
import { HomeObjectsService } from './home-objects.service';
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [HomeObjectsController], providers: [HomeObjectsService], exports: [HomeObjectsService] })
export class HomeObjectsModule {}
