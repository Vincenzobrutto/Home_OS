import { canReadDocument } from '../documents/access';
import { invalid, uuid } from '../review/domain';
import type { ObjectProfile } from '../object-onboarding/profile';
import type { Prisma } from '../../generated/client';

type Tx = Prisma.TransactionClient;

/** Documento di supporto della garanzia: `undefined` non cambia, `null` lo rimuove, altrimenti un id valido. */
export function warrantyDocumentInput(input: unknown): string | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const keys = Object.keys(input as object);
  if (keys.length !== 1 || keys[0] !== 'documentId') throw invalid();
  const id = (input as { documentId: unknown }).documentId;
  if (typeof id !== 'string') throw invalid();
  uuid(id);
  return id;
}

/** Il supporto vale solo per una scadenza dichiarata dall'utente: un dato letto da un documento ha già la sua fonte. */
export function applyWarrantySupport(fields: ObjectProfile, documentId: string | null | undefined) {
  if (documentId === undefined) return fields;
  const end = fields.warrantyEnd;
  if (documentId === null) {
    if (end?.support) { const { support: _removed, ...rest } = end; void _removed; fields.warrantyEnd = rest; }
    return fields;
  }
  if (!end) throw invalid('Indica prima la scadenza della garanzia.');
  if (end.origin !== 'user_declared') throw invalid('La scadenza letta da un documento ha già la sua fonte.');
  fields.warrantyEnd = { ...end, support: { documentId } };
  return fields;
}

export type WarrantySupportView = { documentId: string; name: string } | null;

/**
 * Presentazione per la scheda: il nome del documento di supporto compare solo se è ancora leggibile da chi guarda.
 * Il profilo salvato conserva soltanto l'id; nessun nome finisce nel database.
 */
export async function presentWarrantySupport<T extends { fields: ObjectProfile; unavailable: boolean }>(tx: Tx, accountId: string, homeId: string, profile: T) {
  const end = profile.fields.warrantyEnd;
  if (!end?.support) return profile;
  const doc = await tx.document.findFirst({ where: { id: end.support.documentId, homeId }, include: { original: true } });
  const readable = !!doc && !!doc.original && canReadDocument(doc, accountId);
  const { support: _stored, ...field } = end; void _stored;
  const view: Record<string, unknown> = readable ? { ...field, support: { documentId: doc!.id, name: doc!.name } } : { ...field, support: null, supportUnavailable: true };
  return { ...profile, fields: { ...profile.fields, warrantyEnd: view } } as unknown as T;
}
