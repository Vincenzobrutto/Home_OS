export interface UtilityPeriodInput {
  periodStart: Date;
  periodEnd: Date;
  consumptionKwh: number;
  amount: number | null;
}

export interface MonthlyConsumption {
  year: number;
  month: number;
  kwh: number;
  amount: number | null;
  estimated: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function inclusiveDays(start: Date, end: Date) {
  return Math.floor((utcDay(end) - utcDay(start)) / DAY_MS) + 1;
}

export function allocateUtilityPeriods(
  periods: UtilityPeriodInput[],
): MonthlyConsumption[] {
  const buckets = new Map<string, MonthlyConsumption>();
  const monthsWithMissingAmount = new Set<string>();
  for (const period of periods) {
    const totalDays = inclusiveDays(period.periodStart, period.periodEnd);
    if (totalDays <= 0 || period.consumptionKwh <= 0) continue;
    const spansMonths =
      period.periodStart.getUTCFullYear() !==
        period.periodEnd.getUTCFullYear() ||
      period.periodStart.getUTCMonth() !== period.periodEnd.getUTCMonth();
    let cursor = new Date(
      Date.UTC(
        period.periodStart.getUTCFullYear(),
        period.periodStart.getUTCMonth(),
        1,
      ),
    );
    const lastMonth = new Date(
      Date.UTC(
        period.periodEnd.getUTCFullYear(),
        period.periodEnd.getUTCMonth(),
        1,
      ),
    );
    while (cursor <= lastMonth) {
      const year = cursor.getUTCFullYear();
      const monthIndex = cursor.getUTCMonth();
      const monthStart = new Date(Date.UTC(year, monthIndex, 1));
      const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));
      const overlapStart =
        period.periodStart > monthStart ? period.periodStart : monthStart;
      const overlapEnd =
        period.periodEnd < monthEnd ? period.periodEnd : monthEnd;
      const ratio = inclusiveDays(overlapStart, overlapEnd) / totalDays;
      const key = `${year}-${monthIndex + 1}`;
      const bucket = buckets.get(key) ?? {
        year,
        month: monthIndex + 1,
        kwh: 0,
        amount: null,
        estimated: false,
      };
      bucket.kwh += period.consumptionKwh * ratio;
      if (period.amount !== null)
        bucket.amount = (bucket.amount ?? 0) + period.amount * ratio;
      else monthsWithMissingAmount.add(key);
      bucket.estimated ||= spansMonths;
      buckets.set(key, bucket);
      cursor = new Date(Date.UTC(year, monthIndex + 1, 1));
    }
  }
  return [...buckets.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((bucket) => ({
      ...bucket,
      kwh: Math.round(bucket.kwh * 1000) / 1000,
      amount:
        monthsWithMissingAmount.has(`${bucket.year}-${bucket.month}`) ||
        bucket.amount === null
          ? null
          : Math.round(bucket.amount * 100) / 100,
    }));
}
