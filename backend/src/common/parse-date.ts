// gg/mm/aaaa, "14 giugno 2026" (formato scritto per esteso che Claude usa
// spesso nei campi estratti in italiano — Date() nativo non lo riconosce,
// solo i mesi in inglese), o ISO -> Date. Ritorna null se il testo non è una
// data riconoscibile, invece di lanciare: un campo estratto male non deve
// far fallire la conferma.
const ITALIAN_MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

export function parseFlexibleDate(value: string): Date | null {
  const trimmed = value.trim();

  const itMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (itMatch) {
    const [, day, month, year] = itMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const itWrittenMatch = trimmed
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-zà]+)\s+(\d{4})$/);
  if (itWrittenMatch) {
    const [, day, monthName, year] = itWrittenMatch;
    const monthIndex = ITALIAN_MONTHS.indexOf(monthName);
    if (monthIndex !== -1) {
      return new Date(Date.UTC(Number(year), monthIndex, Number(day)));
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
