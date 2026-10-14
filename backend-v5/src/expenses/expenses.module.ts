import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ActivityClock } from '../activities/domain';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { EconomyService } from '../economy/economy.service';
import { EconomyController } from '../economy/economy.controller';
@Module({ imports: [DocumentsModule, ReviewModule], controllers: [ExpensesController, EconomyController], providers: [ExpensesService, EconomyService, ActivityClock] })
export class ExpensesModule {}
