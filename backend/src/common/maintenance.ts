import { MaintenanceRecurrenceUnit } from '@prisma/client';

export type MaintenanceStatus =
  'SCHEDULED' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'PAUSED';

function utcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function computeMaintenanceStatus(params: {
  nextDueAt: Date;
  reminderDaysBefore: number;
  pausedAt: Date | null;
  completedAt: Date | null;
  today?: Date;
}): MaintenanceStatus {
  if (params.pausedAt) return 'PAUSED';
  if (params.completedAt) return 'COMPLETED';

  const today = utcDay(params.today ?? new Date());
  const due = utcDay(params.nextDueAt);
  if (due.getTime() < today.getTime()) return 'OVERDUE';

  const reminderStart = new Date(due);
  reminderStart.setUTCDate(
    reminderStart.getUTCDate() - params.reminderDaysBefore,
  );
  return today.getTime() >= reminderStart.getTime() ? 'UPCOMING' : 'SCHEDULED';
}

export function nextMaintenanceDueAt(params: {
  scheduledFor: Date;
  completedAt: Date;
  recurrenceUnit: MaintenanceRecurrenceUnit;
  recurrenceInterval: number;
}): Date | null {
  if (params.recurrenceUnit === MaintenanceRecurrenceUnit.NONE) return null;

  const scheduled = utcDay(params.scheduledFor);
  const completed = utcDay(params.completedAt);
  let occurrenceNumber = 0;
  let next: Date;
  do {
    occurrenceNumber += 1;
    if (params.recurrenceUnit === MaintenanceRecurrenceUnit.DAY) {
      next = new Date(scheduled);
      next.setUTCDate(
        next.getUTCDate() + params.recurrenceInterval * occurrenceNumber,
      );
    } else if (params.recurrenceUnit === MaintenanceRecurrenceUnit.MONTH) {
      next = addCalendarMonths(
        scheduled,
        params.recurrenceInterval * occurrenceNumber,
      );
    } else {
      next = addCalendarMonths(
        scheduled,
        params.recurrenceInterval * occurrenceNumber * 12,
      );
    }
  } while (next.getTime() <= completed.getTime());

  return next;
}

function addCalendarMonths(date: Date, months: number): Date {
  const targetMonthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  targetMonthStart.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return targetMonthStart;
}
