import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { ClaudeExtractionService } from './claude-extraction.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService.confirmPropertyProfile', () => {
  it('fills only empty fields, records the document source and reports conflicts', async () => {
    const houseUpdate = jest.fn().mockResolvedValue({});
    const provenanceUpsert = jest.fn().mockResolvedValue({});
    const documentUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      document: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'doc-1',
          houseId: 'house-1',
          status: 'ANALYZED',
          extractedFields: { kind: 'property_profile' },
        }),
        update: documentUpdate,
      },
      house: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'house-1',
          city: 'Milano',
          energyClass: null,
        }),
        update: houseUpdate,
      },
      houseFieldProvenance: { upsert: provenanceUpsert },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const service = new DocumentsService(
      prisma as unknown as PrismaService,
      {} as ClaudeExtractionService,
      { assertHouseAccess: jest.fn() } as unknown as AccessControlService,
    );

    const result = await service.confirmPropertyProfile('user-1', 'doc-1', {
      fields: { city: 'Roma', energyClass: 'C' },
    });

    expect(result).toEqual({
      appliedFields: ['energyClass'],
      conflicts: ['city'],
    });
    expect(houseUpdate).toHaveBeenCalledWith({
      where: { id: 'house-1' },
      data: { energyClass: 'C' },
    });
    expect(provenanceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          houseId: 'house-1',
          fieldName: 'energyClass',
          origin: 'EXTRACTED',
          sourceDocumentId: 'doc-1',
          confirmedByUserId: 'user-1',
        }) as object,
      }),
    );
    expect(documentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMED',
          houseLevel: true,
        }) as object,
      }),
    );
  });
});
