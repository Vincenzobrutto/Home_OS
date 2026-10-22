import { ContactsModule } from './contacts/contacts.module';
import { ObjectOnboardingModule } from './object-onboarding/onboarding.module';
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SessionsService } from './security';
import { AuthModule } from './auth/auth.module';
import { HomesModule } from './homes/homes.module';
import { DocumentsModule } from './documents/documents.module';
import { ReviewModule } from './review/review.module';
import { ActivitiesModule } from './activities/activities.module';
import { HomeHistoryModule } from './home-history/home-history.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HomeObjectsModule } from './home-objects/home-objects.module';
import { SharingModule } from './sharing/sharing.module';
import { PersonalExportModule } from './personal-export/personal-export.module';
import { ReceiptAssistanceModule } from './receipt-assistance/receipt.module';
import { DocumentIntakeModule } from './document-intake/intake.module';
@Global() @Module({ providers: [PrismaService, SessionsService], exports: [PrismaService, SessionsService] })
export class InfrastructureModule {}
@Module({ imports: [ContactsModule, ObjectOnboardingModule, InfrastructureModule, AuthModule, HomesModule, DocumentsModule, ReviewModule, ActivitiesModule, HomeHistoryModule, ExpensesModule, HomeObjectsModule, SharingModule, PersonalExportModule, ReceiptAssistanceModule, DocumentIntakeModule] })
export class AppModule {}
