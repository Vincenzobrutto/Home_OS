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
import { ReceiptAiBudget, ReceiptAiConfig } from './ai-budget';
import { ReceiptAiAnalysis, ReceiptAnthropicTransport } from './ai-analysis';
import { ReceiptAnthropicProvider } from './anthropic-provider';

// Anthropic is opt-in, with a receipt-specific campaign and exact source allowlist.
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [ReceiptAssistanceController, ReceiptJobsController], providers: [ReceiptAssistanceService, ReceiptReleasePolicy, ReceiptAiConfig, ReceiptAiBudget, ReceiptAiAnalysis, ReceiptAnthropicTransport,
  { provide: ReceiptAnthropicProvider, useFactory: (parser: PdfTextExtractor, transport: ReceiptAnthropicTransport) => new ReceiptAnthropicProvider(parser, transport), inject: [PdfTextExtractor, ReceiptAnthropicTransport] },
  ActivityClock, ReceiptFixtureProvider, PdfTextExtractor, ReceiptJobService, ReceiptJobWorker], exports: [ReceiptAssistanceService] })
export class ReceiptAssistanceModule {}
