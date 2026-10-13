// Validazioni client di identity-v1 (docs/v5/api-contract.md). Sono un aiuto
// all'utente: il server resta l'unica autorità e i suoi fieldErrors prevalgono.
// Trim per nomi/indirizzo/email; la password non viene mai modificata.

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// Lunghezza in caratteri (code point), non in unità UTF-16.
const length = (value: string) => [...value].length;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkLength(value: string, min: number, max: number, label: string) {
  const n = length(value);
  if (n < min) return `Inserisci ${label}.`;
  if (n > max) return `Massimo ${max} caratteri.`;
  return undefined;
}

export function validateEmail(raw: string) {
  const email = raw.trim();
  if (!email) return 'Inserisci l’email.';
  if (length(email) > 254) return 'Massimo 254 caratteri.';
  if (!EMAIL_RE.test(email)) return 'Inserisci un indirizzo email valido.';
  return undefined;
}

export function validateNewPassword(password: string) {
  const n = length(password);
  if (n === 0) return 'Inserisci una password.';
  if (n < 12) return 'Usa almeno 12 caratteri.';
  if (n > 128) return 'Massimo 128 caratteri.';
  return undefined;
}

export function validateLogin(values: { email: string; password: string }) {
  const errors: FieldErrors<'email' | 'password'> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'Inserisci la password.';
  return { errors, data: { email: values.email.trim(), password: values.password } };
}

export function validateRegister(values: { name: string; email: string; password: string }) {
  const errors: FieldErrors<'name' | 'email' | 'password'> = {};
  const name = checkLength(values.name.trim(), 1, 80, 'il tuo nome');
  if (name) errors.name = name;
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  const password = validateNewPassword(values.password);
  if (password) errors.password = password;
  return {
    errors,
    data: { name: values.name.trim(), email: values.email.trim(), password: values.password },
  };
}

export function validateHome(values: { name: string; address: string }) {
  const errors: FieldErrors<'name' | 'address'> = {};
  const name = checkLength(values.name.trim(), 1, 80, 'un nome per la casa');
  if (name) errors.name = name;
  const address = checkLength(values.address.trim(), 1, 200, 'l’indirizzo');
  if (address) errors.address = address;
  return { errors, data: { name: values.name.trim(), address: values.address.trim() } };
}

export function hasErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).some(Boolean);
}

/** Rotta interna sicura per il redirect dopo login; mai URL esterni. */
export function safeNextPath(next: string | null | undefined, fallback = '/case') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  if (next.startsWith('/accedi') || next.startsWith('/registrati')) return fallback;
  return next;
}
