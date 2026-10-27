import { isValidCalendarDate } from '../lib/activities';
import type { EconomyFilters } from '../lib/economy';

/** Il mese usa il filtro temporale già contrattualizzato; nessun periodo dei servizi inferito. */
export function monthPeriod(month: string, today: string): EconomyFilters['period'] | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith('0000') || month > today.slice(0, 7)) return null;
  const [year, number] = month.split('-').map(Number);
  const end = new Date(`${month}-01T12:00:00Z`);
  end.setUTCMonth(number!); end.setUTCDate(0); end.setUTCFullYear(year!);
  const from = `${month}-01`, to = month === today.slice(0, 7) ? today : end.toISOString().slice(0, 10);
  return isValidCalendarDate(from) && isValidCalendarDate(to) ? { kind: 'range', from, to } : null;
}

export function samePeriod(a: EconomyFilters['period'], b: EconomyFilters['period']) {
  return JSON.stringify(a) === JSON.stringify(b);
}
