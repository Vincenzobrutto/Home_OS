import { PayloadTooLargeException } from '@nestjs/common';

export const EXPORT_LIMITS = { rows: 10000, bytes: 10 * 1024 * 1024, concurrent: 2, batch: 100 } as const;
export const tooLarge = () => new PayloadTooLargeException({ code: 'personal_export_too_large', message: 'I dati superano il limite di esportazione.' });
export type Row = Record<string, unknown>;
export const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
export const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export const fields = {
  object: ['id', 'name', 'type', 'note', 'state', 'version', 'createdAt', 'updatedAt'],
  activity: ['id', 'title', 'description', 'dueDate', 'state', 'version', 'createdAt', 'updatedAt', 'completedAt', 'cancelledAt'],
  expense: ['id', 'title', 'amountCents', 'spentOn', 'note', 'state', 'category', 'supplier', 'documentNumber', 'documentDate', 'competenceFrom', 'competenceTo', 'dueOn', 'amountOrigin', 'version', 'createdAt', 'updatedAt', 'archivedAt'],
  work: ['id', 'name', 'note', 'state', 'version', 'createdAt', 'updatedAt', 'archivedAt'],
  room: ['id', 'name', 'type', 'state'],
};
export function scalars(value: unknown, keys: string[]): Row {
  const row = record(value), result: Row = {};
  for (const key of keys) {
    const v = row[key];
    if (v instanceof Date) result[key] = v.toISOString();
    else if (v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) result[key] = v;
  }
  return result;
}
export type DocumentProof = { version: number; sha256: string };
export class Projection {
  refsExcluded = false;
  historyLimited = false;
  constructor(readonly documents: Map<string, DocumentProof>, readonly objects: Set<string>, readonly assets: Set<string>, readonly activities: Set<string>, readonly expenses: Set<string>, readonly works: Set<string>, readonly rooms: Set<string>) {}
  ref(value: unknown, allowed: Set<string> | Map<string, unknown>) {
    if (typeof value === 'string' && allowed.has(value)) return value;
    if (value !== null && value !== undefined) this.refsExcluded = true;
    return null;
  }
  sources(value: unknown) {
    return list(value).flatMap(raw => {
      const source = record(raw), proof = typeof source.documentId === 'string' ? this.documents.get(source.documentId) : undefined;
      if (!proof || proof.version !== source.documentVersion || proof.sha256 !== (source.documentSha256 ?? source.sha256)) { this.refsExcluded = true; return []; }
      return [{ ...scalars(source, ['documentId', 'documentVersion', 'page', 'excerpt']), documentSha256: proof.sha256 }];
    });
  }
  value(value: unknown): Row | null {
    const row = record(value);
    if (row.kind === 'text' && typeof row.text === 'string') return { kind: 'text', text: row.text };
    if (row.kind !== 'power') return null;
    return { kind: 'power', measurements: list(row.measurements).map(raw => ({ ...scalars(raw, ['value', 'unit', 'quantityCode', 'quantityLabel', 'origin']), sources: this.sources(record(raw).sources) })) };
  }
  confirmed(value: unknown) {
    const row = record(value);
    return ['brand', 'model', 'power'].flatMap(key => {
      const field = record(row[key]), parsed = this.value(field.value);
      return field.fieldKey === key && parsed ? [{ ...scalars(field, ['fieldKey', 'revision', 'origin', 'note', 'confirmedAt']), value: parsed, sources: this.sources(field.sources) }] : [];
    });
  }
  subject(row: Row) {
    if (typeof row.objectId === 'string' && this.objects.has(row.objectId)) return { kind: 'object', id: row.objectId };
    if (typeof row.boilerId === 'string' && this.assets.has(row.boilerId)) return { kind: 'boiler', id: row.boilerId };
    this.refsExcluded = true; return null;
  }
  link(value: unknown) {
    const row = record(value), subject = this.subject(row), refs = row.resourceType === 'document' ? this.documents : row.resourceType === 'activity' ? this.activities : row.resourceType === 'expense' ? this.expenses : new Set<string>();
    const id = this.ref(row.resourceId, refs);
    return subject && id ? { ...scalars(row, ['id', 'state', 'version', 'createdAt']), subject, resource: { kind: row.resourceType, id } } : null;
  }
  snapshot(kind: string, value: unknown): Row | null {
    if (value === null || value === undefined) return null;
    const row = record(value);
    const allowed = kind === 'object' ? this.objects : kind === 'boiler' ? this.assets : kind === 'room' ? this.rooms : kind === 'activity' ? this.activities : kind === 'expense' ? this.expenses : kind === 'work' ? this.works : new Set<string>();
    if (row.id !== undefined && !this.ref(row.id, allowed)) return null;
    if (kind === 'object') return scalars(row, fields.object);
    if (kind === 'room') return scalars(row, fields.room);
    if (kind === 'boiler') return { ...scalars(row, ['id', 'name', 'version', 'createdAt']), confirmed: this.confirmed(row.confirmed) };
    if (kind === 'activity') return { ...scalars(row, fields.activity), assetId: this.ref(row.assetId, this.assets) };
    if (kind === 'work') return { ...scalars(row, fields.work), activityId: this.ref(row.activityId, this.activities) };
    if (kind === 'expense') {
      const provenance: Row = {};
      for (const field of fields.expense) {
        const annotation = record(record(row.economicProvenance)[field]);
        if (Object.keys(annotation).length) provenance[field] = { ...scalars(annotation, ['origin']), sources: this.sources(annotation.sources) };
      }
      const objectRef = record(row.economicObjectRef), objectId = this.ref(objectRef.id, objectRef.kind === 'boiler' ? this.assets : this.objects);
      return { ...scalars(row, fields.expense), currency: 'EUR', documentId: this.ref(row.documentId, this.documents), assetId: this.ref(row.assetId, this.assets), workId: this.ref(row.workId, this.works), provenance, objectRef: objectId ? { kind: objectRef.kind, id: objectId } : null };
    }
    this.historyLimited = true; return null;
  }
  objectSnapshot(value: unknown): Row | null {
    if (value === null || value === undefined) return null;
    const saved = record(value), row = record(saved.row);
    if (saved.kind === 'link') return this.link(row);
    if (['object', 'boiler', 'room'].includes(String(saved.kind))) {
      const mapped = this.snapshot(String(saved.kind), row), position = record(saved.position);
      return { kind: saved.kind, row: mapped, roomIds: list(position.roomIds).flatMap(id => this.ref(id, this.rooms) ? [id] : []) };
    }
    this.historyLimited = true; return null;
  }
  history(kind: string, event: string, value: unknown, objectEvent = false): Row | null {
    const recognized = objectEvent ? ['created', 'updated', 'archived', 'restored', 'position_updated', 'linked', 'unlinked', 'receipt_fields_confirmed'] : kind === 'activity' ? ['created', 'updated', 'completed', 'cancelled', 'reopened'] : ['created', 'updated', 'archived', 'restored'];
    if (!recognized.includes(event)) { this.historyLimited = true; return null; }
    return objectEvent ? this.objectSnapshot(value) : this.snapshot(kind, value);
  }
  technicalChanges(value: unknown) {
    return list(value).flatMap(raw => {
      const row = record(raw);
      if (!['brand', 'model', 'power'].includes(String(row.fieldKey)) || !['accept', 'correct', 'resolve_power', 'discard', 'manual'].includes(String(row.action))) { this.historyLimited = true; return []; }
      return [{ ...scalars(row, ['fieldKey', 'action']), before: this.value(row.before), after: this.value(row.after), sources: this.sources(row.sources) }];
    });
  }
}

export class ExportBudget {
  rows = 0;
  private bytes = 0;
  take() { return Math.min(EXPORT_LIMITS.batch, EXPORT_LIMITS.rows - this.rows + 1); }
  add(rows: unknown[]) {
    this.rows += rows.length;
    this.bytes += Buffer.byteLength(JSON.stringify(rows));
    if (this.rows > EXPORT_LIMITS.rows || this.bytes > EXPORT_LIMITS.bytes) throw tooLarge();
  }
}
export async function collect<T extends { id: string }>(fetch: (take: number, after: string | undefined) => Promise<T[]>, budget: ExportBudget): Promise<T[]> {
  const result: T[] = []; let after: string | undefined;
  for (;;) {
    const take = budget.take(), page = await fetch(take, after); budget.add(page); result.push(...page);
    if (page.length < take) return result;
    after = page.at(-1)!.id;
  }
}
