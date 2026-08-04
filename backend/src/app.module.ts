import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
