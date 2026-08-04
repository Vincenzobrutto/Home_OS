import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HouseScanProvider,
  ScanObservationResult,
  ScanSessionResult,
  StartScanInput,
} from './house-scan-provider.interface';
import {
  GENESIS_DEMO_ASSETS,
  GENESIS_DEMO_ROOMS,
} from './genesis-demo-dataset';

// Implementazione mock: nessuna computer vision, nessun upload di
// foto/video realmente analizzato. Genera il dataset demo deterministico
// (genesis-demo-dataset.ts) e lo salva come Observation collegate alla
// ScanSession — esattamente come farebbe un provider reale, così il resto
// dell'app (GenesisService, wizard) non deve sapere che è mock. La sessione
// è marcata COMPLETED subito: non esiste un job in background reale da
// attendere, l'eventuale stato "in elaborazione" mostrato all'utente è solo
// una pausa cosmetica lato frontend (vedi docs/genesis-architecture.md).
@Injectable()
export class MockHouseScanProvider implements HouseScanProvider {
  constructor(private readonly prisma: PrismaService) {}

  async startScan(input: StartScanInput): Promise<ScanSessionResult> {
    const selectedRoomNames = new Set(
      input.roomNames ??
        GENESIS_DEMO_ROOMS.slice(0, 4).map((room) => room.proposedName),
    );
    const selectedAssetNames = new Set(
      input.assetNames ??
        GENESIS_DEMO_ASSETS.slice(0, 7).map((asset) => asset.proposedName),
    );
    const rooms = GENESIS_DEMO_ROOMS.filter((room) =>
      selectedRoomNames.has(room.proposedName),
    );
    const assets = GENESIS_DEMO_ASSETS.filter((asset) =>
      selectedAssetNames.has(asset.proposedName),
    );
    const session = await this.prisma.scanSession.create({
      data: {
        houseId: input.houseId,
        type: 'GUIDED_MOCK',
        status: 'PROCESSING',
      },
    });

    await this.prisma.observation.createMany({
      data: [
        ...rooms.map((room) => ({
          scanSessionId: session.id,
          entityType: 'ROOM' as const,
          proposedName: room.proposedName,
          proposedCategory: room.roomType,
          confidence: room.confidence,
          payload: { roomType: room.roomType },
          status: 'PENDING' as const,
        })),
        ...assets.map((asset) => ({
          scanSessionId: session.id,
          entityType: 'ASSET' as const,
          proposedName: asset.proposedName,
          proposedCategory: asset.assetType,
          confidence: asset.confidence,
          payload: { assetType: asset.assetType, roomName: asset.roomName },
          status: 'PENDING' as const,
        })),
      ],
    });

    const completed = await this.prisma.scanSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return {
      id: completed.id,
      houseId: completed.houseId,
      type: completed.type,
      status: completed.status,
      startedAt: completed.startedAt,
      completedAt: completed.completedAt,
    };
  }

  async getResults(scanSessionId: string): Promise<ScanObservationResult[]> {
    const observations = await this.prisma.observation.findMany({
      where: { scanSessionId },
      orderBy: { createdAt: 'asc' },
    });
    return observations.map((o) => ({
      id: o.id,
      scanSessionId: o.scanSessionId,
      entityType: o.entityType,
      proposedName: o.proposedName,
      proposedCategory: o.proposedCategory,
      confidence: o.confidence,
      payload: o.payload as Record<string, unknown>,
      status: o.status,
    }));
  }
}
