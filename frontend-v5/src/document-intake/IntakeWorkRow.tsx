import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { cx, ui } from '../components/ui';
import type { DocumentIntakeAssistantProps } from './DocumentIntakeAssistant';
import type { ReviewWriteState } from './ReviewDialog';
import { Badge, StatusBadge } from './IntakeBadges';
import { itemStatus, workGroup, hasConflict, displayName, rowTitle, selectionCollections, collectionLabel, formatBytes, partLabel, kindCollection, houseDocumentKind, supportsObjectProposals, reviewable, type IntakeItem, type OpaqueId, type OpaqueVersion, type WriteOutcome } from './model';
import styles from './intake.module.css';

type RowContext = {
 props: DocumentIntakeAssistantProps; multi:boolean; selectable:(item:IntakeItem)=>boolean;
 picked:Record<OpaqueId,OpaqueVersion>; setPicked:Dispatch<SetStateAction<Record<OpaqueId,OpaqueVersion>>>;
 writeOf:(id:OpaqueId)=>ReviewWriteState; uploadMessages:Record<OpaqueId,string>;
 canUpload:boolean;canReview:boolean;removal:string|null;setRemoval:Dispatch<SetStateAction<string|null>>;
 uploadAction:(id:OpaqueId,action:(id:OpaqueId)=>Promise<WriteOutcome>)=>Promise<void>;
 reviewDocument:(item:IntakeItem)=>void;setDialog:Dispatch<SetStateAction<{itemId:OpaqueId;onlyOriginal:boolean}|null>>;
};

