import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  categoryFitsFamily,
  comparisonText,
  economyQuery,
  filtersFromParams,
  filtersToParams,
  formatBigCents,
  formatCentsString,
  formatPercentHundredths,
  formatTenths,
  parseCentsString,
  periodText,
  previewFamily,
  shareTenths,
  svgFraction,
  validateCompetence,
} from './economy';

const UUID = '6f1c1a52-8f86-4a8e-9d4f-0f8d1c2b3a4e';

describe('economy-v1: somme come stringhe di centesimi', () => {
  it('legge solo interi decimali e formatta anche oltre Number.MAX_SAFE_INTEGER', () => {
    expect(parseCentsString('123456')).toBe(123456n);
    expect(parseCentsString('-500')).toBe(-500n);
    for (const bad of ['12.5', '1e3', ' 12', '', 'abc', null, undefined]) expect(parseCentsString(bad as string)).toBeNull();
    expect(formatBigCents(9007199254740993n)).toBe('90.071.992.547.409,93 €');
    expect(formatBigCents(3999999996n)).toBe('39.999.999,96 €');
    expect(formatBigCents(5n)).toBe('0,05 €');
    expect(formatCentsString('-1234', { signed: true })).toBe('−12,34 €');
    expect(formatCentsString('1234', { signed: true })).toBe('+12,34 €');
    expect(formatCentsString('x')).toBe('—');
  });

  it('quote in decimi di punto con soli interi; arrotondamento dichiarabile', () => {
    // 1/3: 33,3% ×3 = 99,9%
    const t = 300n;
    expect([100n, 100n, 100n].map((v) => shareTenths(v, t))).toEqual([333, 333, 333]);
    expect(formatTenths(333)).toBe('33,3%');
    expect(formatTenths(5)).toBe('0,5%');
    expect(shareTenths(1n, 2000n)).toBe(1); // 0,05% → 0,1% (metà in su)
    expect(shareTenths(0n, 10n)).toBe(0);
    expect(shareTenths(10n, 0n)).toBe(0);
    // Totali enormi: nessuna perdita di precisione nella quota.
    expect(shareTenths(9007199254740993n, 18014398509481986n)).toBe(500);
    expect(svgFraction(1n, 3n)).toBeCloseTo(0.333333, 6);
  });

  it('percentuale del confronto in centesimi di punto', () => {
    expect(formatPercentHundredths('1234')).toBe('+12,34%');
    expect(formatPercentHundredths('-5')).toBe('−0,05%');
    expect(formatPercentHundredths('0')).toBe('0,00%');
  });
});

describe('economy-v1: famiglie e categorie', () => {
  it('anteprima con lo stesso mapping del contratto; other e null nella stessa famiglia', () => {
    expect(previewFamily('repairs_works', true)).toBe('works_purchases');
    expect(previewFamily('repairs_works', false)).toBe('maintenance_repairs');
    expect(previewFamily('insurance', false)).toBe('taxes_insurance');
    expect(previewFamily('financing', false)).toBe('financing');
    expect(previewFamily('other', false)).toBe('unclassified');
    expect(previewFamily(null, false)).toBe('unclassified');
    expect(previewFamily('condominium_extraordinary', false)).toBe('works_purchases');
  });

  it('compatibilità categoria/famiglia (evita il 422 del server)', () => {
    expect(categoryFitsFamily('repairs_works', 'maintenance_repairs')).toBe(true);
    expect(categoryFitsFamily('repairs_works', 'works_purchases')).toBe(true);
    expect(categoryFitsFamily('gas', 'financing')).toBe(false);
    expect(categoryFitsFamily('unclassified', 'unclassified')).toBe(true);
    expect(categoryFitsFamily('other', 'unclassified')).toBe(true);
  });
});

describe('economy-v1: filtri e indirizzo', () => {
  it('URL solo codici, date e riferimenti validi; ricerca mai nell’indirizzo', () => {
    const f = filtersFromParams(new URLSearchParams(`anno=2025&famiglia=utilities&categoria=gas&oggetto=object:${UUID}&lavoro=nonuuid&q=segreto&stato=boh`));
    expect(f).toMatchObject({ period: { kind: 'year', year: '2025' }, family: 'utilities', category: 'gas', object: { kind: 'object', id: UUID }, workId: null, state: 'active', q: '' });
    const out = filtersToParams({ ...f, q: 'bolletta privata' }, { view: 'elenco' }).toString();
    expect(out).not.toContain('bolletta');
    expect(out).not.toContain('q=');
    expect(filtersFromParams(new URLSearchParams('dal=2026-03-01&al=2026-02-01')).period).toEqual({ kind: 'default' });
    expect(filtersFromParams(new URLSearchParams('dal=2026-02-01&al=2026-03-31')).period).toEqual({ kind: 'range', from: '2026-02-01', to: '2026-03-31' });
    expect(filtersFromParams(new URLSearchParams('anno=0000')).period).toEqual({ kind: 'default' });
  });

  it('query del contratto: summary senza state; ricerca normalizzata solo nella richiesta', () => {
    const f = { ...DEFAULT_FILTERS, period: { kind: 'year' as const, year: '2026' }, state: 'archived' as const, q: '  Gas ', family: 'utilities' as const };
    expect(economyQuery(f, { list: true }).toString()).toBe('year=2026&state=archived&q=Gas&family=utilities');
    expect(economyQuery(f, { list: false }).toString()).toBe('year=2026&q=Gas&family=utilities');
    expect(economyQuery({ ...DEFAULT_FILTERS, object: { kind: 'boiler', id: UUID } }, { list: false }).toString()).toBe(`objectKind=boiler&objectId=${UUID}`);
  });
});

describe('economy-v1: periodo, confronto e competenza', () => {
  it('periodo in parole e confronto per stato', () => {
    expect(periodText({ from: '2026-01-01', to: '2026-10-14' }, '2026-10-14')).toBe('2026 · fino al 14 ottobre');
    expect(periodText({ from: '2025-01-01', to: '2025-12-31' })).toBe('2025');
    expect(comparisonText({ status: 'unavailable', period: null, count: null, totalCents: null, deltaCents: null, deltaPercentHundredths: null, calendarAdjustment: 'none' }).title).toMatch(/non disponibile/);
    const none = comparisonText({ status: 'no_previous_records', period: { from: '2025-01-01', to: '2025-10-14' }, count: 0, totalCents: '0', deltaCents: '8000', deltaPercentHundredths: null, calendarAdjustment: 'none' });
    expect(none.title).toMatch(/Nessun costo registrato/);
    expect(none.lines).toEqual([]);
    const comp = comparisonText({ status: 'comparable', period: { from: '2025-01-01', to: '2025-10-14' }, count: 2, totalCents: '10000', deltaCents: '-2000', deltaPercentHundredths: '-2000', calendarAdjustment: 'leap_day_clamped' });
    expect(comp.lines.join(' ')).toContain('−20,00 €');
    expect(comp.lines.join(' ')).toContain('−20,00%');
    expect(comp.title).toContain('29 febbraio');
  });

  it('competenza: entrambi o nessuno, inizio non successivo alla fine', () => {
    expect(validateCompetence('', '')).toBeUndefined();
    expect(validateCompetence('2026-01-01', '')).toMatch(/sia l’inizio sia la fine/);
    expect(validateCompetence('2026-02-01', '2026-01-01')).toMatch(/successivo/);
    expect(validateCompetence('2026-01-01', '2026-03-31')).toBeUndefined();
  });
});
