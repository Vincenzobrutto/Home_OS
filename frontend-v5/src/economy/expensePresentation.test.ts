import { describe, expect, it } from 'vitest';
import { expenseDisplayTitle } from './expensePresentation';

const bill = { title: 'Bolletta', category: 'electricity' as const, supplier: 'Fornitore Demo S.p.A.', invoiceMonth: '2026-09' };
describe('titoli visuali delle spese già confermate', () => {
  it('combina solo fornitore e mese fattura espliciti, senza mutare il record', () => {
    const input = Object.freeze({ ...bill });
    expect(expenseDisplayTitle(input)).toBe('Bolletta Fornitore Demo · settembre 2026');
    expect(input).toEqual(bill);
  });
  it('uniforma descrizioni generiche del servizio, senza cataloghi di fornitori', () => {
    expect(expenseDisplayTitle({ ...bill, title: 'SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO' })).toBe('Bolletta Fornitore Demo · settembre 2026');
  });
  it.each(['Bolletta studio', 'Acconto impianto', 'Energia elettrica della cucina', 'Nota personale'])('preserva il titolo specifico %s', title => {
    expect(expenseDisplayTitle({ ...bill, title })).toBe(title);
  });
  it('non applica la regola alle spese non di utenza', () => {
    expect(expenseDisplayTitle({ ...bill, category: 'purchase_replacement' })).toBe('Bolletta');
  });
  it('non sostituisce un nome fornitore assente con una descrizione di servizio', () => {
    expect(expenseDisplayTitle({ ...bill, supplier: 'SERVIZIO ENERGIA ELETTRICA' })).toBe('Bolletta · settembre 2026');
  });
  it('non ricava un mese assente né accetta un mese invalido', () => {
    expect(expenseDisplayTitle({ ...bill, invoiceMonth: null })).toBe('Bolletta Fornitore Demo');
    expect(expenseDisplayTitle({ ...bill, invoiceMonth: '2026-13' })).toBe('Bolletta Fornitore Demo');
  });
  it('senza dati utilizzabili mantiene il titolo salvato', () => {
    expect(expenseDisplayTitle({ ...bill, supplier: null, invoiceMonth: null })).toBe('Bolletta');
  });
  it('non confonde suffissi ambigui con ragioni sociali normalizzabili', () => {
    expect(expenseDisplayTitle({ ...bill, supplier: 'Hotel Spa' })).toBe('Bolletta Hotel Spa · settembre 2026');
  });
});
