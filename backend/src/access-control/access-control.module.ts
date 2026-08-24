import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

// Global come PrismaModule: usato da praticamente ogni modulo che espone
// dati di una casa, importarlo esplicitamente ovunque sarebbe solo rumore.
@Global()
@Module({
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
