import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SessionsService } from './security';
import { AuthModule } from './auth/auth.module';
import { HomesModule } from './homes/homes.module';
import { DocumentsModule } from './documents/documents.module';
import { ReviewModule } from './review/review.module';
import { ActivitiesModule } from './activities/activities.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HomeObjectsModule } from './home-objects/home-objects.module';
import { SharingModule } from './sharing/sharing.module';
@Global() @Module({ providers: [PrismaService, SessionsService], exports: [PrismaService, SessionsService] })
export class InfrastructureModule {}
@Module({ imports: [InfrastructureModule, AuthModule, HomesModule, DocumentsModule, ReviewModule, ActivitiesModule, ExpensesModule, HomeObjectsModule, SharingModule] })
export class AppModule {}
