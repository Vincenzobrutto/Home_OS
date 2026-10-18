import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ReviewModule } from '../review/review.module';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
@Module({imports:[DocumentsModule,ReviewModule],providers:[ContactsService],controllers:[ContactsController],exports:[ContactsService]})
export class ContactsModule {}
