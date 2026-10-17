import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { HomeObjectsModule } from '../home-objects/home-objects.module';
import { ActivityClock } from '../activities/domain';
import { PdfTextExtractor } from '../review/pdf-text';
import { ObjectOnboardingAccess } from './access';
import { ObjectOnboardingService } from './onboarding.service';
import { ObjectOnboardingController } from './onboarding.controller';
import { OnboardingJobService } from './jobs.service';
import { OnboardingJobWorker } from './jobs.worker';
import { OnboardingAiBudget, OnboardingAiConfig } from './ai-budget';
import { OnboardingAiAnalysis, ObjectOnboardingAnthropicTransport } from './ai-analysis';
import { ObjectOnboardingAnthropicProvider } from './anthropic-provider';
@Module({imports:[DocumentsModule,ReviewModule,HomeObjectsModule],controllers:[ObjectOnboardingController],providers:[ObjectOnboardingAccess,ObjectOnboardingService,OnboardingJobService,OnboardingJobWorker,OnboardingAiBudget,OnboardingAiConfig,OnboardingAiAnalysis,ObjectOnboardingAnthropicTransport,ActivityClock,PdfTextExtractor,{provide:ObjectOnboardingAnthropicProvider,useFactory:(parser:PdfTextExtractor,transport:ObjectOnboardingAnthropicTransport)=>new ObjectOnboardingAnthropicProvider(parser,transport),inject:[PdfTextExtractor,ObjectOnboardingAnthropicTransport]}]})
export class ObjectOnboardingModule {}
