import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivityClock } from '../activities/domain';
import { ReceiptAssistanceService } from './receipt.service';
import { ReceiptAssistanceController } from './receipt.controller';

// Not imported by AppModule until the confirmation and privacy/export gates are complete.
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [ReceiptAssistanceController], providers: [ReceiptAssistanceService, ActivityClock], exports: [ReceiptAssistanceService] })
export class ReceiptAssistanceModule {}
