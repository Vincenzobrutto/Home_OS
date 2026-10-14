import { invalid, object, uuid, version } from '../review/domain';

export const objectTypes = ['appliance', 'heating', 'cooling', 'electrical', 'plumbing', 'security', 'fixture', 'other'] as const;
export const roomTypes = ['kitchen', 'living', 'bedroom', 'bathroom', 'hall', 'utility', 'outdoor', 'other'] as const;
export const objectLimits = { nameMaxCodePoints: 120, roomNameMaxCodePoints: 80, noteMaxCodePoints: 500, maxRoomsPerObject: 20, maxPageSize: 50 } as const;
export type SubjectKind = 'object' | 'boiler';

function normalized(input: unknown, max: number, nullable = false): string | null {
  if (nullable && input === null) return null;
  if (typeof input !== 'string') throw invalid();
  const result = input.trim().normalize('NFC');
  if ([...result].length > max || (!nullable && !result)) throw invalid();
  return result || null;
}
function category(input: unknown, room: boolean) {
  const types: readonly string[] = room ? roomTypes : objectTypes;
  if (typeof input !== 'string' || !types.includes(input)) throw invalid();
  return input;
}
export function roomIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length > objectLimits.maxRoomsPerObject) throw invalid();
  const values = input.map(uuid);
  if (new Set(values).size !== values.length) throw invalid('Seleziona ogni ambiente una sola volta.');
  return values.sort();
}
export function subjectKind(input: unknown): SubjectKind {
  if (input !== 'object' && input !== 'boiler') throw invalid();
  return input;
}
export function createHomeObject(input: unknown, room = false) {
  const row = object(input, room ? ['name', 'type', 'note'] : ['name', 'type', 'note', 'roomIds']);
  return {
    name: normalized(row.name, room ? objectLimits.roomNameMaxCodePoints : objectLimits.nameMaxCodePoints)!,
    type: category(row.type, room),
    note: row.note === undefined ? null : normalized(row.note, objectLimits.noteMaxCodePoints, true),
    ...(!room ? { roomIds: row.roomIds === undefined ? [] : roomIds(row.roomIds) } : {}),
  };
}
export function updateHomeObject(input: unknown, room = false) {
  const row = object(input, ['expectedVersion', 'name', 'type', 'note']);
  if (!['name', 'type', 'note'].some(key => Object.hasOwn(row, key))) throw invalid();
  return {
    expectedVersion: version(row.expectedVersion),
    ...(row.name !== undefined ? { name: normalized(row.name, room ? objectLimits.roomNameMaxCodePoints : objectLimits.nameMaxCodePoints)! } : {}),
    ...(row.type !== undefined ? { type: category(row.type, room) } : {}),
    ...(row.note !== undefined ? { note: normalized(row.note, objectLimits.noteMaxCodePoints, true) } : {}),
  };
}
export function objectAction(input: unknown) {
  const row = object(input, ['expectedVersion']);
  return { expectedVersion: version(row.expectedVersion) };
}
export function positionBody(input: unknown) {
  const row = object(input, ['expectedVersion', 'roomIds']);
  if (!Number.isSafeInteger(row.expectedVersion) || Number(row.expectedVersion) < 0) throw invalid();
  return { expectedVersion: row.expectedVersion as number, roomIds: roomIds(row.roomIds) };
}
export function objectsQuery(input: unknown, catalog = false, history = false) {
  const row = object(input, history ? ['limit', 'cursor'] : ['state', 'limit', 'cursor', ...(catalog ? ['roomId', 'placement', 'q', 'type'] : [])]);
  const state = row.state ?? 'active', placement = row.placement ?? 'all';
  if (!['active', 'archived', 'all'].includes(String(state)) || typeof state !== 'string' || !['all', 'unplaced'].includes(String(placement)) || typeof placement !== 'string') throw invalid();
  if (row.roomId !== undefined && placement === 'unplaced') throw invalid();
  if (row.limit !== undefined && (typeof row.limit !== 'string' || !/^[1-9]\d?$/.test(row.limit) || Number(row.limit) > 50)) throw invalid();
  if (row.cursor !== undefined && (typeof row.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(row.cursor))) throw invalid();
  if (row.type !== undefined && (typeof row.type !== 'string' || ![...objectTypes, 'boiler'].includes(row.type))) throw invalid();
  return { state: state as 'active' | 'archived' | 'all', placement: placement as 'all' | 'unplaced', roomId: row.roomId === undefined ? null : uuid(row.roomId), q: row.q === undefined ? null : normalized(row.q, 80, true), type: row.type as string | undefined, limit: Number(row.limit ?? 20), cursor: row.cursor as string | undefined };
}
