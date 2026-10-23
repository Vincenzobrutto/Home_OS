import reference from './apparatus-reference.json';
import type { ObjectType, Room } from '../api/types';

export type ApparatusReference = typeof reference.entries[number];
export const apparatusReference = reference;
export const objectTypeLabels: Record<ObjectType, string> = { appliance: 'Elettrodomestico', heating: 'Riscaldamento', cooling: 'Climatizzazione', electrical: 'Elettrico', plumbing: 'Idraulica', security: 'Sicurezza', fixture: 'Dotazione fissa', other: 'Altro oggetto' };
const normalized = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ');
const contains = (text: string, phrase: string) => (' ' + text + ' ').includes(' ' + phrase + ' ');

/** A local vocabulary hint is never evidence, an ownership assertion or an automatic choice. */
export function apparatusSuggestions(name: string): ApparatusReference[] {
  const text = normalized(name);
  if (/\b(?:manuale|garanzia|fattura|riparazione|manutenzione|installazione|filtr[oi]|sacchetti|ricambi[oi]|kit|tubo|cavo|detergente|cartuccia)\b/u.test(text)) return [];
  const padded = ' ' + text + ' ';
  const hits = reference.entries.flatMap(entry => entry.aliases.flatMap(alias => {
    const needle = ' ' + normalized(alias) + ' ', matches = [];
    for (let start = padded.indexOf(needle); start !== -1; start = padded.indexOf(needle, start + 1)) {
      matches.push({ entry, start, end: start + needle.length });
    }
    return matches;
  }));
  // Specificity is local to an occurrence: a separate boiler must not disappear
  // merely because another item is an iron with a boiler.
  const specific = hits.filter(hit => !hits.some(other => other.entry.id !== hit.entry.id && other.end - other.start > hit.end - hit.start && other.start <= hit.start && other.end >= hit.end));
  return [...new Map(specific.map(hit => [hit.entry.id, hit.entry])).values()];
}

const roomWords: Record<string, string[]> = {
  kitchen: ['cucina'], bathroom: ['bagno', 'bagni'], living: ['soggiorno', 'salotto', 'sala'], bedroom: ['camera', 'camere', 'cameretta'], hall: ['ingresso', 'corridoio'],
  outdoor: ['esterno', 'esterni'], garden: ['giardino'], garage: ['garage', 'box auto', 'autorimessa'], cellar: ['cantina'], technical: ['locale tecnico', 'vano tecnico', 'locale caldaia'],
  meters: ['vano contatori'], storage: ['ripostiglio'], laundry: ['lavanderia'], study: ['studio'], balcony: ['balcone'], terrace: ['terrazzo', 'terrazza'], tavern: ['taverna'], roof: ['tetto'], facade: ['facciata'], stairs: ['vano scale'],
};
const formalTypes = new Set(['kitchen', 'bathroom', 'living', 'bedroom', 'hall', 'outdoor']);
// Some catalogue locations are more specific than the application's room types.
const roomSubtypes: Record<string, string[]> = { outdoor: ['garden', 'balcony', 'terrace', 'roof', 'facade'], hall: ['stairs'] };
/** Only caller-supplied, authorized active rooms. Distributed systems need an explicit multi-room choice. */
export function typicalRooms(entry: ApparatusReference, rooms: Pick<Room, 'id' | 'name' | 'type' | 'state'>[]) {
  if (entry.distributed) return [];
  return rooms.filter(room => {
    if (room.state !== 'active') return false;
    const named = (key: string) => (roomWords[key] ?? []).some(word => contains(normalized(room.name), word));
    // A declared type wins over an unrelated room mentioned in its free name;
    // narrower locations still need their own explicit name (e.g. a balcony).
    if (formalTypes.has(room.type)) return entry.roomKeys.includes(room.type) || entry.roomKeys.some(key => roomSubtypes[room.type]?.includes(key) && named(key));
    return entry.roomKeys.some(named);
  });
}
