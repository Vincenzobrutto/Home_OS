import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { ClaudeExtractionService } from './claude-extraction.service';
import { DocumentsService } from './documents.service';

const accessControl = {
  assertHouseAccess: jest.fn().mockResolvedValue(undefined),
} as unknown as AccessControlService;

describe('DocumentsService.confirmUtilityBill', () => {
  it('creates confirmed consumption periods and confirms the source document in one transaction', async () => {
    const createMany = jest.fn();
    const documentUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'doc-1', status: 'CONFIRMED' });
    const prisma = {
      document: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'doc-1',
          houseId: 'house-1',
          status: 'ANALYZED',
          extractedFields: { kind: 'utility_bill' },
        }),
      },
      utilityBill: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(
        async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            utilityBill: { createMany },
            document: { update: documentUpdate },
          }),
      ),
    };
    const service = new DocumentsService(
      prisma as unknown as PrismaService,
      {} as ClaudeExtractionService,
      accessControl,
    );

    await service.confirmUtilityBill('user-1', 'doc-1', {
      supplier: 'Energia Casa',
      periods: [
        {
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
          consumptionKwh: 250,
          amount: 75,
        },
      ],
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          houseId: 'house-1',
          documentId: 'doc-1',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
          consumptionKwh: 250,
          amount: 75,
          supplier: 'Energia Casa',
        },
      ],
    });
    expect(documentUpdate).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: {
        status: 'CONFIRMED',
        confirmedAt: expect.any(Date) as Date,
        houseLevel: true,
      },
    });
  });

  it('rejects an inverted billing period before opening the transaction', async () => {
    const transaction = jest.fn();
    const prisma = {
      document: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'doc-1',
          houseId: 'house-1',
          status: 'ANALYZED',
          extractedFields: { kind: 'utility_bill' },
        }),
      },
      utilityBill: { count: jest.fn().mockResolvedValue(0) },
      $transaction: transaction,
    };
    const service = new DocumentsService(
      prisma as unknown as PrismaService,
      {} as ClaudeExtractionService,
      accessControl,
    );

    await expect(
      service.confirmUtilityBill('user-1', 'doc-1', {
        periods: [
          {
            periodStart: new Date('2026-02-01'),
            periodEnd: new Date('2026-01-01'),
            consumptionKwh: 10,
          },
        ],
      }),
    ).rejects.toThrow('fine del periodo');
    expect(transaction).not.toHaveBeenCalled();
  });
});
