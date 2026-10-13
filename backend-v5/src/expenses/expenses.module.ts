import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivityClock } from '../activities/domain';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [ExpensesController], providers: [ExpensesService, ActivityClock] })
export class ExpensesModule {}
