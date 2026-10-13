import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { ActivityClock } from './domain';
@Module({ imports: [DocumentsModule, ReviewModule], providers: [ActivitiesService, ActivityClock], controllers: [ActivitiesController] })
export class ActivitiesModule {}
