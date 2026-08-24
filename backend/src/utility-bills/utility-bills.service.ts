import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { allocateUtilityPeriods } from './energy-aggregation';

@Injectable()
export class UtilityBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async consumption(userId: string, houseId: string, year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
      throw new BadRequestException('Anno non valido');
    }
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) throw new NotFoundException(`House ${houseId} non trovata`);
    await this.accessControl.assertHouseAccess(userId, houseId);
    const from = new Date(Date.UTC(year - 1, 0, 1));
    const to = new Date(Date.UTC(year, 11, 31));
    const [bills, installations, allPeriods] = await Promise.all([
      this.prisma.utilityBill.findMany({
        where: { houseId, periodStart: { lte: to }, periodEnd: { gte: from } },
      }),
      this.prisma.asset.findMany({
        where: {
          houseId,
          dismissedAt: null,
          installedAt: { gte: new Date(Date.UTC(year, 0, 1)), lte: to },
        },
        select: { id: true, name: true, type: true, installedAt: true },
        orderBy: { installedAt: 'asc' },
      }),
      this.prisma.utilityBill.findMany({
        where: { houseId },
        select: { periodStart: true, periodEnd: true },
      }),
    ]);
    const allocated = allocateUtilityPeriods(
      bills.map((bill) => ({
        periodStart: bill.periodStart,
        periodEnd: bill.periodEnd,
        consumptionKwh: Number(bill.consumptionKwh),
        amount: bill.amount === null ? null : Number(bill.amount),
      })),
    );
    const bucket = new Map(
      allocated.map((item) => [`${item.year}-${item.month}`, item]),
    );
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const current = bucket.get(`${year}-${month}`);
      const previous = bucket.get(`${year - 1}-${month}`);
      const deltaPercent =
        current && previous && previous.kwh > 0
          ? Math.round(((current.kwh - previous.kwh) / previous.kwh) * 1000) /
            10
          : null;
      return {
        month,
        currentKwh: current?.kwh ?? null,
        previousKwh: previous?.kwh ?? null,
        currentAmount: current?.amount ?? null,
        previousAmount: previous?.amount ?? null,
        deltaPercent,
        estimatedCurrent: current?.estimated ?? false,
        estimatedPrevious: previous?.estimated ?? false,
        installations: installations
          .filter((asset) => asset.installedAt?.getUTCMonth() === index)
          .map((asset) => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            installedAt: asset.installedAt,
          })),
      };
    });
    const availableYears = new Set<number>([year]);
    for (const period of allPeriods) {
      for (
        let candidate = period.periodStart.getUTCFullYear();
        candidate <= period.periodEnd.getUTCFullYear();
        candidate++
      )
        availableYears.add(candidate);
    }
    return {
      year,
      previousYear: year - 1,
      availableYears: [...availableYears].sort((a, b) => b - a),
      months,
    };
  }
}
