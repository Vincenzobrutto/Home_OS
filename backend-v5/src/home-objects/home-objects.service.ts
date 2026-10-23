import { catalogBase, catalogPlacement } from './catalog';
import {houseDocumentPlan,publicHouseDocumentPlan,keepHouseDocuments} from './house-documents';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type HomeRoom, type HomeObject, type ObjectPosition, type ObjectResourceLink } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ReviewService } from '../review/review.service';
import { digest } from '../security';
import { canReadDocument } from '../documents/access';
import { readableReceiptObjectIds } from '../receipt-assistance/access';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { createHomeObject, objectAction, objectLimits, objectsQuery, objectTypes, positionBody, roomTypes, subjectKind, updateHomeObject, type SubjectKind } from './domain';
import { ManufacturerManuals, manualLookup, manualSelection, type ObjectManual } from './manuals';
import { objectProfileView } from '../object-onboarding/access';
import { profileFields, profileValue, type ProfileKey, type ObjectProfile } from '../object-onboarding/profile';
import { temporal } from '../activities/domain';
import { applyWarrantySupport, presentWarrantySupport, warrantyDocumentInput } from './warranty';

type Tx = Prisma.TransactionClient;
type Context = { a: string; h: string; edit: boolean };
type Subject = { id: string; homeId: string; accountId: string; name: string; type: string; note: string | null; manual?: Prisma.JsonValue | null; profile?: Prisma.JsonValue | null; state: string; version: number; createdAt: Date; updatedAt: Date };
type Saved = { kind: 'room'; row: HomeRoom } | { kind: SubjectKind; row: Subject; position: ObjectPosition | null } | { kind: 'link'; row: ObjectResourceLink; subjectKind: SubjectKind; subjectId: string };
type Cursor = { b: string; t: string; id: string; k?: string; n?: string };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const deny = () => new ForbiddenException('Accesso non consentito.');
const targetWhere = (kind: SubjectKind, id: string) => kind === 'object' ? { objectId: id } : { boilerId: id };
const resourceTypes = ['document', 'activity', 'expense'] as const;
type ResourceType = typeof resourceTypes[number];
function resourceType(value: unknown): ResourceType {
  if (typeof value !== 'string' || !resourceTypes.includes(value as ResourceType)) throw invalid();
  return value as ResourceType;
}
const revive = <T extends { createdAt: Date; updatedAt: Date }>(row: T): T => ({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) });

