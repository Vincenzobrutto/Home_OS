import { AssetStatus, DocumentStatus } from '@prisma/client';
import { ClaudeExtractionService } from './claude-extraction.service';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';

describe('DocumentsService domain rules', () => {
  const documentFindUnique = jest.fn();
  const documentUpdate = jest.fn<(input: unknown) => Promise<unknown>>();
  const assetFindMany = jest.fn();
  const assetFindUnique = jest.fn();
  const assetFindUniqueOrThrow = jest.fn();
  const assetUpdate = jest.fn();
  const customFieldFindMany = jest.fn();
  const customFieldCreate = jest.fn();
  const timelineCreate = jest.fn();
  const maintenancePlanFindMany = jest.fn();
  const transaction = jest.fn();
  const extract = jest.fn();

  const prisma = {
    document: {
      findUnique: documentFindUnique,
      update: documentUpdate,
    },
    asset: {
      findMany: assetFindMany,
      findUnique: assetFindUnique,
      findUniqueOrThrow: assetFindUniqueOrThrow,
      update: assetUpdate,
    },
    assetCustomField: {
      findMany: customFieldFindMany,
      create: customFieldCreate,
    },
    assetTimelineEvent: { create: timelineCreate },
    maintenancePlan: { findMany: maintenancePlanFindMany },
    $transaction: transaction,
  };
  const claude = { extract };

  // Stub: questi test coprono le regole di dominio della pipeline
  // documentale, non l'autorizzazione — vedi access-control.service.spec.ts
  // (se presente) per quella.
  const accessControl = {
    assertHouseAccess: jest.fn().mockResolvedValue(undefined),
  };

  let service: DocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-02T12:00:00Z'));
    service = new DocumentsService(
      prisma as unknown as PrismaService,
      claude as unknown as ClaudeExtractionService,
      accessControl as unknown as AccessControlService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('only suggests an existing asset when both type and name match', async () => {
    extract.mockResolvedValue({
      kind: 'asset_document',
      docType: 'Manuale',
      suggestedAssetType: 'elettrodomestico',
      suggestedAssetName: 'Forno Bosch Serie 8',
      quantity: 1,
      confidence: 96,
      isHomeRelated: true,
      fields: [],
    });
    assetFindMany.mockResolvedValue([
      { id: 'fridge-id', name: 'Frigorifero Samsung' },
      { id: 'oven-id', name: 'Forno Bosch Serie 8' },
    ]);

    const result = await service.classifyBuffer(
      Buffer.from('document'),
      'manuale.pdf',
      'house-id',
    );

    expect(result.data.extractedFields).toMatchObject({
      suggestedAssetType: 'ELETTRODOMESTICO',
      suggestedAssetId: 'oven-id',
    });
    expect(assetFindMany).toHaveBeenCalledWith({
      where: {
        houseId: 'house-id',
        type: 'ELETTRODOMESTICO',
        dismissedAt: null,
      },
      select: { id: true, name: true },
    });
    expect(assetUpdate).not.toHaveBeenCalled();
    expect(customFieldCreate).not.toHaveBeenCalled();
  });

  it('does not match on a shared brand name alone (different products)', async () => {
    extract.mockResolvedValue({
      kind: 'asset_document',
      docType: 'Manuale',
      suggestedAssetType: 'elettrodomestico',
      suggestedAssetName: 'Forno Bosch Serie 8',
      quantity: 1,
      confidence: 92,
      isHomeRelated: true,
      fields: [],
    });
    assetFindMany.mockResolvedValue([
      { id: 'fridge-id', name: 'Frigorifero Bosch' },
    ]);

    const result = await service.classifyBuffer(
      Buffer.from('document'),
      'manuale.pdf',
      'house-id',
    );

    expect(result.data.extractedFields).toMatchObject({
      suggestedAssetId: null,
    });
  });

  it('leaves the suggestion empty when names do not match', async () => {
    extract.mockResolvedValue({
      kind: 'asset_document',
      docType: 'Manuale',
      suggestedAssetType: 'elettrodomestico',
      suggestedAssetName: 'Lavatrice Samsung',
      quantity: 1,
      confidence: 90,
      isHomeRelated: true,
      fields: [],
    });
    assetFindMany.mockResolvedValue([
      { id: 'oven-id', name: 'Forno Bosch Serie 8' },
    ]);

    const result = await service.classifyBuffer(
      Buffer.from('document'),
      'manuale.pdf',
      'house-id',
    );

    expect(result.data.extractedFields).toMatchObject({
      suggestedAssetId: null,
    });
  });

  it('proposes multiple compatible maintenance plans up to the extracted quantity', async () => {
    documentFindUnique.mockResolvedValue({
      id: 'document-id',
      houseId: 'house-id',
      extractedFields: {
        kind: 'asset_document',
        suggestedAssetType: 'CLIMA',
        suggestedAssetId: null,
        maintenanceInterventions: [
          {
            title: 'Pulizia filtri climatizzatori',
            completedAt: '2026-07-28',
            quantity: 2,
            notes: null,
          },
        ],
      },
    });
    maintenancePlanFindMany.mockResolvedValue([
      {
        id: 'plan-1',
        assetId: 'asset-1',
        title: 'Pulizia filtri',
        description: null,
        asset: { id: 'asset-1', name: 'Clima sala' },
        occurrences: [],
      },
      {
        id: 'plan-2',
        assetId: 'asset-2',
        title: 'Pulizia filtri',
        description: null,
        asset: { id: 'asset-2', name: 'Clima camera' },
        occurrences: [],
      },
      {
        id: 'plan-3',
        assetId: 'asset-3',
        title: 'Controllo gas refrigerante',
        description: null,
        asset: { id: 'asset-3', name: 'Clima studio' },
        occurrences: [],
      },
    ]);

    const proposals = await service.maintenanceProposals(
      'user-id',
      'document-id',
    );

    expect(proposals).toHaveLength(1);
    expect(
      proposals[0].candidates
        .filter((candidate) => candidate.recommended)
        .map((candidate) => candidate.maintenancePlanId),
    ).toEqual(['plan-1', 'plan-2']);
    expect(
      proposals[0].candidates.some(
        (candidate) => candidate.maintenancePlanId === 'plan-3',
      ),
    ).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fills only empty asset fields after explicit confirmation', async () => {
    const document = {
      id: 'document-id',
      houseId: 'house-id',
      originalFilename: 'fattura.pdf',
      extractedFields: {
        kind: 'asset_document',
        fields: [
          ['Marca', 'Nuova marca da ignorare'],
          ['Numero seriale', 'SN-123'],
          ['Data acquisto', '15/03/2024'],
        ],
      },
    };
    const asset = {
      id: 'asset-id',
      houseId: 'house-id',
      installedAt: null,
      warrantyUntil: null,
      purchasedAt: null,
      serialNumber: null,
      manufacturer: 'Marca confermata',
      model: null,
      supplier: null,
    };
    documentFindUnique.mockResolvedValue(document);
    assetFindUnique.mockResolvedValue(asset);
    assetFindUniqueOrThrow.mockResolvedValueOnce(asset).mockResolvedValueOnce({
      ...asset,
      purchasedAt: new Date('2024-03-15T00:00:00Z'),
      warrantyUntil: new Date('2026-03-15T00:00:00Z'),
      _count: { documents: 1 },
    });
    customFieldFindMany.mockResolvedValue([]);
    assetUpdate.mockResolvedValue(asset);
    documentUpdate.mockResolvedValue(document);
    timelineCreate.mockResolvedValue({ id: 'event-id' });
    transaction.mockResolvedValue([document, { id: 'event-id' }, document]);

    await service.confirm('user-id', 'document-id', {
      assetId: 'asset-id',
      applyFields: true,
    });

    expect(assetUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'asset-id' },
      data: {
        serialNumber: 'SN-123',
        purchasedAt: new Date('2024-03-15T00:00:00Z'),
        warrantyUntil: new Date('2026-03-15T00:00:00Z'),
      },
    });
    expect(assetUpdate).toHaveBeenLastCalledWith({
      where: { id: 'asset-id' },
      data: { status: AssetStatus.DUE },
    });
    expect(customFieldCreate).not.toHaveBeenCalled();
    expect(documentUpdate).toHaveBeenCalledWith({
      where: { id: 'document-id' },
      data: {
        assetId: 'asset-id',
        status: DocumentStatus.CONFIRMED,
        confirmedAt: new Date('2026-08-02T12:00:00Z'),
      },
    });
  });
});
