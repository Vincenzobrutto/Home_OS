import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { useId } from 'react';
import { Link } from 'react-router';
import type { ActivityCapabilities, CatalogItem, Home } from '../api/types';
import { cx, ui } from '../components/ui';
import type { Field } from '../object-onboarding/model';
import { CreateAndLink } from './components';
import detail from './detail.module.css';
import { useObjectLinks } from './hooks';

/**
 * BL-02 — garanzia manuale. Nessuna copertura presunta: la scadenza è inserita dall'utente (data o mesi),
 * letta da un documento o assente. I 24 mesi sono solo una scorciatoia esplicita.
 */
export const LEGAL_WARRANTY_MONTHS = 24;

/** Mesi di calendario dalla data indicata; il giorno mancante diventa l'ultimo del mese (come il servizio). */
export function addCalendarMonths(value: string, months: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isInteger(months) || months < 1 || months > 600) return null;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const end = new Date(Date.UTC(year, month - 1 + months + 1, 0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, end.getUTCDate())).padStart(2, '0')}`;
}

export const isoToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(now);
export const warrantyExpired = (end: string, today = isoToday()) => end < today;
const formatDate = (value: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));

/** Data suggerita nel modulo del promemoria (modificabile): 30 giorni prima della scadenza, mai nel passato. */
export function suggestedReminderDate(end: string, today = isoToday()): string {
  const d = new Date(end + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 30);
  const proposal = d.toISOString().slice(0, 10);
  return proposal < today ? today : proposal;
}

type WarrantyEnd = Field & { support?: { documentId: string; name: string } | null; supportUnavailable?: boolean };

/** Provenienza leggibile: dichiarata, dichiarata con documento associato, letta da un documento. */
export function warrantyProvenance(end: WarrantyEnd): string {
  if (end.origin === 'user_declared') {
    if (end.support) return `Dichiarata da te · documento associato: «${end.support.name}»`;
    if (end.supportUnavailable) return 'Dichiarata da te · documento associato non più disponibile';
    return 'Dichiarata da te';
  }
  if (end.origin === 'extraction_confirmed') return 'Letta dal documento';
  if (end.origin === 'manufacturer_page') return 'Dalla pagina ufficiale del produttore';
  if (end.origin === 'default_24_months') return 'Proposta di 24 mesi accettata in passato: verifica le condizioni';
  return 'Da verificare';
}

/** Riquadro sintetico della scheda oggetto: scadenza o scadenza superata, provenienza e comando promemoria. */
export function WarrantySummary(props: { home: Home; object: CatalogItem; canRemind: boolean; onRemind: () => void }) {
  const end = props.object.profile?.fields.warrantyEnd as WarrantyEnd | undefined;
  if (!end) return null;
  const expired = warrantyExpired(end.value);
  return (
    <div className={detail.warranty}>
      <ShieldCheck size={26} aria-hidden="true" />
      <div>
        <span>Garanzia</span>
        <strong className={expired ? detail.warrantyExpired : undefined}>{expired ? 'scaduta il ' : 'fino al '}{formatDate(end.value)}</strong>
        <small className={detail.warrantySource}>
          {end.origin === 'user_declared' && end.support
            ? <>Dichiarata da te · documento associato: <Link to={`/home/${encodeURIComponent(props.home.id)}/documenti/${encodeURIComponent(end.support.documentId)}`}>{end.support.name}</Link></>
            : warrantyProvenance(end)}
        </small>
        {props.canRemind && !expired && (
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRemind}>Crea promemoria</button>
        )}
      </div>
    </div>
  );
}

/** Promemoria della garanzia: stesso flusso di «Crea promemoria per questo oggetto», con valori iniziali modificabili. */
export function WarrantyReminder(props: { home: Home; object: CatalogItem; activityCapabilities?: ActivityCapabilities; onClose: () => void }) {
  const end = props.object.profile?.fields.warrantyEnd;
  if (!end) return null;
  return (
    <CreateAndLink
      home={props.home}
      object={props.object}
      resourceType="activity"
      activityCapabilities={props.activityCapabilities}
      activityInitial={{
        title: `Scadenza garanzia: ${props.object.name}`.slice(0, 120),
        dueDate: suggestedReminderDate(end.value),
        description: `La garanzia dichiarata scade il ${formatDate(end.value)}. Controlla condizioni e documenti prima della scadenza.`,
      }}
      onClose={props.onClose}
      onDone={props.onClose}
    />
  );
}

export type WarrantyDraft = { start: string; mode: 'date' | 'months'; end: string; months: string; supportId: string };

export function initialWarrantyDraft(object: CatalogItem): WarrantyDraft {
  const fields = object.profile?.fields ?? {};
  const end = fields.warrantyEnd as WarrantyEnd | undefined;
  return { start: fields.warrantyStart?.value ?? '', mode: 'date', end: end?.value ?? '', months: '', supportId: end?.support?.documentId ?? '' };
}

/** Scadenza risultante dal modulo: dalla data scelta oppure dai mesi a partire dall'inizio. */
export function draftEnd(draft: WarrantyDraft): string | null {
  if (draft.mode === 'date') return draft.end || null;
  if (!draft.months.trim()) return null;
  return draft.start ? addCalendarMonths(draft.start, Number(draft.months)) : null;
}

export function warrantyDraftError(draft: WarrantyDraft): string | null {
  if (draft.mode === 'months' && draft.months.trim()) {
    const n = Number(draft.months);
    if (!Number.isInteger(n) || n < 1 || n > 600) return 'Indica una durata in mesi intera, da 1 a 600.';
    if (!draft.start) return 'Per calcolare la scadenza dai mesi indica l’inizio della garanzia.';
  }
  const end = draftEnd(draft);
  if (end && draft.start && end < draft.start) return 'La scadenza non può precedere l’inizio garanzia.';
  if (draft.supportId && !end) return 'Il documento di supporto si collega a una scadenza: indicala prima.';
  return null;
}

/**
 * Modifica della garanzia nella scheda: inizio, scadenza come data o mesi (con scorciatoia esplicita
 * dei 24 mesi) e documento di supporto scelto tra quelli già collegati all'oggetto.
 */
export function WarrantyFields(props: { homeId: string; object: CatalogItem; draft: WarrantyDraft; purchaseDate: string; error: string | null; onChange: (draft: WarrantyDraft) => void }) {
  const { draft } = props;
  const id = useId();
  const links = useObjectLinks(props.homeId, props.object.ref, 'document');
  const documents = (links.data?.pages.flatMap(p => p.items) ?? []).filter(l => l.state === 'active' && l.resource);
  const set = (patch: Partial<WarrantyDraft>) => props.onChange({ ...draft, ...patch });
  const computed = draft.mode === 'months' ? draftEnd(draft) : null;
  const current = props.object.profile?.fields.warrantyEnd as WarrantyEnd | undefined;
  const documentSourced = !!current && current.origin !== 'user_declared' && draft.mode === 'date' && draft.end === current.value;
  return (
    <fieldset className={detail.warrantyFields}>
      <legend>Garanzia</legend>
      <label>Inizio garanzia
        <input className={ui.input} type="date" value={draft.start} onChange={e => set({ start: e.target.value })} />
      </label>
      {props.purchaseDate && draft.start !== props.purchaseDate && (
        <button type="button" className={detail.linkButton} onClick={() => set({ start: props.purchaseDate })}>Usa la data di acquisto</button>
      )}
      <div role="radiogroup" aria-labelledby={`${id}-mode`} className={detail.warrantyMode}>
        <span id={`${id}-mode`}>Scadenza</span>
        <label><input type="radio" name={`${id}-mode`} checked={draft.mode === 'date'} onChange={() => set({ mode: 'date' })} /> Fino al</label>
        <label><input type="radio" name={`${id}-mode`} checked={draft.mode === 'months'} onChange={() => set({ mode: 'months' })} /> Durata in mesi</label>
      </div>
      {draft.mode === 'date' ? (
        <label>Garanzia fino al
          <input className={ui.input} type="date" value={draft.end} onChange={e => set({ end: e.target.value })} />
        </label>
      ) : (
        <>
          <label>Durata in mesi
            <input className={ui.input} inputMode="numeric" value={draft.months} onChange={e => set({ months: e.target.value })} />
          </label>
          <p className={detail.warrantyHint}>{computed ? `Scade il ${formatDate(computed)}.` : 'La scadenza si calcola dall’inizio della garanzia.'}</p>
        </>
      )}
      <button type="button" className={detail.linkButton} onClick={() => set({ mode: 'months', months: String(LEGAL_WARRANTY_MONTHS) })}>
        Usa 24 mesi · garanzia legale per i beni di consumo
      </button>
      <p className={detail.warrantyHint}>Lo inserisci tu: Dimora non presume nessuna copertura. Verifica decorrenza, condizioni ed eventuali estensioni.</p>
      {documentSourced ? (
        <p className={detail.warrantyHint}>Scadenza letta dal documento: la fonte è già indicata.</p>
      ) : (
        <label>Documento di supporto (facoltativo)
          <select className={ui.input} value={draft.supportId} disabled={links.isPending} onChange={e => set({ supportId: e.target.value })}>
            <option value="">Nessuno</option>
            {documents.map(l => <option key={l.resource!.id} value={l.resource!.id}>{l.resource!.title}</option>)}
          </select>
          <span className={detail.warrantyHint}>Solo documenti già collegati a questo oggetto. La data resta «dichiarata da te».</span>
        </label>
      )}
      {props.error && <p role="alert" className={detail.warrantyError}>{props.error}</p>}
    </fieldset>
  );
}
