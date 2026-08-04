import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { AssetsService } from '../assets/assets.service';
import { GenesisService } from './genesis.service';
import type { HouseScanProvider } from './scan/house-scan-provider.interface';
import { GenesisStep } from '@prisma/client';

describe('GenesisService precise resume', () => {
  it('restores the latest scan session and its observations when the saved step is REVIEW', async () => {
    const session = { id: 'sess-2', houseId: 'house-1', startedAt: new Date() };
    const observations = [
      {
        id: 'obs-1',
        entityType: 'ROOM',
        proposedName: 'Cucina',
        proposedCategory: 'CUCINA',
      },
    ];
    const prisma = {
      house: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'house-1',
          genesisStep: GenesisStep.REVIEW,
        }),
      },
      scanSession: {
        findFirst: jest.fn().mockResolvedValue(session),
        findUnique: jest.fn().mockResolvedValue(session),
      },
      room: { findMany: jest.fn().mockResolvedValue([]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const scanProvider: HouseScanProvider = {
      startScan: jest.fn(),
      getResults: jest.fn().mockResolvedValue(observations),
    };
    const service = new GenesisService(
      prisma as unknown as PrismaService,
      {} as RoomsService,
      {} as AssetsService,
      scanProvider,
    );

    const state = await service.resume('house-1');

    expect(prisma.scanSession.findFirst).toHaveBeenCalledWith({
      where: { houseId: 'house-1' },
      orderBy: { startedAt: 'desc' },
    });
    expect(state).toMatchObject({
      step: GenesisStep.REVIEW,
      scanSession: session,
    });
    expect(state.observations[0]).toMatchObject({
      id: 'obs-1',
      possibleDuplicate: null,
    });
  });

  it('does not allow a client to skip forward by more than one step', async () => {
    const prisma = {
      house: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'house-1',
          genesisStep: GenesisStep.DOCUMENTS,
        }),
      },
    };
    const service = new GenesisService(
      prisma as unknown as PrismaService,
      {} as RoomsService,
      {} as AssetsService,
      {} as HouseScanProvider,
    );

    await expect(
      service.saveStep('house-1', GenesisStep.REVIEW),
    ).rejects.toThrow('Cannot skip Genesis steps');
  });
});

describe('GenesisService Home Score history', () => {
  it('does not create a duplicate snapshot when recalculation has identical values and version', async () => {
    const latest = {
      id: 'score-1',
      houseId: 'house-1',
      overallScore: 82,
      documentationScore: 70,
      maintenanceScore: 100,
      safetyScore: 100,
      efficiencyScore: 100,
      completenessScore: 30,
      calculationVersion: 'v1',
      calculatedAt: new Date(),
    };
    const snapshotCreate = jest.fn();
    const prisma = {
      house: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'house-1',
          genesisStatus: 'COMPLETED',
        }),
      },
      asset: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      document: { count: jest.fn().mockResolvedValue(0) },
      room: { count: jest.fn().mockResolvedValue(0) },
      observation: { count: jest.fn().mockResolvedValue(0) },
      scoreSnapshot: {
        findFirst: jest.fn().mockResolvedValue(latest),
        create: snapshotCreate,
      },
      issue: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'issue-1' }),
      },
      recommendation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };
    const service = new GenesisService(
      prisma as unknown as PrismaService,
      {} as RoomsService,
      {} as AssetsService,
      {} as HouseScanProvider,
    );

    const result = await service.recalculateScore('house-1');

    expect(result.snapshotCreated).toBe(false);
    expect(snapshotCreate).not.toHaveBeenCalled();
  });

  it('returns snapshots from the last twelve months in chronological order', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      house: { findUnique: jest.fn().mockResolvedValue({ id: 'house-1' }) },
      scoreSnapshot: { findMany },
    };
    const service = new GenesisService(
      prisma as unknown as PrismaService,
      {} as RoomsService,
      {} as AssetsService,
      {} as HouseScanProvider,
    );

    await service.getScoreHistory('house-1');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        houseId: 'house-1',
        calculatedAt: { gte: expect.any(Date) as Date },
      },
      orderBy: { calculatedAt: 'asc' },
    });
  });
});

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
      // Nessun duplicato preesistente in questo scenario.
      room: { findMany: jest.fn().mockResolvedValue([]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
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

describe('GenesisService.confirmObservations — duplicate rooms', () => {
  it('when a Room observation is rejected as a duplicate, an Asset observed in the same batch still links to the real pre-existing room instead of becoming house-level', async () => {
    const roomObservation = {
      id: 'obs-room-1',
      scanSessionId: 'sess-1',
      entityType: 'ROOM',
      proposedName: 'Bagno',
      proposedCategory: 'BAGNO',
      confidence: 0.85,
      payload: { roomType: 'BAGNO' },
      status: 'PENDING',
    };
    const assetObservation = {
      id: 'obs-asset-1',
      scanSessionId: 'sess-1',
      entityType: 'ASSET',
      proposedName: 'Scaldabagno',
      proposedCategory: 'CALDAIA',
      confidence: 0.78,
      payload: { assetType: 'CALDAIA', roomName: 'Bagno' },
      status: 'PENDING',
    };

    const observationUpdate = jest.fn();
    const preExistingBathroom = {
      id: 'room-real-bagno-1',
      name: 'bagno_1',
      type: 'BAGNO',
    };
    const prisma = {
      scanSession: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'sess-1', houseId: 'house-1' }),
      },
      observation: {
        findMany: jest
          .fn()
          .mockResolvedValue([roomObservation, assetObservation]),
        update: observationUpdate,
      },
      room: { findMany: jest.fn().mockResolvedValue([preExistingBathroom]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const roomCreate = jest.fn();
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
        // L'utente scarta "Bagno" perché assomiglia a "bagno_1" già in casa.
        { observationId: 'obs-room-1', action: 'reject' },
        { observationId: 'obs-asset-1', action: 'confirm' },
      ],
    });

    expect(roomCreate).not.toHaveBeenCalled();
    expect(assetCreate).toHaveBeenCalledWith('house-1', {
      roomId: 'room-real-bagno-1',
      type: 'CALDAIA',
      name: 'Scaldabagno',
      confidence: 0.78,
      source: 'SCAN_MOCK',
      confirmed: true,
    });
  });
});

describe('GenesisService.getScanResults — duplicate detection', () => {
  it('flags an observation whose proposed name matches an existing confirmed Room of the same type', async () => {
    const prisma = {
      scanSession: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'sess-1', houseId: 'house-1' }),
      },
      room: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'room-1', name: 'cucina', type: 'CUCINA' },
          ]),
      },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const scanProvider: HouseScanProvider = {
      startScan: jest.fn(),
      getResults: jest.fn().mockResolvedValue([
        {
          id: 'obs-1',
          scanSessionId: 'sess-1',
          entityType: 'ROOM',
          proposedName: 'Cucina',
          proposedCategory: 'CUCINA',
          confidence: 0.9,
          payload: {},
          status: 'PENDING',
        },
      ]),
    };
    const service = new GenesisService(
      prisma as unknown as PrismaService,
      {} as unknown as RoomsService,
      {} as unknown as AssetsService,
      scanProvider,
    );

    const results = await service.getScanResults('house-1', 'sess-1');

    expect(results[0].possibleDuplicate).toEqual({
      id: 'room-1',
      name: 'cucina',
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