/** Presentation only: the parent retains selection, recovery and authorization state. */
export function IntakeWorkRow({item,context}:{item:IntakeItem;context:RowContext}){
 const {props,multi,selectable,picked,setPicked,writeOf,uploadMessages,canUpload,canReview,removal,setRemoval,uploadAction,reviewDocument,setDialog}=context;

    const raw = itemStatus(item);
    const write = writeOf(item.id);
    const group = workGroup(item);
    const copy = item.uploadState === 'duplicate';
    const conflict = hasConflict(item);
    const decision = item.selection?.action === 'organize' ? item.selection : null;
    const manual = !copy && !item.proposal && !decision && ['stored', 'ready', 'unreadable', 'unsupported', 'analysis_failed'].includes(raw);
    const canSelect = !props.renderCompilationActions && multi && selectable(item);
    const checked = canSelect && picked[item.id] === item.version;
    const name = displayName(item);
    const title = rowTitle(item);
    let badge: ReactNode;
    if (write.status === 'uncertain' || write.status === 'recovering') badge = <Badge tone="warn">Esito non noto</Badge>;
    else if (group === 'done') badge = <Badge tone="ok">{decision ? `In ${selectionCollections(decision).map(collectionLabel).join(' e ')}` : 'Mantenuto invariato'}</Badge>;
    else if (group === 'later') badge = <Badge tone="warn">Da riprendere</Badge>;
    else if (['unavailable', 'pending', 'uploading', 'upload_failed', 'analysis_waiting', 'analysis_running'].includes(raw)) badge = <StatusBadge status={raw} />;
    else if (copy) badge = <Badge tone="warn">File già presente</Badge>;
    else if (conflict) badge = <Badge tone="warn">Dati diversi</Badge>;
    else if (manual) badge = <Badge tone="warn">Tipo da indicare</Badge>;
    else badge = <StatusBadge status={raw} />;
    const proposal = group === 'review' && !copy && !conflict && raw !== 'unavailable' ? item.proposal : null;
    const actionLabel = group === 'later' ? 'Riprendi' : manual ? 'Indica il tipo' : 'Rivedi';
    return (
      <article key={item.id} className={cx(styles.row, checked && styles.rowSelected)}>
        <span className={styles.rowCheck}>
          {canSelect && <input type="checkbox" checked={checked} aria-label={`Seleziona ${title}`}
            onChange={(e) => { const on = e.target.checked; setPicked(prev => { const next = { ...prev }; if (on) next[item.id] = item.version; else delete next[item.id]; return next; }); }} />}
        </span>
        <div className={styles.rowMain}>
          <h3>{title}</h3>
          {raw !== 'unavailable' && (
            <p>{title !== name ? `${name} · ` : ''}{item.byteSize !== null ? formatBytes(item.byteSize) : ''}{item.pageCount ? ` · ${item.pageCount} ${item.pageCount === 1 ? 'pagina' : 'pagine'}` : ''} · Solo io</p>
          )}
          <p>{badge}</p>
          {proposal && (
            <>
              <p>Tipo: <strong>{proposal.parts.map(partLabel).join(' + ')}</strong></p>
              <p>Destinazione: <strong>{[...new Set(proposal.parts.map(p => collectionLabel(kindCollection(p.kind))))].join(' + ')}</strong>{item.analysisState === 'needs_choice' ? ' · scheda da scegliere' : ' · Solo alla casa'}</p>
              {proposal.parts.some(p => p.kind === 'receipt' || p.kind === 'invoice') && <p>{props.renderObjectProposals?'':'Archivi soltanto la ricevuta: non viene creata una spesa.'}</p>}
            </>
          )}
          {group === 'done' && decision && <p>{decision.parts.map(partLabel).join(' + ')} · {decision.target.kind === 'home' ? 'solo casa' : 'scheda esistente'}</p>}
          {group === 'review' && copy && raw !== 'unavailable' && <p>{item.duplicate?.document ? `Stesso contenuto di «${item.duplicate.document.name}». ` : ''}Apri il documento per scegliere quali dati mantenere.</p>}
          {group === 'review' && conflict && !copy && <p>La proposta è diversa dai dati già confermati: apri il documento per scegliere.</p>}
          {group === 'review' && manual && raw !== 'unavailable' && <p>{props.renderCompilationActions?'La lettura locale non trova testo utilizzabile. Puoi compilare manualmente o tramite AI.':item.mimeType?.startsWith('image/') ? 'La lettura locale non interpreta la foto. Puoi indicare il tipo oppure riconoscere gli oggetti presenti.' : raw === 'unreadable' || raw === 'unsupported' ? 'Il testo non è leggibile: indica il tipo consultando l’originale.' : 'Nessuna proposta: indica il tipo consultando l’originale.'}</p>}
          {raw === 'unavailable' && <p>Il documento non è più accessibile con questo account.</p>}
          {item.error && raw === 'upload_failed' && <p role="status">{item.error.message}</p>}
          {write.status === 'rejected' && <p className={styles.formError}>Non applicato: {write.message}</p>}
          {uploadMessages[item.id] && <p role="alert">{uploadMessages[item.id]}</p>}
        </div>
        <div className={styles.rowActions}>
          {item.canRemove&&props.onRemoveItem&&canUpload&&<button type="button" className={ui.btn} disabled={props.addingFiles} aria-label={'Rimuovi '+name} onClick={()=>setRemoval(item.id)}>Rimuovi</button>}
          {removal===item.id&&<div role="group" aria-label={'Conferma rimozione '+name}><p>{copy?'Rimuovere questa copia dal caricamento? Il documento già presente sarà conservato.':'Rimuovere il documento caricato per errore? L’originale sarà eliminato e non verrà analizzato.'}</p><button type="button" className={ui.btn} onClick={()=>setRemoval(null)}>Mantieni</button><button type="button" className={ui.btn} onClick={()=>{setRemoval(null);void uploadAction(item.id,props.onRemoveItem!);}}>Conferma rimozione</button></div>}
          {raw === 'upload_failed' && canUpload && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void uploadAction(item.id, props.onRetryUpload)}>Riprova questo file</button>}
          {(raw === 'pending' || raw === 'uploading') && canUpload && <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void uploadAction(item.id, props.onCancelUpload)}>Annulla</button>}
          {canReview && item.documentLink.state==='linked' && props.renderCompilationActions && (houseDocumentKind(item)?<button type="button" className={ui.btn} onClick={()=>reviewDocument(item)}>Rivedi documento della casa</button>:props.renderCompilationActions(item.id))}
          {!props.renderCompilationActions && canReview && item.documentLink.state==='linked' && props.onOpenReceiptFlow && supportsObjectProposals(item) && !(props.renderObjectProposals&&(copy||conflict)) && <button type="button" className={cx(ui.btn,ui.small)} disabled={props.addingFiles} aria-label={props.renderObjectProposals?`Rivedi proposta per ${name}`:`Riconosci gli oggetti in ${name}`} onClick={()=>props.onOpenReceiptFlow?.(item.id)}>{props.renderObjectProposals?'Rivedi proposta':'Riconosci gli oggetti'}</button>}
          {group !== 'done' && reviewable(item) && !(props.renderCompilationActions&&manual) && !(props.renderCompilationActions&&houseDocumentKind(item)) && !(props.renderObjectProposals&&props.onOpenReceiptFlow&&supportsObjectProposals(item)&&!copy&&!conflict) && (
            <button type="button" className={cx(ui.btn, ui.small, ui.primary)} aria-label={`${actionLabel} ${name}`} onClick={() => setDialog({ itemId: item.id, onlyOriginal: false })}>{actionLabel}</button>
          )}
          {group === 'done' && raw !== 'unavailable' && (canReview && item.permissions.review && props.onReorganizeDocument
            ? <button type="button" className={cx(ui.btn, ui.small)} aria-label={`Modifica ${name}`} disabled={props.addingFiles} onClick={() => void props.onReorganizeDocument?.(item.id)}>Modifica</button>
            : <button type="button" className={cx(ui.btn, ui.small)} aria-label={`Vedi originale ${name}`} onClick={() => setDialog({ itemId: item.id, onlyOriginal: true })}>Vedi originale</button>)}
        </div>
      {canReview&&(props.renderCompilationActions||supportsObjectProposals(item))&&props.objectProposalItemId===item.id&&props.renderObjectProposals&&<section className={styles.objectProposals} aria-label={'Proposte oggetti e spesa per '+name}>{houseDocumentKind(item)?<><h3>Documento della casa</h3><p>Riguarda l’immobile: nessun oggetto o spesa da creare.</p><button type="button" className={ui.btn} onClick={()=>reviewDocument(item)}>Rivedi titolo e tipo</button></>:props.renderObjectProposals(item.id,()=>setDialog({itemId:item.id,onlyOriginal:false}))}</section>}
      </article>
    );
}
