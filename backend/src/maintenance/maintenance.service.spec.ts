import { MaintenanceRecurrenceUnit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { MaintenanceService } from './maintenance.service';

const accessControl = {
  assertHouseAccess: jest.fn().mockResolvedValue(undefined),
} as unknown as AccessControlService;

describe('MaintenanceService document confirmation', () => {
  it('completes every selected plan in one transaction and links the document', async () => {
    const occurrenceCreate = jest.fn();
    const interventionCreate = jest
      .fn()
      .mockResolvedValue({ id: 'intervention-1' });
    const planUpdate = jest.fn();
    const prisma = {
      document: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'doc', houseId: 'house' }),
      },
      maintenancePlan: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'plan-1',
            assetId: 'asset-1',
            title: 'Pulizia filtri',
            pausedAt: null,
            completedAt: null,
            nextDueAt: new Date('2026-08-01'),
            recurrenceUnit: MaintenanceRecurrenceUnit.MONTH,
            recurrenceInterval: 6,
            asset: { houseId: 'house' },
          },
          {
            id: 'plan-2',
            assetId: 'asset-2',
            title: 'Pulizia filtri',
            pausedAt: null,
            completedAt: null,
            nextDueAt: new Date('2026-08-01'),
            recurrenceUnit: MaintenanceRecurrenceUnit.MONTH,
            recurrenceInterval: 6,
            asset: { houseId: 'house' },
          },
        ]),
      },
      maintenanceOccurrence: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<void>) =>
        callback({
          maintenanceOccurrence: { create: occurrenceCreate },
          intervention: { create: interventionCreate },
          maintenancePlan: { update: planUpdate },
        }),
      ),
    };
    const service = new MaintenanceService(
      prisma as unknown as PrismaService,
      accessControl,
    );

    const result = await service.completeFromDocument('user-1', 'doc', {
      items: [
        {
          maintenancePlanId: 'plan-1',
          completedAt: new Date('2026-07-28'),
          notes: 'Fattura tecnico',
        },
        { maintenancePlanId: 'plan-2', completedAt: new Date('2026-07-28') },
      ],
    });

    expect(result).toEqual({ completed: 2 });
    expect(occurrenceCreate).toHaveBeenCalledTimes(2);
    expect(interventionCreate).toHaveBeenCalledTimes(1);
    expect(planUpdate).toHaveBeenCalledTimes(2);
    expect(occurrenceCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        // Matcher Jest tipizzato come any: confinato all'asserzione del payload.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          documentId: 'doc',
          assetId: 'asset-1',
          interventionId: 'intervention-1',
        }),
      }),
    );
    expect(interventionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          houseId: 'house',
          assets: {
            create: [{ assetId: 'asset-1' }, { assetId: 'asset-2' }],
          },
          documents: {
            create: expect.objectContaining({ documentId: 'doc' }),
          },
        }),
      }),
    );
  });
});
