import { Module } from '@nestjs/common';
import { UtilityBillsController } from './utility-bills.controller';
import { UtilityBillsService } from './utility-bills.service';

@Module({
  controllers: [UtilityBillsController],
  providers: [UtilityBillsService],
})
export class UtilityBillsModule {}
