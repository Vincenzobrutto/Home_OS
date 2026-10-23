import { ui } from '../components/ui';
import type { ObjectType } from '../api/types';
import { apparatusSuggestions, objectTypeLabels } from './apparatusSuggestions';

export function ApparatusSuggestion({ name, selectedType, disabled, onType }: { name: string; selectedType: string; disabled: boolean; onType: (type: ObjectType) => void }) {
  const entries = apparatusSuggestions(name);
  if (!entries.length) return null;
  if (entries.length !== 1) return <p>Il nome richiama più apparati del catalogo. Verifica il tipo e separa gli oggetti distinti prima di confermare.</p>;
  const entry = entries[0]!;
  return <aside aria-label="Suggerimento dal catalogo apparati">
    <p>Catalogo di riferimento: {entry.name} · {entry.subjectKind==='system'?'impianto o componente installato':'oggetto o apparecchio'}. Tipo suggerito, da confermare: {objectTypeLabels[entry.objectType as ObjectType]}.</p>
    {!selectedType && <button className={ui.btn} type="button" disabled={disabled} onClick={() => onType(entry.objectType as ObjectType)}>Usa il tipo suggerito</button>}
    <p>Ambiente tipico, da confermare: {entry.typicalLocation}. {entry.distributed ? 'Può interessare più ambienti o componenti: verifica la collocazione dalla scheda.' : 'Dopo aver salvato la scheda, scegli tra gli ambienti della casa.'}</p>
    <p className={ui.hint}>Il catalogo non prova il possesso, la posizione o le caratteristiche dell’apparato. Non aggiunge garanzie o scadenze.</p>
  </aside>;
}
