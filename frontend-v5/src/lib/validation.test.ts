import { describe, expect, it } from 'vitest';
import { safeNextPath, validateHome, validateLogin, validateRegister } from './validation';

describe('validazioni identity-v1 (unitarie, senza rete)', () => {
  it('trim di nome ed email, password mai modificata', () => {
    const { errors, data } = validateRegister({ name: '  Giulia ', email: ' g@example.test ', password: '  dodici-car  ' });
    expect(errors).toEqual({});
    expect(data).toEqual({ name: 'Giulia', email: 'g@example.test', password: '  dodici-car  ' });
  });

  it('password 12–128 caratteri, spazi inclusi nel conteggio', () => {
    expect(validateRegister({ name: 'A', email: 'a@b.it', password: 'x'.repeat(11) }).errors.password).toMatch(/12/);
    expect(validateRegister({ name: 'A', email: 'a@b.it', password: ' '.repeat(12) }).errors.password).toBeUndefined();
    expect(validateRegister({ name: 'A', email: 'a@b.it', password: 'x'.repeat(129) }).errors.password).toMatch(/128/);
  });

  it('nome account 1–80, email valida fino a 254', () => {
    expect(validateRegister({ name: '   ', email: 'a@b.it', password: 'x'.repeat(12) }).errors.name).toBeTruthy();
    expect(validateRegister({ name: 'x'.repeat(81), email: 'a@b.it', password: 'x'.repeat(12) }).errors.name).toMatch(/80/);
    expect(validateRegister({ name: 'A', email: 'non-email', password: 'x'.repeat(12) }).errors.email).toBeTruthy();
    const long = `${'a'.repeat(250)}@b.it`;
    expect(validateRegister({ name: 'A', email: long, password: 'x'.repeat(12) }).errors.email).toMatch(/254/);
  });

  it('casa: nome 1–80, indirizzo 1–200, conteggio per carattere', () => {
    expect(validateHome({ name: '', address: '' }).errors).toMatchObject({ name: expect.any(String), address: expect.any(String) });
    expect(validateHome({ name: '🏠'.repeat(80), address: 'Via 1' }).errors).toEqual({});
    expect(validateHome({ name: 'Casa', address: 'x'.repeat(201) }).errors.address).toMatch(/200/);
  });

  it('login: richiede i campi ma non impone la lunghezza della password', () => {
    expect(validateLogin({ email: '', password: '' }).errors).toMatchObject({ email: expect.any(String), password: expect.any(String) });
    expect(validateLogin({ email: 'a@b.it', password: 'corta' }).errors).toEqual({});
  });

  it('redirect dopo login solo verso percorsi interni', () => {
    expect(safeNextPath('/home/h1/casa')).toBe('/home/h1/casa');
    expect(safeNextPath('//evil.example')).toBe('/case');
    expect(safeNextPath('https://evil.example')).toBe('/case');
    expect(safeNextPath('/\\evil.example')).toBe('/case');
    expect(safeNextPath('/accedi')).toBe('/case');
    expect(safeNextPath(null)).toBe('/case');
  });
});
