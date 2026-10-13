import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { FixtureProvider } from './provider';
import { AnalysisWorker } from './worker';
import { AiConfig } from './ai-config';
import { AiBudget } from './ai-budget';
import { PdfTextExtractor } from './pdf-text';
import { AnthropicTransport } from './anthropic';
import { AiAnalysis } from './ai-analysis';
@Module({ imports: [DocumentsModule], controllers: [ReviewController], providers: [ReviewService, FixtureProvider, AnalysisWorker, AiConfig, AiBudget, PdfTextExtractor, AnthropicTransport, AiAnalysis] })
export class ReviewModule {}
