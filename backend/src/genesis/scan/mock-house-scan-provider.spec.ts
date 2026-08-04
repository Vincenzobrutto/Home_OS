import { PrismaService } from '../../prisma/prisma.service';
import { MockHouseScanProvider } from './mock-house-scan-provider';

describe('MockHouseScanProvider catalog selection', () => {
  it('creates observations only for rooms and assets explicitly selected', async () => {
    let createdNames: string[] = [];
    const createMany = jest.fn(
      (input: { data: Array<{ proposedName: string }> }) => {
        createdNames = input.data.map((item) => item.proposedName);
        return Promise.resolve({ count: input.data.length });
      },
    );
    const prisma = {
      scanSession: {
        create: jest.fn().mockResolvedValue({ id: 'scan', houseId: 'house' }),
        update: jest.fn().mockResolvedValue({
          id: 'scan',
          houseId: 'house',
          type: 'GUIDED_MOCK',
          status: 'COMPLETED',
          startedAt: new Date(),
          completedAt: new Date(),
        }),
      },
      observation: { createMany },
    };
    const provider = new MockHouseScanProvider(
      prisma as unknown as PrismaService,
    );

    await provider.startScan({
      houseId: 'house',
      type: 'GUIDED_MOCK',
      roomNames: ['Studio', 'Garage'],
      assetNames: ['Climatizzatore studio'],
    });

    expect(createdNames).toEqual(['Studio', 'Garage', 'Climatizzatore studio']);
    expect(createdNames).toHaveLength(3);
  });
});
