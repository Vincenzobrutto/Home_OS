import { EvidenceStatus } from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from './reliability.service';

const assertHouseAccess = jest.fn().mockResolvedValue(undefined);
const accessControl = {
  assertHouseAccess,
} as unknown as AccessControlService;

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    asset: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'asset-1',
          _count: { documents: 1 },
          fieldProvenance: [
            { fieldName: 'installedAt' },
            { fieldName: 'manufacturer' },
          ],
        },
        {
          id: 'asset-2',
          _count: { documents: 0 },
          fieldProvenance: [],
        },
      ]),
    },
    intervention: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { evidenceStatus: EvidenceStatus.VERIFIED_PRESENT },
          { evidenceStatus: EvidenceStatus.UNKNOWN },
        ]),
    },
    warranty: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ evidenceStatus: EvidenceStatus.UNKNOWN }]),
    },
    ...overrides,
  };
  return {
    prisma,
    service: new ReliabilityService(
      prisma as unknown as PrismaService,
      accessControl,
    ),
  };
}

describe('ReliabilityService', () => {
  it('checks house access before reading any data', async () => {
    const { service } = makeService();
    await service.evaluateHouse('user-1', 'house-1');
    expect(assertHouseAccess).toHaveBeenCalledWith('user-1', 'house-1');
  });

  it('counts asset documentation, field coverage and fact evidence correctly', async () => {
    const { service } = makeService();

    const result = await service.evaluateHouse('user-1', 'house-1');

    // 1 asset su 2 ha documenti
    expect(result.dimensions.assetDocumentation).toEqual({
      completed: 1,
      total: 2,
    });
    // 2 campi core presenti su 2 asset * 6 campi core = 12 possibili
    expect(result.dimensions.fieldCoverage).toEqual({
      completed: 2,
      total: 12,
    });
    // 1 fatto noto (VERIFIED_PRESENT) su 3 totali (2 interventi + 1 garanzia)
    expect(result.dimensions.factEvidence).toEqual({ completed: 1, total: 3 });
    expect(result.version).toBe('v1');
    expect(result.disclaimer).toContain('non è un dato assente');
  });

  it('scopes warranties by the asset house relation, not a direct houseId', async () => {
    const { prisma, service } = makeService();

    await service.evaluateHouse('user-1', 'house-1');

    expect(prisma.warranty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asset: { houseId: 'house-1' } },
      }),
    );
  });
});
