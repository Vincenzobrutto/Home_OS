import type { Period } from '../api/economyTypes';
import { isValidCalendarDate } from '../lib/activities';

export type MonthlyPeriod = { month: string; period: Period; partial: boolean };
const index = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
const monthAt = (n: number) => `${String(Math.floor(n / 12)).padStart(4, '0')}-${String(n % 12 + 1).padStart(2, '0')}`;
export const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Finestre limitate: anche un intervallo lungo non genera centinaia di richieste. */
export function monthlyPeriods(range: Period, expanded: boolean, page = 0) {
  if (!isValidCalendarDate(range.from) || !isValidCalendarDate(range.to) || range.from > range.to) return { items: [], pages: 0 };
  const first = index(range.from), last = index(range.to), size = expanded ? 12 : 3;
  const pages = Math.ceil((last - first + 1) / size);
  const end = last - Math.min(Math.max(0, Math.floor(page)), pages - 1) * size;
  const items: MonthlyPeriod[] = [];
  for (let n = Math.max(first, end - size + 1); n <= end; n++) {
    const month = monthAt(n), start = `${month}-01`;
    const date = new Date(`${start}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1); date.setUTCDate(0);
    const finish = date.toISOString().slice(0, 10);
    const from = start < range.from ? range.from : start, to = finish > range.to ? range.to : finish;
    items.push({ month, period: { from, to }, partial: from !== start || to !== finish });
  }
  return { items, pages };
}
