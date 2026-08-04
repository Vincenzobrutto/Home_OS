import { Module } from '@nestjs/common';
import { GenesisController } from './genesis.controller';
import { GenesisService } from './genesis.service';
import { RoomsModule } from '../rooms/rooms.module';
import { AssetsModule } from '../assets/assets.module';
import { MockHouseScanProvider } from './scan/mock-house-scan-provider';
import { HOUSE_SCAN_PROVIDER } from './scan/house-scan-provider.token';

@Module({
  imports: [RoomsModule, AssetsModule],
  controllers: [GenesisController],
  providers: [
    GenesisService,
    // Unico punto in cui il mock è collegato all'interfaccia — sostituire
    // con un provider reale significa cambiare solo questa riga.
    { provide: HOUSE_SCAN_PROVIDER, useClass: MockHouseScanProvider },
  ],
})
export class GenesisModule {}
