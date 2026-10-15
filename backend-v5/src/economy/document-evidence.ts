import { calendar } from '../activities/domain';

/** Only printed two-decimal monetary values; grouping is validated before conversion. */
export function printedCents(excerpt: string): number[] {
  const values: number[] = [];
  const tokens = excerpt.matchAll(/(?<![\d.,])[-−+]?\d(?:[\d.,\u00a0\u202f ]*\d)?[.,]\d{2}(?![\d.,])/gu);
  for (const match of tokens) {
    const [raw] = match;
    if (/^[-−]/u.test(raw) || /[-−(]\s*$/u.test(excerpt.slice(0,match.index))) continue;
    const value = raw.replace(/^\+/, ''), decimal = value.at(-3)!;
    const whole = value.slice(0, -3), fraction = value.slice(-2);
    const group = decimal === ',' ? '.' : ',';
    const escaped = group === '.' ? '\\.' : ',';
    if (!/^\d+$/.test(whole) && !new RegExp('^\\d{1,3}(?:' + escaped + '\\d{3})+$').test(whole) && !/^\d{1,3}(?:[\u00a0\u202f ]\d{3})+$/.test(whole)) continue;
    const cents = BigInt(whole.replace(/[.,\u00a0\u202f ]/gu, '')) * 100n + BigInt(fraction);
    if (cents <= 999999999n) values.push(Number(cents));
  }
  return values;
}

/** Calendar equivalence is explicit, never an inferred payment/reference date. */
export function printedDates(excerpt: string): string[] {
  const dates = new Set<string>();
  const add = (value: string) => { try { if (calendar(value)) dates.add(value); } catch { /* Invalid printed dates provide no evidence. */ } };
  for (const [date] of excerpt.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) add(date);
  for (const match of excerpt.matchAll(/\b(\d{1,2})([/.-])(\d{1,2})\2(\d{4})\b/g)) add(`${match[4]}-${match[3].padStart(2,'0')}-${match[1].padStart(2,'0')}`);
  const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  for (const match of excerpt.toLocaleLowerCase('it').matchAll(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/g)) {
    const month = months.indexOf(match[2]) + 1;
    if (month) add(`${match[3]}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}`);
  }
  return [...dates];
}
