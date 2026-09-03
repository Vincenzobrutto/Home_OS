import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccessControlModule } from './access-control/access-control.module';
import { HousesModule } from './houses/houses.module';
import { RoomsModule } from './rooms/rooms.module';
import { AssetsModule } from './assets/assets.module';
import { DocumentsModule } from './documents/documents.module';
import { ContactsModule } from './contacts/contacts.module';
import { GmailModule } from './gmail/gmail.module';
import { DriveModule } from './drive/drive.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { GenesisModule } from './genesis/genesis.module';
import { UtilityBillsModule } from './utility-bills/utility-bills.module';
import { ComplianceModule } from './compliance/compliance.module';
import { InterventionsModule } from './interventions/interventions.module';
import { WarrantiesModule } from './warranties/warranties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccessControlModule,
    HousesModule,
    RoomsModule,
    AssetsModule,
    DocumentsModule,
    ContactsModule,
    GmailModule,
    DriveModule,
    MaintenanceModule,
    GenesisModule,
    UtilityBillsModule,
    ComplianceModule,
    InterventionsModule,
    WarrantiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
