import { invalid, object, text, uuid, version } from '../review/domain';
import { MAX_FILE_BYTES } from '../documents/storage';

export const INTAKE_LIMITS = { maxFiles: 20, maxTotalBytes: 200 * 1024 * 1024, maxFileBytes: MAX_FILE_BYTES, uploadConcurrency: 2, maxParts: 12, acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] } as const;
export const DOCUMENT_COLLECTIONS = { energy: 'Energia', building: 'Pratiche edilizie', technical: 'Impianti e documenti tecnici', condominium: 'Condominio', purchases: 'Acquisti e garanzie', utilities: 'Bollette', unclassified: 'Da organizzare' } as const;
export type DocumentCollection = keyof typeof DOCUMENT_COLLECTIONS;
export const DOCUMENT_KINDS = {
  ape: 'energy', energy_certificate: 'energy', cila: 'building', scia: 'building', building_permit: 'building', habitability: 'building', agibility: 'building', agibility_record: 'building',
  system_diagram: 'technical', conformity_declaration: 'technical', system_booklet: 'technical',
  condominium_rules: 'condominium', condominium_minutes: 'condominium', millesimal_tables: 'condominium',
  receipt: 'purchases', invoice: 'purchases', warranty: 'purchases', manual: 'purchases', utility_bill: 'utilities', other: 'unclassified',
} as const satisfies Record<string, DocumentCollection>;
export type DocumentKind = keyof typeof DOCUMENT_KINDS;
export type ClassificationPart = { kind: DocumentKind; pageFrom: number | null; pageTo: number | null };
export type IntakeManifestItem = { clientItemId: string; filename: string; byteSize: number; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' };
export type OrganizationSelection = { action: 'defer' } | { action: 'organize'; title: string; parts: ClassificationPart[]; target: { kind: 'home' } | { kind: 'object' | 'boiler'; id: string; expectedVersion: number } };

export function intakeManifest(input: unknown): { items: IntakeManifestItem[] } {
  const body = object(input, ['items']);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > INTAKE_LIMITS.maxFiles) throw invalid('Seleziona da 1 a 20 file.');
  const ids = new Set<string>(); let total = 0;
  const items = body.items.map(input => {
    const row = object(input, ['clientItemId', 'filename', 'byteSize', 'mimeType']), clientItemId = uuid(row.clientItemId);
    if (ids.has(clientItemId)) throw invalid('Ogni elemento del lotto deve avere una propria identità.');
    ids.add(clientItemId);
    const filename = text(row.filename, 120).normalize('NFC');
    if (/[/\\\p{Cc}\p{Cf}]/u.test(filename)) throw invalid('Nome del file non valido.');
    if (!Number.isSafeInteger(row.byteSize) || Number(row.byteSize) <= 0 || Number(row.byteSize) > INTAKE_LIMITS.maxFileBytes) throw invalid('Ogni originale deve essere non vuoto e non superare 20 MiB.', 'intake_file_limit_exceeded');
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(String(row.mimeType))) throw invalid('Sono ammessi PDF, JPEG e PNG.', 'unsupported_file_type');
    total += Number(row.byteSize);
    return { clientItemId, filename, byteSize: Number(row.byteSize), mimeType: row.mimeType as IntakeManifestItem['mimeType'] };
  });
  if (total > INTAKE_LIMITS.maxTotalBytes) throw invalid('Il lotto supera 200 MiB.', 'intake_batch_limit_exceeded');
  return { items };
}

export function classificationParts(input: unknown, pageCount: number | null, origin: 'user_declared' | 'extraction'): ClassificationPart[] {
  if (pageCount !== null && (!Number.isSafeInteger(pageCount) || pageCount < 1)) throw invalid('Numero di pagine non valido.');
  if (!Array.isArray(input) || input.length < 1 || input.length > INTAKE_LIMITS.maxParts) throw invalid('Scegli da 1 a 12 contenuti del documento.');
  const seen = new Set<string>();
  return input.map(input => {
    const row = object(input, ['kind', 'pageFrom', 'pageTo']);
    if (typeof row.kind !== 'string' || !Object.hasOwn(DOCUMENT_KINDS, row.kind)) throw invalid('Tipo documentale non valido.');
    const noPages = row.pageFrom === null && row.pageTo === null;
    if (noPages) { if (origin !== 'user_declared') throw invalid('La proposta estratta deve indicare le pagine.'); }
    else if (!Number.isSafeInteger(row.pageFrom) || !Number.isSafeInteger(row.pageTo) || Number(row.pageFrom) < 1 || Number(row.pageTo) < Number(row.pageFrom) || Number(row.pageTo) > (pageCount ?? 10000) || origin === 'extraction' && pageCount === null) throw invalid('Intervallo di pagine non valido.');
    const part = { kind: row.kind as DocumentKind, pageFrom: row.pageFrom as number | null, pageTo: row.pageTo as number | null }, key = JSON.stringify(part);
    if (seen.has(key)) throw invalid('Lo stesso contenuto non deve essere ripetuto.');
    seen.add(key); return part;
  });
}
export const collectionsFor = (parts: ClassificationPart[]): DocumentCollection[] => [...new Set(parts.map(part => DOCUMENT_KINDS[part.kind]))];

/** The caller must separately verify access, source proof, evidence and target version. */
export function organizationSelection(input: unknown, pageCount: number | null): OrganizationSelection {
  const row = object(input, ['action', 'title', 'parts', 'target']);
  if (row.action === 'defer') { object(input, ['action']); return { action: 'defer' }; }
  if (row.action !== 'organize') throw invalid();
  const title = text(row.title, 120).normalize('NFC');
  if (/[\p{Cc}\p{Cf}]/u.test(title)) throw invalid('Nome del documento non valido.');
  const parts = classificationParts(row.parts, pageCount, 'user_declared'), target = object(row.target, ['kind', 'id', 'expectedVersion']);
  if (target.kind === 'home') { object(row.target, ['kind']); return { action: 'organize', title, parts, target: { kind: 'home' } }; }
  if (target.kind !== 'object' && target.kind !== 'boiler') throw invalid('Scegli la casa oppure una scheda esistente.');
  return { action: 'organize', title, parts, target: { kind: target.kind, id: uuid(target.id), expectedVersion: version(target.expectedVersion) } };
}

/** Same name or size is insufficient. Caller must first restrict candidates to readable originals. */
export function identicalOriginal(a: { sha256: string; byteSize: number }, b: { sha256: string; byteSize: number }): boolean {
  return /^[a-f0-9]{64}$/.test(a.sha256) && /^[a-f0-9]{64}$/.test(b.sha256) && Number.isSafeInteger(a.byteSize) && a.byteSize > 0 && a.sha256 === b.sha256 && a.byteSize === b.byteSize;
}
