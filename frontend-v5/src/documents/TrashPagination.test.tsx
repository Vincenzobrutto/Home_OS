import { expect, it, vi } from 'vitest';
import { loadTrashPages, type TrashEntry } from './trash';
const entry = (id: string, version = 2): TrashEntry => ({ kind: 'document', id, name: 'Synthetic', version, trashedAt: '2026-10-24T10:00:00Z', purgeAfter: '2026-11-23T10:00:00Z' });
it('loads all pages before exposing a count, deduplicating entries by lifecycle', async () => {
  const read = vi.fn().mockResolvedValueOnce({ items: Array.from({ length: 500 }, (_, i) => entry(String(i))), nextCursor: 'opaque+/=' }).mockResolvedValueOnce({ items: [entry('0', 4), entry('500')], nextCursor: null });
  const result = await loadTrashPages('home', read);
  expect(result.items).toHaveLength(501); expect(result.items[0]!.version).toBe(4);
  expect(read.mock.calls.map(call => call[0])).toEqual(['/homes/home/trash', '/homes/home/trash?cursor=opaque%2B%2F%3D']);
});
it('does not release a partial list when a continuation fails', async () => {
  const read = vi.fn().mockResolvedValueOnce({ items: [entry('one')], nextCursor: 'next' }).mockRejectedValueOnce(new Error('Synthetic unavailable'));
  await expect(loadTrashPages('home', read)).rejects.toThrow('Synthetic unavailable'); expect(read).toHaveBeenCalledTimes(2);
});
it('rejects a repeated cursor without looping or retrying', async () => {
  const read = vi.fn().mockResolvedValue({ items: [entry('one')], nextCursor: 'same' });
  await expect(loadTrashPages('home', read)).rejects.toThrow('Paginazione'); expect(read).toHaveBeenCalledTimes(2);
});
it('accepts an older unpaginated backend response', async () => {
  const read = vi.fn().mockResolvedValue({ items: [entry('one')] });
  expect((await loadTrashPages('home', read)).items).toEqual([entry('one')]); expect(read).toHaveBeenCalledTimes(1);
});
