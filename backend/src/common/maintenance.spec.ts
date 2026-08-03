import { MaintenanceRecurrenceUnit } from '@prisma/client';
import { computeMaintenanceStatus, nextMaintenanceDueAt } from './maintenance';

describe('maintenance domain rules', () => {
  const today = new Date('2026-08-03T12:00:00Z');

  it('gives paused plans precedence over date-based states', () => {
    expect(
      computeMaintenanceStatus({
        nextDueAt: new Date('2026-01-01T00:00:00Z'),
        reminderDaysBefore: 30,
        pausedAt: today,
        completedAt: null,
        today,
      }),
    ).toBe('PAUSED');
  });

  it('marks completed one-off plans as completed', () => {
    expect(
      computeMaintenanceStatus({
        nextDueAt: new Date('2026-08-01T00:00:00Z'),
        reminderDaysBefore: 30,
        pausedAt: null,
        completedAt: today,
        today,
      }),
    ).toBe('COMPLETED');
  });

  it('marks a past due date as overdue', () => {
    expect(
      computeMaintenanceStatus({
        nextDueAt: new Date('2026-08-02T00:00:00Z'),
        reminderDaysBefore: 30,
        pausedAt: null,
        completedAt: null,
        today,
      }),
    ).toBe('OVERDUE');
  });

  it('marks a plan inside its reminder window as upcoming', () => {
    expect(
      computeMaintenanceStatus({
        nextDueAt: new Date('2026-08-20T00:00:00Z'),
        reminderDaysBefore: 30,
        pausedAt: null,
        completedAt: null,
        today,
      }),
    ).toBe('UPCOMING');
  });

  it('keeps a plan outside its reminder window scheduled', () => {
    expect(
      computeMaintenanceStatus({
        nextDueAt: new Date('2026-10-20T00:00:00Z'),
        reminderDaysBefore: 30,
        pausedAt: null,
        completedAt: null,
        today,
      }),
    ).toBe('SCHEDULED');
  });

  it('finishes a one-off plan without a next due date', () => {
    expect(
      nextMaintenanceDueAt({
        scheduledFor: new Date('2026-08-01T00:00:00Z'),
        completedAt: today,
        recurrenceUnit: MaintenanceRecurrenceUnit.NONE,
        recurrenceInterval: 1,
      }),
    ).toBeNull();
  });

  it('anchors annual recurrence to the scheduled date when completed late', () => {
    expect(
      nextMaintenanceDueAt({
        scheduledFor: new Date('2026-10-15T00:00:00Z'),
        completedAt: new Date('2026-11-02T00:00:00Z'),
        recurrenceUnit: MaintenanceRecurrenceUnit.YEAR,
        recurrenceInterval: 1,
      }),
    ).toEqual(new Date('2027-10-15T00:00:00Z'));
  });

  it('skips missed monthly occurrences to the first future date', () => {
    expect(
      nextMaintenanceDueAt({
        scheduledFor: new Date('2026-01-15T00:00:00Z'),
        completedAt: new Date('2026-04-20T00:00:00Z'),
        recurrenceUnit: MaintenanceRecurrenceUnit.MONTH,
        recurrenceInterval: 1,
      }),
    ).toEqual(new Date('2026-05-15T00:00:00Z'));
  });

  it('supports recurrence expressed in days', () => {
    expect(
      nextMaintenanceDueAt({
        scheduledFor: new Date('2026-08-01T00:00:00Z'),
        completedAt: new Date('2026-08-03T00:00:00Z'),
        recurrenceUnit: MaintenanceRecurrenceUnit.DAY,
        recurrenceInterval: 7,
      }),
    ).toEqual(new Date('2026-08-08T00:00:00Z'));
  });

  it('keeps month-end recurrence anchored to the original calendar day', () => {
    expect(
      nextMaintenanceDueAt({
        scheduledFor: new Date('2026-01-31T00:00:00Z'),
        completedAt: new Date('2026-02-28T00:00:00Z'),
        recurrenceUnit: MaintenanceRecurrenceUnit.MONTH,
        recurrenceInterval: 1,
      }),
    ).toEqual(new Date('2026-03-31T00:00:00Z'));
  });
});
