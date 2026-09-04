import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { HousesService } from './houses.service';

const assertHouseOwner = jest.fn().mockResolvedValue(undefined);
const accessControl = {
  assertHouseOwner,
} as unknown as AccessControlService;

describe('HousesService.remove', () => {
  it("verifica che l'utente sia OWNER prima di cancellare la casa", async () => {
    const houseDelete = jest.fn().mockResolvedValue(undefined);
    const documentFindMany = jest
      .fn()
      .mockResolvedValue([{ fileUrl: 'uploads/documento.pdf' }]);
    const withFilesRemoved = jest.fn(
      async (
        _fileUrls: string[],
        removeDatabaseRecords: () => Promise<unknown>,
      ) => removeDatabaseRecords(),
    );
    const prisma = {
      house: { delete: houseDelete },
      document: { findMany: documentFindMany },
    };
    const service = new HousesService(
      prisma as unknown as PrismaService,
      accessControl,
      { withFilesRemoved } as never,
    );

    await service.remove('user-1', 'house-1');

    expect(assertHouseOwner).toHaveBeenCalledWith('user-1', 'house-1');
    expect(documentFindMany).toHaveBeenCalledWith({
      where: { houseId: 'house-1' },
      select: { fileUrl: true },
    });
    expect(withFilesRemoved).toHaveBeenCalledWith(
      ['uploads/documento.pdf'],
      expect.any(Function),
    );
    expect(houseDelete).toHaveBeenCalledWith({ where: { id: 'house-1' } });
  });
});

describe('HousesService.exportArchive', () => {
  it('crea uno ZIP con manifest e file originali senza esporre fileUrl', async () => {
    const prisma = {
      house: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'house-1',
          code: 'CASA-0001',
          name: 'Casa',
          city: 'Roma',
          surfaceSqm: null,
          roomsCount: null,
          buildYear: null,
        }),
      },
      room: { findMany: jest.fn().mockResolvedValue([]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
      document: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'doc-1',
            assetId: null,
            fileUrl: 'uploads/interno.pdf',
            originalFilename: 'manuale caldaia.pdf',
            docType: 'Manuale',
            status: 'CONFIRMED',
            houseLevel: true,
            uploadedAt: new Date('2026-09-04'),
            confirmedAt: new Date('2026-09-04'),
          },
        ]),
      },
      intervention: { findMany: jest.fn().mockResolvedValue([]) },
      warranty: { findMany: jest.fn().mockResolvedValue([]) },
      contact: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new HousesService(
      prisma as unknown as PrismaService,
      { assertHouseAccess: jest.fn() } as unknown as AccessControlService,
      {
        resolveExisting: jest.fn().mockReturnValue(__filename),
      } as never,
    );

    const { archive, filename } = await service.exportArchive(
      'user-1',
      'house-1',
    );
    const chunks: Buffer[] = [];
    for await (const chunk of archive) chunks.push(Buffer.from(chunk));
    const zip = Buffer.concat(chunks).toString('latin1');

    expect(filename).toMatch(/^dimora-CASA-0001-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(zip).toContain('dimora-data.json');
    expect(zip).toContain('documents/doc-1-manuale_caldaia.pdf');
    expect(zip).not.toContain('uploads/interno.pdf');
  });
});
