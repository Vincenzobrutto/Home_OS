import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { AssetsService } from '../assets/assets.service';
import { GenesisService } from './genesis.service';
import type { HouseScanProvider } from './scan/house-scan-provider.interface';

describe('GenesisService.confirmObservations', () => {
  it('converts confirmed observations into real Room/Asset rows, skips rejected ones, and links the asset to the room confirmed in the same batch', async () => {
    const roomObservation = {
      id: 'obs-room-1',
      scanSessionId: 'sess-1',
      entityType: 'ROOM',
      proposedName: 'Cucina',
      proposedCategory: 'CUCINA',
      confidence: 0.93,
      payload: { roomType: 'CUCINA' },
      status: 'PENDING',
    };
    const assetObservation = {
      id: 'obs-asset-1',
      scanSessionId: 'sess-1',
      entityType: 'ASSET',
      proposedName: 'Frigorifero',
      proposedCategory: 'ELETTRODOMESTICO',
      confidence: 0.89,
      payload: { assetType: 'ELETTRODOMESTICO', roomName: 'Cucina' },
      status: 'PENDING',
    };
    const rejectedAssetObservation = {
      id: 'obs-asset-2',
      scanSessionId: 'sess-1',
      entityType: 'ASSET',
      proposedName: 'Impianto fotovoltaico',
      proposedCategory: 'FOTOVOLTAICO',
      confidence: 0.7,
      payload: { assetType: 'FOTOVOLTAICO', roomName: null },
      status: 'PENDING',
    };

    const observationUpdate = jest.fn();
    const prisma = {
      scanSession: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'sess-1', houseId: 'house-1' }),
      },
      observation: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            roomObservation,
            assetObservation,
            rejectedAssetObservation,
          ]),
        update: observationUpdate,
      },
    };

    const roomCreate = jest
      .fn()
      .mockResolvedValue({ id: 'room-real-1', name: 'Cucina' });
    const assetCreate = jest.fn().mockResolvedValue({ id: 'asset-real-1' });
    const scanProvider: HouseScanProvider = {
      startScan: jest.fn(),
      getResults: jest.fn().mockResolvedValue([]),
    };

    const service = new GenesisService(
      prisma as unknown as PrismaService,
      { create: roomCreate } as unknown as RoomsService,
      { create: assetCreate } as unknown as AssetsService,
      scanProvider,
    );

    await service.confirmObservations('house-1', 'sess-1', {
      items: [
        { observationId: 'obs-room-1', action: 'confirm' },
        { observationId: 'obs-asset-1', action: 'confirm' },
        { observationId: 'obs-asset-2', action: 'reject' },
      ],
    });

    expect(roomCreate).toHaveBeenCalledTimes(1);
    expect(roomCreate).toHaveBeenCalledWith('house-1', {
      type: 'CUCINA',
      name: 'Cucina',
      confidence: 0.93,
      source: 'SCAN_MOCK',
      confirmed: true,
    });

    expect(assetCreate).toHaveBeenCalledTimes(1);
    expect(assetCreate).toHaveBeenCalledWith('house-1', {
      roomId: 'room-real-1',
      type: 'ELETTRODOMESTICO',
      name: 'Frigorifero',
      confidence: 0.89,
      source: 'SCAN_MOCK',
      confirmed: true,
    });

    expect(observationUpdate).toHaveBeenCalledTimes(3);
    expect(observationUpdate).toHaveBeenCalledWith({
      where: { id: 'obs-asset-2' },
      data: { status: 'REJECTED' },
    });
  });
});

describe('GenesisService issue/recommendation reconciliation (idempotency)', () => {
  function buildService(prisma: Record<string, unknown>) {
    return new GenesisService(
      prisma as unknown as PrismaService,
      {} as unknown as RoomsService,
      {} as unknown as AssetsService,
      {} as unknown as HouseScanProvider,
    );
  }

  it('creates a new Issue + Recommendation when none exists yet for that rule', async () => {
    const issueCreate = jest.fn().mockResolvedValue({
      id: 'issue-new',
      ruleCode: 'HOUSE_WITHOUT_DOCUMENTS',
    });
    const recommendationCreate = jest.fn();
    const prisma = {
      issue: {
        findMany: jest.fn().mockResolvedValue([]),
        create: issueCreate,
        update: jest.fn(),
      },
      recommendation: { create: recommendationCreate, update: jest.fn() },
    };
    const service = buildService(prisma);

    await (
      service as unknown as {
        reconcileIssues: (houseId: string, drafts: unknown[]) => Promise<void>;
      }
    ).reconcileIssues('house-1', [
      {
        ruleCode: 'HOUSE_WITHOUT_DOCUMENTS',
        assetId: null,
        category: 'documentation',
        severity: 'MEDIUM',
        title: 'Nessun documento caricato',
        description: 'desc',
        resolutionHint: 'hint',
      },
    ]);

    expect(issueCreate).toHaveBeenCalledTimes(1);
    expect(recommendationCreate).toHaveBeenCalledTimes(1);
    const firstCallArgs = recommendationCreate.mock.calls[0] as unknown[];
    const recommendationArg = firstCallArgs[0] as {
      data: { issueId: string };
    };
    expect(recommendationArg.data.issueId).toBe('issue-new');
  });

  it('does not duplicate an Issue that is already OPEN for the same rule, and resolves one that is no longer valid', async () => {
    const issueUpdate = jest.fn();
    const recommendationUpdate = jest.fn();
    const issueCreate = jest.fn();
    const prisma = {
      issue: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'issue-1',
            ruleCode: 'HOUSE_WITHOUT_DOCUMENTS',
            assetId: null,
            status: 'OPEN',
            recommendations: [],
          },
          {
            id: 'issue-2',
            ruleCode: 'GENESIS_INCOMPLETE',
            assetId: null,
            status: 'OPEN',
            recommendations: [{ id: 'rec-2', status: 'OPEN' }],
          },
        ]),
        create: issueCreate,
        update: issueUpdate,
      },
      recommendation: { create: jest.fn(), update: recommendationUpdate },
    };
    const service = buildService(prisma);

    // Solo HOUSE_WITHOUT_DOCUMENTS è ancora valido: GENESIS_INCOMPLETE non
    // compare più tra i draft (es. il percorso è stato completato).
    await (
      service as unknown as {
        reconcileIssues: (houseId: string, drafts: unknown[]) => Promise<void>;
      }
    ).reconcileIssues('house-1', [
      {
        ruleCode: 'HOUSE_WITHOUT_DOCUMENTS',
        assetId: null,
        category: 'documentation',
        severity: 'MEDIUM',
        title: 'Nessun documento caricato',
        description: 'desc',
        resolutionHint: 'hint',
      },
    ]);

    expect(issueCreate).not.toHaveBeenCalled();
    expect(issueUpdate).toHaveBeenCalledTimes(1);
    expect(issueUpdate).toHaveBeenCalledWith({
      where: { id: 'issue-2' },
      data: { status: 'RESOLVED', resolvedAt: expect.any(Date) as Date },
    });
    expect(recommendationUpdate).toHaveBeenCalledTimes(1);
    expect(recommendationUpdate).toHaveBeenCalledWith({
      where: { id: 'rec-2' },
      data: { status: 'DONE' },
    });
  });
});
