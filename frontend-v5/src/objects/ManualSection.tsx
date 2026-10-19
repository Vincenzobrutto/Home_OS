import {FieldInfo} from '../components/FieldInfo';
import { useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CatalogItem, ObjectManual } from '../api/types';
import { isApiError, isUnauthorized, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import { useAccount, useApi } from '../session/session';
import { handleUnauthorized } from '../session/queryClient';
import { Banner, cx, ui } from '../components/ui';
import pages from '../routes/pages.module.css';
import styles from './manual.module.css';

type Candidate = { manual: ObjectManual; token: string };
type Selection = { mode: 'candidate'; token: string } | { mode: 'remove' } | { mode: 'manual'; url: string; brand: string; reference: string; kind: 'manual' | 'support' };
export function ManualSection({ homeId, object, canEdit,compact=false }: { homeId: string; object: CatalogItem; canEdit: boolean;compact?:boolean }) {
  const api = useApi(), account = useAccount(), cache = useQueryClient(), id = useId();
  const [editing, setEditing] = useState(false), [brand, setBrand] = useState(object.manual?.brand ?? object.profile?.fields.brand?.value ?? ''), [reference, setReference] = useState(object.manual?.reference ?? object.profile?.fields.reference?.value ?? object.profile?.fields.model?.value ?? '');
  const [productUrl, setProductUrl] = useState(''), [url, setUrl] = useState(object.manual?.url ?? ''), [kind, setKind] = useState<'manual' | 'support'>(object.manual?.kind ?? 'manual');
  const [candidate, setCandidate] = useState<Candidate | null>(null), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const attempt = useRef<{ body: { expectedVersion: number; selection: Selection }; key: string } | null>(null);
  const base = `/homes/${encodeURIComponent(homeId)}/objects/object/${encodeURIComponent(object.ref.id)}`;
  const manual = object.manual;
  const disabled = busy || uncertain;
  const canChange = canEdit && object.state === 'active';
  const resetCandidate = () => { setCandidate(null); setMessage(''); setError(''); };
  const failed = async (e: unknown) => { if (isUnauthorized(e)) await handleUnauthorized(cache); setError(userMessage(e)); };
  async function lookup() {
    setBusy(true); resetCandidate();
    try {
      const result = await api.callJson<{ candidate: Candidate | null; reason: string | null }>(base + '/manual-proposals', { method: 'POST', body: { brand, reference, ...(productUrl.trim() ? { productUrl: productUrl.trim() } : {}) }, accountId: account.id });
      if (result.candidate) setCandidate(result.candidate);
      else setMessage(result.reason === 'product_page_needed' ? 'Indica la pagina prodotto ufficiale Moulinex, oppure aggiungi il link del manuale qui sotto. Altri produttori: per ora aggiungi il link manualmente.' : 'Non ho trovato un unico manuale per questo riferimento. Controlla il modello o aggiungi il link manualmente.');
    } catch (e) { await failed(e); }
    finally { setBusy(false); }
  }
  async function save(selection?: Selection) {
    if (!attempt.current) {
      if (!selection) return;
      attempt.current = { body: { expectedVersion: object.version ?? 1, selection }, key: newIdempotencyKey() };
    }
    setBusy(true); setError('');
    try {
      await api.callJson(base + '/manual', { method: 'POST', body: attempt.current.body, idempotencyKey: attempt.current.key, accountId: account.id });
      attempt.current = null; setUncertain(false); setEditing(false); setCandidate(null);
      await cache.invalidateQueries({ queryKey: ['account', account.id, 'home', homeId, 'g1'] });
    } catch (e) {
      const known = isApiError(e) && e.kind === 'http' && e.status < 500;
      if (known) { attempt.current = null; setUncertain(false); } else setUncertain(true);
      await failed(e);
    } finally { setBusy(false); }
  }
  return <section className={cx(ui.card,compact&&!editing&&styles.compact)} aria-labelledby={id + '-title'}>
    <h2 aria-label="Manuale e istruzioni" id={id + '-title'} className={pages.cardTitle}>Manuale e istruzioni{compact&&<FieldInfo label="Manuale e istruzioni"><p>Collegamenti esterni. I documenti che hai caricato restano nella sezione Documenti collegati.</p></FieldInfo>}</h2>
    {!compact&&<p className={pages.muted}>Collegamenti esterni. I documenti che hai caricato restano nella sezione Documenti collegati.</p>}
    {manual ? <>
      <p><a className={ui.btn} href={manual.url} target="_blank" rel="noopener noreferrer">{manual.kind === 'manual' ? manual.origin === 'manufacturer_page' ? 'Apri manuale sul sito del produttore' : 'Apri manuale online' : 'Istruzioni e assistenza'} <span className="visually-hidden">(si apre in una nuova scheda)</span></a></p>
      <p className={pages.small}>{manual.brand} · {manual.reference} · {manual.origin === 'manufacturer_page' ? 'Trovato sulla pagina ufficiale del modello' : 'Collegamento aggiunto da te'}</p>
      {manual.needsReview && <Banner tone="warning"><p>La scheda è cambiata: controlla che il manuale riguardi ancora questo modello.</p></Banner>}
    </> : <p>Nessun manuale online collegato.</p>}
    {canChange && !editing && <button type="button" className={ui.btn} onClick={() => { setEditing(true); setError(''); }}>{manual ? 'Modifica manuale' : 'Trova o aggiungi manuale'}</button>}
    {canChange && editing && <div className={styles.stack}>
      <form className={styles.stack} onSubmit={e => { e.preventDefault(); void lookup(); }}>
        <div className={styles.fields}>
          <label className={styles.field} htmlFor={id + '-brand'}>Marca<input className={ui.input} id={id + '-brand'} value={brand} maxLength={80} required disabled={disabled} onChange={e => { setBrand(e.target.value); resetCandidate(); }} /></label>
          <label className={styles.field} htmlFor={id + '-reference'}>Riferimento del modello<input className={ui.input} id={id + '-reference'} value={reference} maxLength={80} required disabled={disabled} onChange={e => { setReference(e.target.value); resetCandidate(); }} /></label>
        </div>
        <label className={styles.field} htmlFor={id + '-product'}>Pagina prodotto del produttore (facoltativa)<input className={ui.input} type="url" id={id + '-product'} value={productUrl} disabled={disabled} onChange={e => { setProductUrl(e.target.value); resetCandidate(); }} /></label>
        <p className={pages.small}>Ricerca automatica iniziale: Moulinex. Invio al sito soltanto il riferimento del prodotto, senza foto o dati della casa.</p>
        <div><button className={ui.btn} disabled={disabled} type="submit">{busy ? 'Attendi…' : 'Cerca manuale ufficiale'}</button></div>
      </form>
      {candidate && <div className={styles.proposal}>
        <strong>Manuale trovato · {candidate.manual.brand} {candidate.manual.reference}</strong>
        <p><a href={candidate.manual.url} target="_blank" rel="noopener noreferrer">Controlla il manuale (nuova scheda)</a></p>
        <button className={cx(ui.btn, ui.primary)} type="button" disabled={disabled} onClick={() => void save({ mode: 'candidate', token: candidate.token })}>Collega questo manuale</button>
      </div>}
      {message && <p role="status">{message}</p>}
      <details>
        <summary>Aggiungi un collegamento manualmente</summary>
        <form className={styles.stack} onSubmit={e => { e.preventDefault(); if (!brand.trim() || !reference.trim()) { setError('Indica marca e riferimento del modello.'); return; } void save({ mode: 'manual', url, brand, reference, kind }); }}>
          <label className={styles.field} htmlFor={id + '-url'}>Link HTTPS al manuale o al supporto<input type="url" className={ui.input} id={id + '-url'} value={url} required disabled={disabled} onChange={e => setUrl(e.target.value)} /></label>
          <label className={styles.field} htmlFor={id + '-kind'}>Tipo di collegamento<select className={ui.input} id={id + '-kind'} value={kind} disabled={disabled} onChange={e => setKind(e.target.value as 'manual' | 'support')}><option value="manual">Manuale</option><option value="support">Istruzioni e assistenza</option></select></label>
          <div><button className={cx(ui.btn, ui.primary)} type="submit" disabled={disabled}>Salva collegamento</button></div>
        </form>
      </details>
      <div className={pages.formActions}>
        <button type="button" className={ui.btn} disabled={disabled} onClick={() => { setEditing(false); resetCandidate(); }}>Annulla</button>
        {manual && <button type="button" className={ui.btn} disabled={disabled} onClick={() => void save({ mode: 'remove' })}>Rimuovi collegamento</button>}
      </div>
    </div>}
    {error && <Banner tone="error" role="alert"><p>{error}</p></Banner>}
    {uncertain && <Banner tone="warning"><p>Il salvataggio potrebbe essere riuscito. Verifica l’esito prima di fare altre modifiche.</p><button type="button" className={ui.btn} disabled={busy} onClick={() => void save()}>Verifica salvataggio</button></Banner>}
  </section>;
}
