import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivityClock } from '../activities/domain';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { EconomyService } from '../economy/economy.service';
import { EconomyController } from '../economy/economy.controller';
import {EconomicDocumentsService} from '../economy/document.service';
import {EconomicDocumentsController} from '../economy/document.controller';
import {EconomicAnalysisWorker} from '../economy/document.worker';
import {EconomicFixtureProvider} from '../economy/document-fixture';
import {PdfTextExtractor} from '../review/pdf-text';
import {EconomicAiConfig,EconomicAiBudget} from '../economy/ai-budget';
import {EconomicAiAnalysis} from '../economy/ai-analysis';
import {EconomicAnthropicProvider} from '../economy/document-anthropic';
import {AnthropicTransport} from '../review/anthropic';
import {AiConfig} from '../review/ai-config';
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [ExpensesController, EconomyController, EconomicDocumentsController], providers: [ExpensesService, EconomyService, ActivityClock, EconomicDocumentsService, EconomicAnalysisWorker, EconomicFixtureProvider, PdfTextExtractor, EconomicAiConfig, EconomicAiBudget, EconomicAiAnalysis, EconomicAnthropicProvider, AnthropicTransport, AiConfig] })
export class ExpensesModule {}
