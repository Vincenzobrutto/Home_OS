import { describe, expect, it } from 'vitest';
import { backToExpenses, filtersFromParams } from '../routes/ExpensesPage';
import { centsToInput, formatCents, parseAmount, validateSpentOn, validateTitle } from './expenses';

describe('regole H3a — importi (unitarie, senza rete e senza float)', () => {
  it('formati italiani validi → centesimi interi esatti', () => {
    expect(parseAmount('0,01')).toEqual({ cents: 1 });
    expect(parseAmount('1.234,56')).toEqual({ cents: 123456 });
    expect(parseAmount('1234,5')).toEqual({ cents: 123450 });
    expect(parseAmount('1234')).toEqual({ cents: 123400 });
    expect(parseAmount('  85,50  ')).toEqual({ cents: 8550 });
    expect(parseAmount('1.000.000')).toEqual({ cents: 100000000 });
    expect(parseAmount('9.999.999,99')).toEqual({ cents: 999999999 });
    expect(parseAmount('007,10')).toEqual({ cents: 710 });
  });

  it('0,10 + 0,20 = 30 centesimi, non 0.30000000000000004', () => {
    const a = parseAmount('0,10').cents!;
    const b = parseAmount('0,20').cents!;
    expect(a + b).toBe(30);
    expect(formatCents(a + b)).toBe('0,30 €');
  });

  it('rifiuta zero, negativi, frazioni di centesimo, raggruppamenti errati, testo e overflow', () => {
    for (const bad of [
      '',
      '0',
      '0,00',
      '-5',
      '−5',
      '+5',
      '12,345',
      '1,2,3',
      '12.5',
      '1.23,00',
      '1.2345',
      '12a',
      '1 234',
      '1e3',
      '1,',
      ',5',
      '10.000.000,00',
      '99999999999999999999999',
    ]) {
      expect(parseAmount(bad).error, bad).toBeTruthy();
    }
    expect(parseAmount('12,345').error).toMatch(/due cifre/);
    expect(parseAmount('12.5').error).toMatch(/virgola/);
    expect(parseAmount('10.000.000,00').error).toMatch(/massimo di 9\.999\.999,99 €/);
    expect(parseAmount('500,00', 49999).error).toMatch(/massimo di 499,99 €/);
  });

  it('formattazione e valore iniziale del campo con aritmetica intera', () => {
    expect(formatCents(1)).toBe('0,01 €');
    expect(formatCents(100)).toBe('1,00 €');
    expect(formatCents(123456)).toBe('1.234,56 €');
    expect(formatCents(999999999)).toBe('9.999.999,99 €');
    expect(centsToInput(123450)).toBe('1234,50');
    expect(centsToInput(5)).toBe('0,05');
    expect(parseAmount(centsToInput(123456)).cents).toBe(123456);
  });
});

describe('regole H3a — date, testi e filtri', () => {
  it('data obbligatoria, reale, non futura rispetto al giorno del server', () => {
    expect(validateSpentOn('', '2026-10-13')).toMatch(/Indica/);
    expect(validateSpentOn('2026-02-29', '2026-10-13')).toMatch(/valida/);
    expect(validateSpentOn('2026-10-14', '2026-10-13')).toMatch(/futura/);
    expect(validateSpentOn('2026-10-13', '2026-10-13')).toBeUndefined();
    expect(validateSpentOn('2028-02-29', '2028-03-01')).toBeUndefined();
    expect(validateSpentOn('0001-01-01', '2026-10-13')).toBeUndefined();
    expect(validateSpentOn('9999-12-31', '2026-10-13')).toMatch(/futura/);
    expect(validateTitle('🔥'.repeat(121))).toMatch(/120/);
  });

  it('filtri dall’indirizzo validati; ritorno ai filtri solo per lo stesso account', () => {
    expect(filtersFromParams(new URLSearchParams('anno=2025&stato=archived&origine=document&importo=12'))).toEqual({
      year: '2025',
      state: 'archived',
      source: 'document',
    });
    expect(filtersFromParams(new URLSearchParams('anno=25&stato=pagata&origine=banca'))).toEqual({ year: null, state: 'active', source: 'all' });
    const state = { expensesSearch: 'anno=2025&stato=all&note=segreta', expensesAccountId: 'acc-a' };
    expect(backToExpenses('h1', state, 'acc-a')).toBe('/home/h1/spese?anno=2025&stato=all');
    expect(backToExpenses('h1', state, 'acc-b')).toBe('/home/h1/spese');
    expect(backToExpenses('h1', null, 'acc-a')).toBe('/home/h1/spese');
  });
});
