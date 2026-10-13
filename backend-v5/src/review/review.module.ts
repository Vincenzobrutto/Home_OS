import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { FixtureProvider } from './provider';
import { AnalysisWorker } from './worker';
@Module({ imports: [DocumentsModule], controllers: [ReviewController], providers: [ReviewService, FixtureProvider, AnalysisWorker] })
export class ReviewModule {}
