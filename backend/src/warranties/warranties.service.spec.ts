import { EvidenceStatus, WarrantyKind } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { WarrantiesService } from './warranties.service';

const assertHouseAccess = jest.fn().mockResolvedValue(undefined);
const accessControl = {
  assertHouseAccess,
} as unknown as AccessControlService;

function makeService(overrides: Record<string, unknown> = {}) {
  const created = {
    id: 'warranty-1',
    assetId: 'asset-1',
    originInterventionId: null,
    providerContactId: null,
    proofDocumentId: null,
    startsAt: null,
    expiresAt: new Date('2027-01-01'),
    kind: WarrantyKind.PURCHASE,
    evidenceStatus: EvidenceStatus.UNKNOWN,
    notes: null,
    confirmedByUserId: 'user-1',
    confirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    providerContact: null,
    proofDocument: null,
  };
  const prisma = {
    asset: {
      findUnique: jest.fn().mockResolvedValue({ houseId: 'house-1' }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ _count: { documents: 0 } }),
      update: jest.fn(),
    },
    contact: { count: jest.fn().mockResolvedValue(1) },
    document: { count: jest.fn().mockResolvedValue(1) },
    warranty: {
      create: jest.fn().mockResolvedValue(created),
      findMany: jest.fn().mockResolvedValue([{ expiresAt: created.expiresAt }]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(created),
      update: jest.fn().mockResolvedValue(created),
    },
    ...overrides,
  };
  return {
    prisma,
    service: new WarrantiesService(
      prisma as unknown as PrismaService,
      accessControl,
    ),
  };
}

describe('WarrantiesService', () => {
  it('marks evidence VERIFIED_PRESENT only when a confirmed proof document is linked', async () => {
    const { prisma, service } = makeService();

    await service.create('user-1', 'asset-1', {
      expiresAt: new Date('2027-01-01'),
      proofDocumentId: 'doc-1',
    });

    // Verifica il payload effettivamente scritto: l'evidenza è risolta da
    // resolveEvidenceStatus, non presa dalla richiesta.
    expect(prisma.warranty.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proofDocumentId: 'doc-1',
          evidenceStatus: EvidenceStatus.VERIFIED_PRESENT,
        }) as object,
      }),
    );
    expect(prisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'asset-1' },
        data: expect.objectContaining({
          warrantyUntil: expect.any(Date) as Date,
        }) as object,
      }),
    );
  });

  it('rejects VERIFIED_PRESENT requested without a proof document', async () => {
    const { service } = makeService();

    await expect(
      service.create('user-1', 'asset-1', {
        expiresAt: new Date('2027-01-01'),
        evidenceStatus: EvidenceStatus.VERIFIED_PRESENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a proof document that is not confirmed or not from the same house', async () => {
    const { service } = makeService({
      document: { count: jest.fn().mockResolvedValue(0) },
    });

    await expect(
      service.create('user-1', 'asset-1', {
        expiresAt: new Date('2027-01-01'),
        proofDocumentId: 'doc-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a provider contact from a different house', async () => {
    const { service } = makeService({
      contact: { count: jest.fn().mockResolvedValue(0) },
    });

    await expect(
      service.create('user-1', 'asset-1', {
        expiresAt: new Date('2027-01-01'),
        providerContactId: 'contact-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists warranties for a whole house, scoped via the asset relation, with asset info included', async () => {
    const houseRow = {
      id: 'warranty-1',
      assetId: 'asset-1',
      asset: { id: 'asset-1', name: 'Caldaia', code: 'AST-001' },
      providerContact: null,
      proofDocument: null,
    };
    const { prisma, service } = makeService({
      warranty: { findMany: jest.fn().mockResolvedValue([houseRow]) },
    });

    const result = await service.listForHouse('user-1', 'house-1');

    expect(assertHouseAccess).toHaveBeenCalledWith('user-1', 'house-1');
    expect(prisma.warranty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asset: { houseId: 'house-1' } },
      }),
    );
    expect(result[0].asset).toEqual(houseRow.asset);
  });

  it('updates the existing legacy-managed warranty instead of creating a duplicate', async () => {
    const legacy = {
      id: 'warranty-legacy',
      assetId: 'asset-1',
      kind: WarrantyKind.PURCHASE,
      providerContactId: null,
      proofDocumentId: null,
      originInterventionId: null,
    };
    const { prisma, service } = makeService({
      warranty: {
        create: jest.fn(),
        findMany: jest
          .fn()
          .mockResolvedValue([{ expiresAt: new Date('2028-01-01') }]),
        findFirst: jest.fn().mockResolvedValue(legacy),
        findUnique: jest.fn().mockResolvedValue(legacy),
        update: jest
          .fn()
          .mockResolvedValue({ ...legacy, expiresAt: new Date('2028-01-01') }),
      },
    });

    const found = await service.findLegacyManagedWarranty('asset-1');
    expect(found).toEqual(legacy);

    await service.update('user-1', 'warranty-legacy', {
      expiresAt: new Date('2028-01-01'),
    });

    expect(prisma.warranty.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'warranty-legacy' },
        data: expect.objectContaining({
          expiresAt: new Date('2028-01-01'),
        }) as object,
      }),
    );
  });
});
