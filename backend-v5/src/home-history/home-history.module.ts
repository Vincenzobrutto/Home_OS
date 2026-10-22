import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivityClock } from '../activities/domain';
import { HomeHistoryController } from './home-history.controller';
import { HomeHistoryService } from './home-history.service';

@Module({ imports: [DocumentsModule, ReviewModule], providers: [HomeHistoryService, ActivityClock], controllers: [HomeHistoryController] })
export class HomeHistoryModule {}
