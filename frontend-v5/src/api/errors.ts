import type { ApiErrorBody } from './types';

// 'service': backend irraggiungibile, risposta non-JSON o fuori contratto, 502/503/504.
// 'http': risposta di errore conforme al contratto ({ error: { code, message, ... } }).
export type ApiErrorKind = 'service' | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;
  readonly requestId: string | undefined;

  constructor(opts: {
    kind: ApiErrorKind;
    status: number;
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    requestId?: string;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.status = opts.status;
    this.code = opts.code;
    this.fieldErrors = opts.fieldErrors ?? {};
    this.requestId = opts.requestId;
  }

  get isUnauthorized() {
    return this.kind === 'http' && this.status === 401;
  }
}

export const SERVICE_MESSAGE =
  'Il servizio Dimora non è raggiungibile in questo momento. Riprova tra poco.';

export const STORAGE_MESSAGE =
  'L’archivio dei documenti non è disponibile in questo momento. Nessun file è stato modificato: riprova tra poco.';

export function serviceError(status = 0, requestId?: string, code = 'service_unavailable') {
  return new ApiError({
    kind: 'service',
    status,
    code,
    message: code === 'storage_unavailable' ? STORAGE_MESSAGE : SERVICE_MESSAGE,
    requestId,
  });
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object') return false;
  const error = (value as { error?: unknown }).error;
  return (
    !!error &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isUnauthorized(value: unknown) {
  return isApiError(value) && value.isUnauthorized;
}

// Messaggio per l'utente: il server fornisce testi italiani; fallback per stato.
export function userMessage(error: unknown): string {
  if (!isApiError(error)) return SERVICE_MESSAGE;
  if (error.kind === 'service') return error.code === 'storage_unavailable' ? STORAGE_MESSAGE : SERVICE_MESSAGE;
  if (error.message) return error.message;
  switch (error.status) {
    case 401:
      return 'La sessione non è attiva. Accedi di nuovo.';
    case 403:
      return 'Non hai il permesso per questa operazione.';
    case 409:
      return 'La richiesta è in conflitto con lo stato attuale.';
    case 422:
      return 'Controlla i campi evidenziati.';
    case 429:
      return 'Troppi tentativi. Attendi qualche istante e riprova.';
    default:
      return 'Si è verificato un errore imprevisto.';
  }
}
