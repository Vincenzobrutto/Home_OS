import { allocateUtilityPeriods } from './energy-aggregation';

describe('allocateUtilityPeriods', () => {
  it('keeps a single-month bill exact and not estimated', () => {
    expect(
      allocateUtilityPeriods([
        {
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
          consumptionKwh: 310,
          amount: 93,
        },
      ]),
    ).toEqual([
      { year: 2026, month: 1, kwh: 310, amount: 93, estimated: false },
    ]);
  });

  it('allocates a multi-month total proportionally by inclusive days and marks it estimated', () => {
    const result = allocateUtilityPeriods([
      {
        periodStart: new Date('2026-01-16'),
        periodEnd: new Date('2026-02-14'),
        consumptionKwh: 300,
        amount: 90,
      },
    ]);
    expect(result).toEqual([
      { year: 2026, month: 1, kwh: 160, amount: 48, estimated: true },
      { year: 2026, month: 2, kwh: 140, amount: 42, estimated: true },
    ]);
  });

  it('sums overlapping confirmed periods in the same month', () => {
    const result = allocateUtilityPeriods([
      {
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-03-15'),
        consumptionKwh: 100,
        amount: null,
      },
      {
        periodStart: new Date('2026-03-16'),
        periodEnd: new Date('2026-03-31'),
        consumptionKwh: 120,
        amount: null,
      },
    ]);
    expect(result[0]).toMatchObject({
      year: 2026,
      month: 3,
      kwh: 220,
      estimated: false,
    });
  });
});