@Injectable()
export class HomeObjectsService {
  readonly manuals = new ManufacturerManuals();
  async houseDocuments(a:string,h:string,id:string){return this.transaction(a,h,false,async(tx,c)=>{await this.subject(tx,c,'object',id);return publicHouseDocumentPlan(await houseDocumentPlan(tx,a,h,id));});}
  async keepHouseDocuments(a:string,h:string,id:string,body:unknown,key?:string){return this.transaction(a,h,true,async(tx,c)=>{await this.subject(tx,c,'object',id);return keepHouseDocuments(tx,a,h,id,body,key);});}
  constructor(private readonly db: PrismaService, private readonly access: ReviewService) {}
  private async transaction<T>(a: string, h: string, edit: boolean, action: (tx: Tx, c: Context) => Promise<T>) {
    uuid(h);
    return this.db.$transaction(async tx => {
      // Shared rooms must serialize across accounts as well as within one account.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:' + h},0))::text AS locked`;
      await this.access.lock(tx, a, h);
      const member = await this.access.require(tx, a, h, edit);
      const result = await action(tx, { a, h, edit: member.role !== 'viewer' });
      await this.access.require(tx, a, h, edit);
      return result;
    }, { timeout: 15000, maxWait: 15000 });
  }
  private async room(tx: Tx, c: Context, id: string) {
    const row = await tx.homeRoom.findFirst({ where: { id: uuid(id), homeId: c.h } });
    if (!row) throw deny(); return row;
  }
  private async subject(tx: Tx, c: Context, kind: SubjectKind, id: string): Promise<Subject> {
    uuid(id);
    if (kind === 'object') {
      const row = await tx.homeObject.findFirst({ where: { id, homeId: c.h, accountId: c.a } });
      if (!row || !(await readableReceiptObjectIds(tx, c.a, c.h, [id])).has(id)) throw deny(); return row;
    }
    await tx.$queryRaw`SELECT id FROM "BoilerAsset" WHERE id=${id} FOR SHARE`;
    const row = await this.access.asset(tx, c.a, c.h, id);
    await this.access.assetSources(tx, c.a, c.h, id);
    return { id: row.id, accountId: row.accountId, homeId: row.homeId, name: row.name, version: row.version, createdAt: row.createdAt, type: 'boiler', note: null, state: 'active', updatedAt: row.createdAt };
  }
  private async position(tx: Tx, c: Context, kind: SubjectKind, id: string) {
    return tx.objectPosition.findFirst({ where: { ...targetWhere(kind, id), homeId: c.h, accountId: c.a } });
  }
  private roomView(row: HomeRoom, c: Context) {
    return { id: row.id, homeId: row.homeId, name: row.name, type: row.type, note: row.note, state: row.state, version: row.version,
      createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(), permissions: c.edit ? ['read', 'edit'] : ['read'] };
  }
  private async catalogView(tx: Tx, c: Context, kind: SubjectKind, row: Subject, position?: ObjectPosition | null) {
    const pos = position === undefined ? await this.position(tx, c, kind, row.id) : position;
    const rooms = pos ? await tx.homeRoom.findMany({ where: { homeId: c.h, id: { in: pos.roomIds as string[] } }, orderBy: { id: 'asc' } }) : [];
    const manual = kind === 'object' ? (row as HomeObject).manual as ObjectManual | null : null;
    const profile = kind === 'object' ? await presentWarrantySupport(tx, c.a, c.h, await objectProfileView(tx, c.a, c.h, row.id, row.profile)) : null;
    return { ref: { kind, id: row.id }, homeId: row.homeId, name: row.name, type: row.type, note: row.note, state: row.state,
      manual: manual ? { ...manual, needsReview: manual.boundVersion !== row.version } : null,
      profile,
      version: row.version, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(),
      kindLabel: kind === 'boiler' ? 'Scheda caldaia personale' : 'Oggetto personale', permissions: c.edit ? ['read', 'edit'] : ['read'],
      position: { version: pos?.version ?? 0, rooms: rooms.map(r => this.roomView(r, c)) }, technicalLink: kind === 'boiler' ? { assetId: row.id } : null };
  }
  private async saveSubject(tx: Tx, c: Context, kind: SubjectKind, id: string): Promise<Saved> {
    return { kind, row: await this.subject(tx, c, kind, id), position: await this.position(tx, c, kind, id) };
  }
  private async projectSaved(tx: Tx, c: Context, saved: Saved) {
    if (saved.kind === 'room') {
      await this.room(tx, c, saved.row.id);
      return { room: this.roomView(saved.row, c) };
    }
    if (saved.kind === 'link') {
      await this.subject(tx, c, saved.subjectKind, saved.subjectId);
      const link = await tx.objectResourceLink.findFirst({ where: { id: saved.row.id, accountId: c.a, homeId: c.h } });
      if (!link) throw deny();
      return { link: await this.linkView(tx, c, saved.row, saved.subjectKind, saved.subjectId) };
    }
    const current = await this.subject(tx, c, saved.kind, saved.row.id);
    // Receipt-derived names have no per-event source proof. Historical snapshots
    // therefore show the currently authorized name, never a stale extracted value.
    const receiptName = saved.kind === 'object' && await tx.receiptObjectField.findUnique({ where: { objectId_fieldKey: { objectId: saved.row.id, fieldKey: 'name' } }, select: { id: true } });
    return { object: await this.catalogView(tx, c, saved.kind, revive({ ...saved.row, ...(receiptName ? { name: current.name } : {}) }), saved.position) };
  }
  private async mutate(a: string, h: string, op: string, target: string, body: unknown, key: string | undefined, action: (tx: Tx, c: Context) => Promise<Saved>) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    return this.transaction(a, h, true, async (tx, c) => {
      const hash = digest(JSON.stringify(body));
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation: op, target, key } };
      const prior = await tx.objectRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per una richiesta diversa.');
        return this.projectSaved(tx, c, prior.response as unknown as Saved);
      }
      const saved = await action(tx, c);
      await tx.objectRequest.create({ data: { accountId: a, homeId: h, operation: op, target, key, digest: hash, response: json(saved) } });
      return this.projectSaved(tx, c, saved);
    });
  }
  private async event(tx: Tx, c: Context, targetKind: string, targetId: string, kind: string, before: Saved | null, after: Saved) {
    await tx.objectEvent.create({ data: { accountId: c.a, homeId: c.h, targetKind, targetId, kind, before: before ? json(before) : Prisma.JsonNull, after: json(after) } });
  }
  private checkVersion(actual: number, expected: number, scope: string) {
    if (actual !== expected) throw conflict(scope + '_version_conflict', 'I dati sono cambiati. Rileggi prima di continuare.');
  }
  private active(state: string) { if (state !== 'active') throw conflict('resource_state_conflict', 'Ripristina prima di modificare.'); }
  async capabilities(a: string, h: string, q: unknown) {
    object(q, []); return this.transaction(a, h, false, async () => ({ apiVersion: 'home-objects-v1', enabled: true, isSimulation: false, limits: objectLimits, types: objectTypes, roomTypes }));
  }
  async getRoom(a: string, h: string, id: string, q: unknown) {
    object(q, []); return this.transaction(a, h, false, async (tx, c) => ({ room: this.roomView(await this.room(tx, c, id), c) }));
  }
  async createRoom(a: string, h: string, input: unknown, key?: string) {
    const body = createHomeObject(input, true);
    return this.mutate(a, h, 'room:create', '', body, key, async (tx, c) => {
      const row = await tx.homeRoom.create({ data: { homeId: h, name: body.name, type: body.type, note: body.note } });
      const saved: Saved = { kind: 'room', row }; await this.event(tx, c, 'room', row.id, 'created', null, saved); return saved;
    });
  }
  async updateRoom(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id); const body = updateHomeObject(input, true);
    return this.mutate(a, h, 'room:update', id, body, key, async (tx, c) => {
      const row = await this.room(tx, c, id); this.checkVersion(row.version, body.expectedVersion, 'room'); this.active(row.state);
      const data = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'expectedVersion'));
      if (Object.entries(data).every(([k, v]) => row[k as keyof HomeRoom] === v)) return { kind: 'room', row };
      const next = await tx.homeRoom.update({ where: { id }, data: { ...data, version: { increment: 1 }, updatedAt: new Date() } });
      const saved: Saved = { kind: 'room', row: next }; await this.event(tx, c, 'room', id, 'updated', { kind: 'room', row }, saved); return saved;
    });
  }
  async roomAction(a: string, h: string, id: string, action: 'archive' | 'restore', input: unknown, key?: string) {
    uuid(id); const body = objectAction(input);
    return this.mutate(a, h, 'room:' + action, id, body, key, async (tx, c) => {
      const row = await this.room(tx, c, id); this.checkVersion(row.version, body.expectedVersion, 'room');
      if (row.state !== (action === 'archive' ? 'active' : 'archived')) throw conflict('resource_state_conflict', 'Azione non consentita.');
      const next = await tx.homeRoom.update({ where: { id }, data: { state: action === 'archive' ? 'archived' : 'active', version: { increment: 1 }, updatedAt: new Date() } });
      const saved: Saved = { kind: 'room', row: next }; await this.event(tx, c, 'room', id, action === 'archive' ? 'archived' : 'restored', { kind: 'room', row }, saved); return saved;
    });
  }
  private cursor(input: string | undefined, binding: string): Cursor | null {
    if (!input) return null;
    try {
      const parsed = object(JSON.parse(Buffer.from(input, 'base64url').toString('utf8')), ['b', 't', 'id', 'k', 'n']);
      if (parsed.b !== binding || typeof parsed.t !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed.t) || !Number.isFinite(new Date(parsed.t).getTime())) throw invalid();
      if (parsed.k !== undefined && !['object', 'boiler', 'native', 'reference'].includes(String(parsed.k))) throw invalid();
      if(parsed.n!==undefined&&(typeof parsed.n!=='string'||[...parsed.n].length>200))throw invalid();
      return { b: binding, t: parsed.t, id: uuid(parsed.id), ...(parsed.n!==undefined?{n:parsed.n as string}:{}), ...(parsed.k !== undefined ? { k: String(parsed.k) } : {}) };
    } catch { throw invalid('Pagina non valida.'); }
  }
  private page<T>(rows: T[], limit: number, binding: string, anchor: (row: T) => Omit<Cursor, 'b'>) {
    const items = rows.slice(0, limit), last = items.at(-1);
    return { items, nextCursor: last && rows.length > limit ? Buffer.from(JSON.stringify({ b: binding, ...anchor(last) })).toString('base64url') : null };
  }
  async rooms(a: string, h: string, input: unknown) {
    const q = objectsQuery(input), b = digest(JSON.stringify([a, h, 'rooms', q.state])), cur = this.cursor(q.cursor, b);
    return this.transaction(a, h, false, async (tx, c) => {
      const rows = await tx.homeRoom.findMany({ where: { homeId: h, ...(q.state !== 'all' ? { state: q.state } : {}), ...(cur ? { OR: [{ createdAt: { lt: new Date(cur.t) } }, { createdAt: new Date(cur.t), id: { lt: cur.id } }] } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.limit + 1 });
      const page = this.page(rows, q.limit, b, r => ({ t: r.createdAt.toISOString(), id: r.id }));
      return { ...page, items: page.items.map(r => this.roomView(r, c)) };
    });
  }
  async getObject(a: string, h: string, kindInput: unknown, id: string, q: unknown) {
    object(q, []); const kind = subjectKind(kindInput);
    return this.transaction(a, h, false, async (tx, c) => ({ object: await this.catalogView(tx, c, kind, await this.subject(tx, c, kind, id)) }));
  }
  async findManual(a: string, h: string, id: string, input: unknown) {
    const lookup = manualLookup(input);
    const sourceVersion = await this.transaction(a, h, true, async (tx, c) => {
      const row = await this.subject(tx, c, 'object', uuid(id)); this.active(row.state); return row.version;
    });
    const result = await this.manuals.lookup(lookup, JSON.stringify([a, h, id, sourceVersion]));
    return this.transaction(a, h, true, async (tx, c) => {
      const row = await this.subject(tx, c, 'object', id); this.active(row.state); this.checkVersion(row.version, sourceVersion, 'object'); return result;
    });
  }
  async setManual(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id); const r = object(input, ['expectedVersion', 'selection']);
    const expectedVersion = version(r.expectedVersion), selection = manualSelection(r.selection);
    return this.mutate(a, h, 'object:manual', id, { expectedVersion, selection }, key, async (tx, c) => {
      const before = await this.saveSubject(tx, c, 'object', id);
      if (before.kind !== 'object') throw deny();
      this.active(before.row.state); this.checkVersion(before.row.version, expectedVersion, 'object');
      const proposed = selection.mode === 'remove' ? null : selection.mode === 'manual' ? selection.manual : this.manuals.accept(selection.token, JSON.stringify([a, h, id, expectedVersion]));
      const manual = proposed ? { ...proposed, boundVersion: expectedVersion + 1 } : null;
      await tx.homeObject.update({ where: { id }, data: { manual: manual ? json(manual) : Prisma.DbNull, version: { increment: 1 }, updatedAt: new Date() } });
      const after = await this.saveSubject(tx, c, 'object', id);
      await this.event(tx, c, 'object', id, manual ? 'manual_updated' : 'manual_removed', before, after); return after;
    });
  }
  async setProfile(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id); const r = object(input, ['expectedVersion', 'values', 'warrantyDocument']), expectedVersion = version(r.expectedVersion);
    const values = r.values === undefined ? {} : object(r.values, [...profileFields]);
    // BL-02: documento di supporto della scadenza dichiarata (undefined = invariato, null = rimosso).
    const warrantyDocument = warrantyDocumentInput(r.warrantyDocument);
    if (!Object.keys(values).length && warrantyDocument === undefined) throw invalid();
    const normalized = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === null ? null : profileValue(k as ProfileKey, v)]));
    const today = temporal(new Date()).today;
    for (const field of ['orderDate','purchaseDate','deliveredDate']) if (normalized[field] && normalized[field]! > today) throw invalid('La data effettiva non può essere futura.');
    return this.mutate(a, h, 'object:profile', id, { expectedVersion, values: normalized, ...(warrantyDocument !== undefined ? { warrantyDocument } : {}) }, key, async (tx, c) => {
      const before = await this.saveSubject(tx, c, 'object', id); if (before.kind !== 'object') throw deny();
      this.active(before.row.state); this.checkVersion(before.row.version, expectedVersion, 'object');
      const current = await objectProfileView(tx, a, h, id, before.row.profile); if (current.unavailable) throw deny();
      const fields: ObjectProfile = { ...current.fields };
      for (const [k, value] of Object.entries(normalized)) {
        const field = k as ProfileKey;
        if (value === null) delete fields[field]; else fields[field] = { value, origin: 'user_declared', sources: [] };
        if (field === 'brand' || field === 'model') {
          if (value === null) await tx.receiptObjectField.deleteMany({ where: { objectId: id, accountId: a, homeId: h, fieldKey: field } });
          else await tx.receiptObjectField.upsert({ where: { objectId_fieldKey: { objectId: id, fieldKey: field } }, create: { objectId: id, accountId: a, homeId: h, fieldKey: field, value, origin: 'user_declared', sources: [] }, update: { value, origin: 'user_declared', sources: [], documentId: null, documentVersion: null, documentSha256: null, version: { increment: 1 } } });
        }
      }
      if (fields.warrantyStart && fields.warrantyEnd && fields.warrantyEnd.value < fields.warrantyStart.value) throw invalid('La scadenza non può precedere l’inizio garanzia.');
      if (warrantyDocument) {
        // Solo un documento leggibile e già collegato a questo oggetto: il supporto non crea collegamenti nuovi.
        await this.resource(tx, c, 'document', warrantyDocument);
        const linked = await tx.objectResourceLink.findFirst({ where: { accountId: a, homeId: h, objectId: id, documentId: warrantyDocument, state: 'active' } });
        if (!linked) throw invalid('Collega prima il documento a questo oggetto.');
      }
      applyWarrantySupport(fields, warrantyDocument);
      await tx.homeObject.update({ where: { id }, data: { profile: json(fields), version: { increment: 1 } } });
      await tx.objectOnboardingComparison.updateMany({ where: { accountId: a, homeId: h, objectId: id, fieldKey: { in: Object.keys(normalized) }, state: 'open' }, data: { state: 'resolved', version: { increment: 1 } } });
      const after = await this.saveSubject(tx, c, 'object', id); await this.event(tx, c, 'object', id, 'profile_updated', before, after); return after;
    });
  }
  private async checkRooms(tx: Tx, c: Context, ids: string[], existing: string[] = []) {
    for (const id of ids) {
      const room = await this.room(tx, c, id);
      if (room.state !== 'active' && !existing.includes(id)) throw conflict('resource_state_conflict', 'Un ambiente selezionato è archiviato.');
    }
  }
  async createObject(a: string, h: string, input: unknown, key?: string) {
    const body = createHomeObject(input);
    return this.mutate(a, h, 'object:create', '', body, key, async (tx, c) => {
      await this.checkRooms(tx, c, body.roomIds!);
      const row = await tx.homeObject.create({ data: { accountId: a, homeId: h, name: body.name, type: body.type, note: body.note } });
      if (body.roomIds!.length) await tx.objectPosition.create({ data: { accountId: a, homeId: h, objectId: row.id, roomIds: body.roomIds! } });
      const saved = await this.saveSubject(tx, c, 'object', row.id); await this.event(tx, c, 'object', row.id, 'created', null, saved); return saved;
    });
  }
  async updateObject(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id); const body = updateHomeObject(input);
    return this.mutate(a, h, 'object:update', id, body, key, async (tx, c) => {
      const before = await this.saveSubject(tx, c, 'object', id);
      if (before.kind !== 'object') throw deny();
      this.checkVersion(before.row.version, body.expectedVersion, 'object'); this.active(before.row.state);
      const data = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'expectedVersion'));
      if (Object.entries(data).every(([k, v]) => before.row[k as keyof HomeObject] === v)) return before;
      await tx.homeObject.update({ where: { id }, data: { ...data, version: { increment: 1 }, updatedAt: new Date() } });
      if (body.name !== undefined && body.name !== before.row.name) await tx.receiptObjectField.updateMany({ where: { objectId: id, accountId: a, homeId: h, fieldKey: 'name' }, data: { value: body.name, origin: 'user_declared', sources: [], documentId: null, documentVersion: null, documentSha256: null, version: { increment: 1 }, updatedAt: new Date() } });
      const after = await this.saveSubject(tx, c, 'object', id); await this.event(tx, c, 'object', id, 'updated', before, after); return after;
    });
  }
  async objectAction(a: string, h: string, id: string, action: 'archive' | 'restore', input: unknown, key?: string) {
    uuid(id); const body = objectAction(input);
    return this.mutate(a, h, 'object:' + action, id, body, key, async (tx, c) => {
      const before = await this.saveSubject(tx, c, 'object', id);
      if (before.kind !== 'object') throw deny();
      this.checkVersion(before.row.version, body.expectedVersion, 'object');
      if (before.row.state !== (action === 'archive' ? 'active' : 'archived')) throw conflict('resource_state_conflict', 'Azione non consentita.');
      await tx.homeObject.update({ where: { id }, data: { state: action === 'archive' ? 'archived' : 'active', version: { increment: 1 }, updatedAt: new Date() } });
      const after = await this.saveSubject(tx, c, 'object', id); await this.event(tx, c, 'object', id, action === 'archive' ? 'archived' : 'restored', before, after); return after;
    });
  }
  async setPosition(a: string, h: string, kindInput: unknown, id: string, input: unknown, key?: string) {
    uuid(id); const kind = subjectKind(kindInput), body = positionBody(input);
    return this.mutate(a, h, kind + ':position', id, body, key, async (tx, c) => {
      const before = await this.saveSubject(tx, c, kind, id);
      if (before.kind !== kind) throw deny();
      this.active(before.row.state); this.checkVersion(before.position?.version ?? 0, body.expectedVersion, 'placement');
      const existing = before.position?.roomIds as string[] | undefined;
      await this.checkRooms(tx, c, body.roomIds, existing);
      if (JSON.stringify(existing ?? []) === JSON.stringify(body.roomIds)) return before;
      if (before.position) await tx.objectPosition.update({ where: { id: before.position.id }, data: { roomIds: body.roomIds, version: { increment: 1 } } });
      else await tx.objectPosition.create({ data: { accountId: a, homeId: h, ...targetWhere(kind, id), roomIds: body.roomIds } });
      const after = await this.saveSubject(tx, c, kind, id); await this.event(tx, c, kind, id, 'position_updated', before, after); return after;
    });
  }
  async objects(a: string, h: string, input: unknown) {
    const q=objectsQuery(input,true),b=digest(JSON.stringify([a,h,'objects',q.state,q.placement,q.roomId,q.q,q.type??null,q.sort])),cur=this.cursor(q.cursor,b);
    if(cur&&q.sort==='name'&&cur.n===undefined)throw invalid('Pagina non valida.');
    return this.transaction(a,h,false,async(tx,c)=>{
      if(q.roomId)await this.room(tx,c,q.roomId);
      const base=catalogBase(a,h,q),placement=catalogPlacement(q);
      const after=!cur?Prisma.sql`TRUE`:q.sort==='name'?Prisma.sql`(x."sortName" COLLATE "und-x-icu",x.kind,x.id)>(${cur.n} COLLATE "und-x-icu",${cur.k??''},${cur.id})`:Prisma.sql`(x."createdAt",x.kind,x.id)<(${cur.t}::timestamp,${cur.k??''},${cur.id})`;
      const order=q.sort==='name'?Prisma.sql`x."sortName" COLLATE "und-x-icu" ASC,x.kind ASC,x.id ASC`:Prisma.sql`x."createdAt" DESC,x.kind DESC,x.id DESC`;
      const rows=await tx.$queryRaw<Array<{id:string;kind:SubjectKind;createdAt:Date;sortName:string;brand:string|null;model:string|null}>>(Prisma.sql`${base} SELECT x.* FROM filtered x WHERE ${placement} AND ${after} ORDER BY ${order} LIMIT ${q.limit+1}`);
      const page=this.page(rows,q.limit,b,r=>({t:r.createdAt.toISOString(),k:r.kind,id:r.id,...(q.sort==='name'?{n:r.sortName}:{})}));
      const [counts]=await tx.$queryRaw<Array<{all:number;unplaced:number;total:number;rooms:Array<{id:string;name:string;count:number}>}>>(Prisma.sql`${base}
        SELECT count(*)::int AS "all",count(*) FILTER(WHERE jsonb_array_length(x."roomIds")=0)::int AS unplaced,
        count(*) FILTER(WHERE ${placement})::int AS total,
        COALESCE((SELECT jsonb_agg(y ORDER BY y.name COLLATE "und-x-icu",y.id) FROM (
          SELECT r.id,r.name,(SELECT count(*)::int FROM filtered f WHERE f."roomIds" @> jsonb_build_array(r.id)) AS count
          FROM "HomeRoom" r WHERE r."homeId"=${h} AND (r.state='active' OR r.id=${q.roomId??''})
        ) y),'[]'::jsonb) AS rooms FROM filtered x`);
      const items=await Promise.all(page.items.map(async r=>{
        const item=await this.catalogView(tx,c,r.kind,await this.subject(tx,c,r.kind,r.id));
        const next=await tx.homeActivity.findFirst({where:{accountId:a,homeId:h,state:'open',dueDate:{not:null},OR:[...(r.kind==='boiler'?[{assetId:r.id}]:[]),{objectLinks:{some:{accountId:a,homeId:h,state:'active',...targetWhere(r.kind,r.id)}}}]},orderBy:[{dueDate:'asc'},{id:'asc'}],select:{title:true,dueDate:true}});
        return {...item,summary:{brand:r.brand,model:r.model,nextActivity:next}};
      }));
      return {...page,items,total:counts.total,facets:{all:counts.all,unplaced:counts.unplaced,rooms:counts.rooms},today:temporal(new Date()).today};
    });
  }
  async history(a: string, h: string, kindInput: unknown, id: string, input: unknown) {
    const kind = kindInput === 'room' ? 'room' : subjectKind(kindInput), q = objectsQuery(input, false, true);
    const b = digest(JSON.stringify([a, h, kind, id, 'history'])), cur = this.cursor(q.cursor, b);
    return this.transaction(a, h, false, async (tx, c) => {
      if (kind === 'room') await this.room(tx, c, id); else await this.subject(tx, c, kind, id);
      const rows = await tx.objectEvent.findMany({ where: { homeId: h, targetKind: kind, targetId: id, ...(kind !== 'room' ? { accountId: a } : {}), ...(cur ? { OR: [{ at: { lt: new Date(cur.t) } }, { at: new Date(cur.t), id: { lt: cur.id } }] } : {}) }, orderBy: [{ at: 'desc' }, { id: 'desc' }], take: q.limit + 1 });
      const page = this.page(rows, q.limit, b, r => ({ t: r.at.toISOString(), id: r.id }));
      const snapshot = async (saved: unknown) => {
        const result = await this.projectSaved(tx, c, saved as Saved);
        return 'room' in result ? result.room : 'object' in result ? result.object : result.link;
      };
      return { ...page, items: await Promise.all(page.items.map(async r => ({ id: r.id, kind: r.kind, at: r.at.toISOString(),
        before: r.before ? await snapshot(r.before) : null, after: await snapshot(r.after) }))) };
    });
  }
  private async resource(tx: Tx, c: Context, type: ResourceType, id: string) {
    if (type === 'document') {
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
      const row = await tx.document.findUnique({ where: { id }, include: { original: true } });
      if (!row || row.homeId !== c.h || !canReadDocument(row, c.a) || !row.original) throw deny();
      return { id, title: row.name, assetId: null };
    }
    if (type === 'expense') await tx.$queryRaw`SELECT id FROM "HomeExpense" WHERE id=${id} FOR SHARE`;
    else await tx.$queryRaw`SELECT id FROM "HomeActivity" WHERE id=${id} FOR SHARE`;
    if (type === 'expense') {
      const row = await tx.homeExpense.findFirst({ where: { id, homeId: c.h, accountId: c.a } });
      if (!row) throw deny();
      const source = row.documentId ? await tx.document.findFirst({ where: { id: row.documentId, homeId: c.h, trashedAt: null, OR: [{ visibility: 'home' }, { uploaderId: c.a }] }, select: { id: true, name: true } }) : null;
      return { id, title: row.title, assetId: row.assetId, amountCents: row.amountCents, currency: 'EUR' as const, spentOn: row.spentOn, document: source ? { id: source.id, title: source.name } : null };
    }
    const row = await tx.homeActivity.findFirst({ where: { id, homeId: c.h, accountId: c.a } });
    if (!row) throw deny(); return { id, title: row.title, assetId: row.assetId };
  }
  private async linkView(tx: Tx, c: Context, row: ObjectResourceLink, kind: SubjectKind, id: string) {
    let resource: { id: string; title: string; amountCents?: number; currency?: 'EUR'; spentOn?: string; document?: { id: string; title: string } | null } | null = null;
    try { const found = await this.resource(tx, c, resourceType(row.resourceType), row.resourceId); resource = { id: found.id, title: found.title, ...('amountCents' in found ? { amountCents: found.amountCents, currency: found.currency, spentOn: found.spentOn, document: found.document } : {}) }; }
    catch (e) { if (!(e instanceof ForbiddenException)) throw e; }
    return { linkId: row.id, version: row.version, origin: 'reference', state: resource ? row.state : 'unavailable', resourceType: row.resourceType, resource, objectRef: { kind, id } };
  }
  async addLink(a: string, h: string, kindInput: unknown, id: string, input: unknown, key?: string) {
    const kind = subjectKind(kindInput), row = object(input, ['resourceType', 'resourceId']), body = { resourceType: resourceType(row.resourceType), resourceId: uuid(row.resourceId) }; uuid(id);
    return this.mutate(a, h, kind + ':link', id, body, key, async (tx, c) => {
      this.active((await this.subject(tx, c, kind, id)).state);
      const resource = await this.resource(tx, c, body.resourceType, body.resourceId);
      if (resource.assetId) {
        if (kind !== 'boiler' || resource.assetId !== id) throw conflict('resource_already_linked', 'La risorsa è già collegata a una caldaia.');
        throw conflict('resource_already_linked', 'Questo collegamento è già presente nella risorsa originale.');
      }
      const prior = await tx.objectResourceLink.findFirst({ where: { accountId: a, homeId: h, ...body, state: 'active', ...(body.resourceType === 'document' ? targetWhere(kind, id) : {}) } });
      if (prior && (prior.objectId ?? prior.boilerId) !== id) throw conflict('resource_already_linked', 'La risorsa ha già un oggetto principale.');
      const link = prior ?? await tx.objectResourceLink.create({ data: { accountId: a, homeId: h, ...targetWhere(kind, id), ...body,
        ...(body.resourceType === 'document' ? { documentId: body.resourceId } : body.resourceType === 'activity' ? { activityId: body.resourceId } : { expenseId: body.resourceId }) } });
      const saved: Saved = { kind: 'link', row: link, subjectKind: kind, subjectId: id };
      if (!prior) await this.event(tx, c, kind, id, 'linked', null, saved); return saved;
    });
  }
  async removeLink(a: string, h: string, kindInput: unknown, id: string, linkId: string, input: unknown, key?: string) {
    const kind = subjectKind(kindInput), row = object(input, ['expectedVersion']), body = { expectedVersion: version(row.expectedVersion) }; uuid(id); uuid(linkId);
    return this.mutate(a, h, kind + ':unlink', id + ':' + linkId, body, key, async (tx, c) => {
      await this.subject(tx, c, kind, id);
      const link = await tx.objectResourceLink.findFirst({ where: { id: linkId, accountId: a, homeId: h, ...targetWhere(kind, id) } });
      if (!link) throw deny(); this.checkVersion(link.version, body.expectedVersion, 'link'); this.active(link.state);
      const updated = await tx.objectResourceLink.update({ where: { id: linkId }, data: { state: 'removed', version: { increment: 1 } } });
      const before: Saved = { kind: 'link', row: link, subjectKind: kind, subjectId: id }, after: Saved = { ...before, row: updated };
      await this.event(tx, c, kind, id, 'unlinked', before, after); return after;
    });
  }
  async links(a: string, h: string, kindInput: unknown, id: string, input: unknown) {
    const kind = subjectKind(kindInput), row = object(input, ['resourceType', 'limit', 'cursor']), type = resourceType(row.resourceType);
    const q = objectsQuery(Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'resourceType')), false, true);
    const b = digest(JSON.stringify([a, h, kind, id, type, 'links'])), cur = this.cursor(q.cursor, b);
    return this.transaction(a, h, false, async (tx, c) => {
      await this.subject(tx, c, kind, id);
      const noNative = Prisma.sql`SELECT NULL::text AS id,NULL::text AS title,NULL::timestamp AS "createdAt" WHERE FALSE`;
      // A cost already identifies both the object and its source. Project that relationship
      // rather than creating another file or a reference that could outlive a moved cost.
      const costDocuments = Prisma.sql`SELECT DISTINCT d.id,d.name AS title,d."createdAt"
        FROM "HomeExpense" e JOIN "Document" d ON d.id=e."documentId"
        WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active'
          AND d."homeId"=${h} AND (d."trashedAt" IS NULL AND (d.visibility::text='home' OR d."uploaderId"=${a}))
          AND ${kind === 'boiler' ? Prisma.sql`e."assetId"=${id}` : Prisma.sql`EXISTS (
            SELECT 1 FROM "ObjectResourceLink" l WHERE l."expenseId"=e.id AND l."objectId"=${id}
              AND l."accountId"=${a} AND l."homeId"=${h} AND l.state='active')`}`;
      const analysisDocuments = kind !== 'boiler' ? noNative : Prisma.sql`
        SELECT DISTINCT d.id,d.name AS title,d."createdAt" FROM "AnalysisJob" j CROSS JOIN LATERAL jsonb_array_elements(j.documents) s JOIN "Document" d ON d.id=s->>'documentId'
        WHERE j."assetId"=${id} AND j.state='succeeded' AND d."homeId"=${h} AND (d."trashedAt" IS NULL AND (d.visibility::text='home' OR d."uploaderId"=${a}))`;
      const native = type === 'document' ? Prisma.sql`SELECT * FROM (${costDocuments}) costs UNION SELECT * FROM (${analysisDocuments}) analyses` : kind !== 'boiler' ? noNative : type === 'expense' ? Prisma.sql`
        SELECT id,title,"createdAt" FROM "HomeExpense" WHERE "assetId"=${id} AND "accountId"=${a} AND "homeId"=${h}` : Prisma.sql`
        SELECT id,title,"createdAt" FROM "HomeActivity" WHERE "assetId"=${id} AND "accountId"=${a} AND "homeId"=${h}`;
      const rows = await tx.$queryRaw<Array<{ id: string; origin: 'native' | 'reference'; title: string | null; createdAt: Date }>>(Prisma.sql`
        SELECT x.* FROM (
          SELECT n.id,'native'::text AS origin,n.title,n."createdAt" FROM (${native}) n
          UNION ALL SELECT l.id,'reference'::text,NULL::text AS title,l."createdAt" FROM "ObjectResourceLink" l WHERE l."accountId"=${a} AND l."homeId"=${h} AND l."resourceType"=${type} AND l.state='active'
          AND ${kind === 'object' ? Prisma.sql`l."objectId"=${id}` : Prisma.sql`l."boilerId"=${id}`}
          AND NOT EXISTS (SELECT 1 FROM (${native}) n WHERE n.id=l."resourceId")
        ) x WHERE ${cur ? Prisma.sql`(x."createdAt",x.origin,x.id)<(${cur.t}::timestamp,${cur.k ?? ''},${cur.id})` : Prisma.sql`TRUE`}
        ORDER BY x."createdAt" DESC,x.origin DESC,x.id DESC LIMIT ${q.limit + 1}`);
      const page = this.page(rows, q.limit, b, r => ({ t: r.createdAt.toISOString(), k: r.origin, id: r.id }));
      return { ...page, items: await Promise.all(page.items.map(async r => {
        if (r.origin === 'reference') return this.linkView(tx, c, (await tx.objectResourceLink.findUnique({ where: { id: r.id } }))!, kind, id);
        const found = await this.resource(tx, c, type, r.id);
        return { linkId: null, version: null, origin: 'native', state: 'active', resourceType: type,
          resource: { id: r.id, title: r.title, ...('amountCents' in found ? { amountCents: found.amountCents, currency: found.currency, spentOn: found.spentOn, document: found.document } : {}) }, objectRef: { kind, id } };
      })) };
    });
  }
}
