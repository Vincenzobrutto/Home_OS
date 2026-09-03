import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { InterventionsModule } from '../interventions/interventions.module';
import { WarrantiesModule } from '../warranties/warranties.module';

@Module({
  imports: [InterventionsModule, WarrantiesModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
