import { describe, expect, it } from 'vitest';
import { formatCalendarDate, isValidCalendarDate, normalizeDescription, validateNote, validateTitle } from './activities';

describe('regole H1 (unitarie, senza rete)', () => {
  it('date di calendario: bisestili e giorni inesistenti', () => {
    expect(isValidCalendarDate('2028-02-29')).toBe(true);
    expect(isValidCalendarDate('2000-02-29')).toBe(true);
    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('1900-02-29')).toBe(false);
    expect(isValidCalendarDate('2026-04-31')).toBe(false);
    expect(isValidCalendarDate('0000-01-01')).toBe(false);
    expect(isValidCalendarDate('0001-01-01')).toBe(true);
    expect(isValidCalendarDate('9999-12-31')).toBe(true);
    expect(isValidCalendarDate('2026-1-5')).toBe(false);
  });

  it('formattazione senza spostamento UTC: il giorno resta quello scelto', () => {
    expect(formatCalendarDate('2028-02-29')).toContain('29 febbraio 2028');
    expect(formatCalendarDate('2026-12-31')).toContain('31 dicembre 2026');
    expect(formatCalendarDate('2027-01-01')).toContain('1 gennaio 2027');
    expect(formatCalendarDate('2026-03-29')).toContain('29 marzo 2026'); // cambio ora legale a Roma
  });

  it('titolo 1–120 code point dopo trim/NFC; descrizione vuota → null; nota fino a 500', () => {
    expect(validateTitle('   ')).toBeTruthy();
    expect(validateTitle('🔥'.repeat(120))).toBeUndefined();
    expect(validateTitle('🔥'.repeat(121))).toMatch(/120/);
    expect(validateTitle('é'.repeat(120))).toBeUndefined(); // NFC: «é» composto = 1 code point
    expect(normalizeDescription('   ')).toBeNull();
    expect(validateNote('x'.repeat(500))).toBeUndefined();
    expect(validateNote('x'.repeat(501))).toMatch(/500/);
  });
});
