import { Injectable } from '@nestjs/common';
import { invalid, object, uuid, version } from '../review/domain';
export type State = 'open' | 'completed' | 'cancelled';
export type Snapshot = { title: string; description: string | null; dueDate: string | null; state: State; assetId: string | null };
export const limits = { titleMaxCodePoints: 120, descriptionMaxCodePoints: 2000, noteMaxCodePoints: 500, soonDays: 7, maxHomePreviewItems: 3 } as const;
@Injectable()
export class ActivityClock { now(): Date { return new Date(); } }
export function temporal(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return { asOf: now.toISOString(), today: `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`, timeZone: 'Europe/Rome' as const };
}
export function calendar(input: unknown): string | null {
  if (input === null) return null;
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) throw invalid();
  const [y, m, d] = input.split('-').map(Number), leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1]) throw invalid();
  return input;
}
export function plusDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function dueState(row: Pick<Snapshot, 'state' | 'dueDate'>, today: string) {
  return row.state !== 'open' ? 'closed' : !row.dueDate ? 'undated' : row.dueDate < today ? 'overdue' : row.dueDate === today ? 'today' : 'upcoming';
}
function normalized(input: unknown, max: number, nullable = false): string | null {
  if (nullable && input === null) return null;
  if (typeof input !== 'string') throw invalid();
  const text = input.trim().normalize('NFC');
  if ([...text].length > max || (!text && !nullable)) throw invalid();
  return text || null;
}
export function createBody(input: unknown) {
  const row = object(input, ['title', 'description', 'dueDate', 'assetId']);
  return { title: normalized(row.title, 120)!, description: row.description === undefined ? null : normalized(row.description, 2000, true), dueDate: row.dueDate === undefined ? null : calendar(row.dueDate), assetId: row.assetId == null ? null : uuid(row.assetId) };
}
export function updateBody(input: unknown) {
  const row = object(input, ['expectedVersion', 'title', 'description', 'dueDate', 'assetId']);
  if (!['title', 'description', 'dueDate', 'assetId'].some(k => Object.hasOwn(row, k))) throw invalid();
  return { expectedVersion: version(row.expectedVersion), ...(row.title !== undefined ? { title: normalized(row.title, 120)! } : {}), ...(row.description !== undefined ? { description: normalized(row.description, 2000, true) } : {}), ...(row.dueDate !== undefined ? { dueDate: calendar(row.dueDate) } : {}), ...(row.assetId !== undefined ? { assetId: row.assetId === null ? null : uuid(row.assetId) } : {}) };
}
export function actionBody(input: unknown) {
  const row = object(input, ['expectedVersion', 'note']);
  if (row.note !== undefined && typeof row.note !== 'string') throw invalid();
  return { expectedVersion: version(row.expectedVersion), note: row.note === undefined ? null : normalized(row.note, 500, true) };
}
export function listQuery(input: unknown, history = false) {
  const row = object(input, history ? ['limit', 'cursor'] : ['state', 'due', 'assetId', 'limit', 'cursor']);
  const state = row.state ?? 'open', due = row.due ?? 'all';
  if (typeof state !== 'string' || typeof due !== 'string') throw invalid();
  if (!['open', 'completed', 'cancelled', 'all'].includes(String(state)) || !['all', 'overdue', 'today', 'upcoming', 'undated'].includes(String(due)) || (due !== 'all' && state !== 'open')) throw invalid();
  if (row.limit !== undefined && (typeof row.limit !== 'string' || !/^[1-9]\d?$/.test(row.limit) || Number(row.limit) > 50)) throw invalid();
  if (row.cursor !== undefined && (typeof row.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,4096}$/.test(row.cursor))) throw invalid();
  return { state: state as State | 'all', due: String(due), assetId: row.assetId === undefined ? null : uuid(row.assetId), limit: Number(row.limit ?? 20), cursor: row.cursor as string | undefined };
}
