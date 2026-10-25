import {describe,it,expect} from 'vitest';import {billPeriodLabel,expenseReferenceDate} from './billPeriod';describe('periodo bollette',()=>{it('mostra il mese senza un giorno inventato e ordina per competenza',()=>{const e={category:'electricity',spentOn:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31'};expect(billPeriodLabel(e)).toBe('dicembre 2025');expect(expenseReferenceDate(e)).toBe('2025-12-01');expect(expenseReferenceDate({...e,category:'maintenance'})).toBe('2026-01-17');expect(billPeriodLabel({...e,competenceFrom:null})).toContain('da indicare');});});
it('explicit invoice month drives grouping while printed services remain unchanged',()=>{
 const e={invoiceMonth:'2026-01',category:'electricity',spentOn:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31'};
 expect(billPeriodLabel(e)).toBe('gennaio 2026');expect(expenseReferenceDate(e)).toBe('2026-01-01');expect(e.competenceFrom).toBe('2025-12-01');
});
