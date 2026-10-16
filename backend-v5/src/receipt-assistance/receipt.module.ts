import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivityClock } from '../activities/domain';
import { ReceiptAssistanceService } from './receipt.service';
import { ReceiptAssistanceController } from './receipt.controller';
import { ReceiptFixtureProvider } from './fixture-provider';
import { PdfTextExtractor } from '../review/pdf-text';
import { ReceiptJobService } from './jobs.service';
import { ReceiptJobsController } from './jobs.controller';
import { ReceiptJobWorker } from './jobs.worker';
import { ReceiptReleasePolicy } from './release-policy';

// Not imported by AppModule until the confirmation and privacy/export gates are complete.
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [ReceiptAssistanceController, ReceiptJobsController], providers: [ReceiptAssistanceService, ReceiptReleasePolicy, ActivityClock, ReceiptFixtureProvider, PdfTextExtractor, ReceiptJobService, ReceiptJobWorker], exports: [ReceiptAssistanceService] })
export class ReceiptAssistanceModule {}
