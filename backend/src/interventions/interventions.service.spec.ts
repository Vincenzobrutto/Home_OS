import {
  EvidenceStatus,
  InterventionDocumentRole,
  InterventionKind,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { InterventionsService } from './interventions.service';

const accessControl = {
  assertHouseAccess: jest.fn().mockResolvedValue(undefined),
} as unknown as AccessControlService;

function makeService(overrides: Record<string, unknown> = {}) {
  const created = {
    id: 'intervention-1',
    houseId: 'house-1',
    occurredAt: new Date('2026-09-03'),
    kind: InterventionKind.MAINTENANCE,
    title: 'Manutenzione impianti',
    description: null,
    contactId: null,
    contact: null,
    costAmount: 250,
    currency: 'EUR',
    evidenceStatus: EvidenceStatus.VERIFIED_PRESENT,
    createdByUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    assets: [
      {
        assetId: 'asset-1',
        asset: {
          id: 'asset-1',
          name: 'Caldaia',
          code: 'AST-1',
          type: 'CALDAIA',
        },
      },
      {
        assetId: 'asset-2',
        asset: { id: 'asset-2', name: 'Clima', code: 'AST-2', type: 'CLIMA' },
      },
    ],
    documents: [
      {
        documentId: 'doc-1',
        role: InterventionDocumentRole.INVOICE,
        document: {
          id: 'doc-1',
          originalFilename: 'fattura.pdf',
          docType: 'Fattura',
        },
      },
    ],
    maintenanceOccurrences: [],
  };
  const prisma = {
    asset: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'asset-1' }, { id: 'asset-2' }]),
      findUnique: jest.fn().mockResolvedValue({ houseId: 'house-1' }),
    },
    contact: { count: jest.fn().mockResolvedValue(1) },
    document: { findMany: jest.fn().mockResolvedValue([{ id: 'doc-1' }]) },
    intervention: {
      create: jest.fn().mockResolvedValue(created),
      findMany: jest.fn().mockResolvedValue([]),
    },
    assetTimelineEvent: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  return {
    prisma,
    service: new InterventionsService(
      prisma as unknown as PrismaService,
      accessControl,
    ),
  };
}

describe('InterventionsService', () => {
  it('stores one total cost across multiple assets and verifies linked evidence', async () => {
    const { prisma, service } = makeService();
    const result = await service.create('user-1', 'house-1', {
      occurredAt: new Date('2026-09-03'),
      kind: InterventionKind.MAINTENANCE,
      title: 'Manutenzione impianti',
      assetIds: ['asset-1', 'asset-2'],
      costAmount: 250,
      currency: 'EUR',
      evidenceStatus: EvidenceStatus.DECLARED_PRESENT,
      documents: [
        { documentId: 'doc-1', role: InterventionDocumentRole.INVOICE },
      ],
    });

    expect(result.costAmount).toBe(250);
    expect(prisma.intervention.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          costAmount: 250,
          currency: 'EUR',
          evidenceStatus: EvidenceStatus.VERIFIED_PRESENT,
          assets: {
            create: [{ assetId: 'asset-1' }, { assetId: 'asset-2' }],
          },
        }) as unknown,
      }),
    );
  });

  it('does not accept VERIFIED_PRESENT without a confirmed document', async () => {
    const { service } = makeService({
      asset: { findMany: jest.fn().mockResolvedValue([{ id: 'asset-1' }]) },
    });

    await expect(
      service.create('user-1', 'house-1', {
        occurredAt: new Date('2026-09-03'),
        kind: InterventionKind.REPAIR,
        title: 'Riparazione',
        assetIds: ['asset-1'],
        evidenceStatus: EvidenceStatus.VERIFIED_PRESENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps linked legacy events out of the composed timeline', async () => {
    const legacyFindMany = jest.fn().mockResolvedValue([]);
    const { service } = makeService({
      asset: {
        findUnique: jest.fn().mockResolvedValue({ houseId: 'house-1' }),
      },
      intervention: { findMany: jest.fn().mockResolvedValue([]) },
      assetTimelineEvent: { findMany: legacyFindMany },
    });

    await service.timelineForAsset('user-1', 'asset-1');

    expect(legacyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assetId: 'asset-1', interventionId: null },
      }),
    );
  });
});
