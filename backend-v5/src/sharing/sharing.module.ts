import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { SharingHomeController, ReceivedSharesController, ShareClaimsController } from './sharing.controller';
import { SharingService } from './sharing.service';
@Module({imports:[DocumentsModule],controllers:[SharingHomeController,ReceivedSharesController,ShareClaimsController],providers:[SharingService]})
export class SharingModule {}
