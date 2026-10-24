import { useContext, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Link } from 'react-router';
import { DocumentEditorContext } from '../documents/DocumentEditorContext';
import { ui } from '../components/ui';
import { UnifiedReview } from './UnifiedReview';
import { InvoiceCoverageNotice } from './InvoiceCoverageNotice';
import { ItemEditor } from './ItemEditor';
import { SaveSummary } from './SaveSummary';
import { reviewIssues, reviewProblem, reviewTotals } from './reviewSummary';
import { compilationSteps, issueStep, resolveCompilationStep } from './compilationFlow';
import { CompilationStepper } from './CompilationStepper';
import { CompilationContent } from './CompilationContent';
import { initialContact } from './ContactProposals';
import styles from './compilationSteps.module.css';

type Props = ComponentProps<typeof UnifiedReview> & { expenseProblem?: string; contactProblem?: string };

/** Presentation only. DraftEditor still owns all values and the confirmation/recovery protocol. */
export function CompilationSteps(props: Props) {
  const { draft, forms, documentOnly = false, disabled } = props;
  const editor = useContext(DocumentEditorContext);
  const [navigation, setNavigation] = useState({ current: 'documento', visited: new Set(['documento']) });
  const steps = compilationSteps(draft, forms, documentOnly);
  const current = resolveCompilationStep(steps, navigation.current);
  const index = steps.findIndex(step => step.key === current);
  const firstUnvisited = steps.findIndex(step => !navigation.visited.has(step.key));
  const reachable = new Set(steps.filter((step, i) => navigation.visited.has(step.key) && (firstUnvisited < 0 || i < firstUnvisited)).map(step => step.key));
  const heading = useRef<HTMLHeadingElement>(null);
  const saveError = useRef<HTMLDivElement>(null);
  const [attempted, setAttempted] = useState(false);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [current]);
  useEffect(() => { if (props.draftSaveFailure) saveError.current?.focus({ preventScroll: true }); }, [props.draftSaveFailure]);
  function go(key: string) {
    setAttempted(false);
    setNavigation(old => ({ current: key, visited: new Set([...old.visited, key]) }));
  }
  const issues = documentOnly ? [] : reviewIssues(draft, forms);
  const manualCents = /^\d+(?:[.,]\d{1,2})?$/.test(props.manualTotal ?? '') ? Math.round(Number(props.manualTotal!.replace(',', '.')) * 100) : 0;
  const effectiveDraft = !draft.purchaseTotal && manualCents > 0 ? { ...draft, purchaseTotal: { amountCents: manualCents } } : draft;
  const totals = reviewTotals(documentOnly ? { ...draft, items: [] } : draft, forms);
  const manualProblem = !documentOnly && draft.mode === 'manual' && draft.items.length > 1 && totals.newExpenses > 0 && !manualCents ? 'Indica il totale della fattura per controllare le quote degli articoli.' : null;
  const problem = (documentOnly && draft.invoiceCoverage?.pendingPages.length ? 'Restano pagine della fattura da controllare: conserva la bozza per riprendere la revisione.' : null)
    ?? props.documentProblem ?? (documentOnly ? null : props.houseProblem ?? reviewProblem(effectiveDraft, forms))
    ?? manualProblem;
  if (!documentOnly && props.houseTotals) { totals.newExpenses += props.houseTotals.newExpenses; totals.amountCents += props.houseTotals.amountCents; }
  const currentIssues = issues.filter(issue => issueStep(issue) === current);
  const stepProblem = current === 'documento' ? props.documentProblem
    : current === 'spese' ? props.expenseProblem ?? (issues.length ? null : reviewProblem(effectiveDraft, forms)) ?? manualProblem
    : current === 'contatti' ? props.contactProblem : null;
  const last = current === 'riepilogo';
  const blocked = !!(currentIssues.length || stepProblem || last && problem);
  const items = draft.items.filter(item => !item.decision || item.decision.state === 'deferred');
  const technical = ['conformity_declaration', 'house_document'].includes(draft.documentKind);
  const euro = (cents: number) => (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  // Panels stay mounted once visited. Local search inputs and expense decisions must survive Back.
  const mounted = (key: string) => current === key || navigation.visited.has(key);
  const panelProps = (key: string) => ({ hidden: current !== key, inert: current !== key, className: styles.panel });
  const step = steps[index]!, next = steps[index + 1];
  // One card per step: the heading keeps the step title (keyboard and tests), the question carries the decision.
  return <section className={styles.stack} aria-label="Compilazione del documento a schede">
    {props.saveDraft && !props.draftSaveFailure && <div className={styles.toolbar}><button type="button" className={ui.btn} disabled={disabled} onClick={props.saveDraft}>Salva bozza ed esci</button></div>}
    <CompilationStepper steps={steps} current={current} reached={reachable} change={go} />
    <div className={styles.card}>
    <header className={styles.cardHead}>
      <div className={styles.cardTop}>
        <h2 className={styles.heading} ref={heading} tabIndex={-1}>{step.title}</h2>
        {editor ? <button type="button" className={`${ui.btn} ${styles.originalLink}`} onClick={editor.showOriginal}>Vedi documento originale</button>
          : <Link className={styles.originalLink} target="_blank" rel="noopener noreferrer" to={props.root + '/documenti/' + encodeURIComponent(draft.snapshot!.documentId) + '#doc-anteprima'}>Vedi documento originale ↗</Link>}
      </div>
      <p className={styles.question}>{step.question}</p>
      {step.hint && <p className={styles.hint}>{step.hint}</p>}
    </header>
    <InvoiceCoverageNotice draft={draft} root={props.root} />
    <div {...panelProps('documento')}>
      <div className={styles.stack}>{props.documentFields}{props.documentReference}</div>
      {props.changeDocumentOnly && <div className={styles.option}><label><input type="checkbox" checked={documentOnly} disabled={disabled} aria-describedby={draft.id + '-document-only-hint'} onChange={e => props.changeDocumentOnly?.(e.target.checked)} />Conserva solo il documento</label><p id={draft.id + '-document-only-hint'} className={styles.optionHint}>Nessun oggetto, spesa o contatto: dopo questa scheda c’è il riepilogo.</p></div>}
      {documentOnly && <p>Salvi il documento senza registrare spese, oggetti o contatti.</p>}
      {props.copyChoice && <div className={styles.option}><label><input type="checkbox" checked={props.copyChoice.checked} disabled={disabled} onChange={e => props.copyChoice?.change(e.target.checked)} />Usa il documento già presente senza modificarlo</label></div>}
    </div>
    {mounted('contenuto') && <div {...panelProps('contenuto')}><CompilationContent draft={draft} forms={forms} disabled={disabled} change={props.change} add={props.add} /></div>}
    {items.map(item => mounted('articolo:' + item.id) && <div key={item.id} {...panelProps('articolo:' + item.id)}>
      <ItemEditor part="object" api={props.api} accountId={props.accountId} base={props.base} draft={draft} item={item} form={forms[item.id]!} disabled={disabled} change={value => props.change(item.id, value)} enrich={body => props.enrich(item.id, body)} />
    </div>)}
    {mounted('spese') && <div {...panelProps('spese')}>
      {draft.purchaseTotal && <p>Totale documento: {euro(draft.purchaseTotal.amountCents)}</p>}
      {!technical && props.houseFields}
      {!technical && !draft.houseExpenses?.length && items.map((item, itemIndex) => <section key={item.id} hidden={['skip', 'document_only'].includes(forms[item.id]!.action)} inert={['skip', 'document_only'].includes(forms[item.id]!.action)}><h3>{forms[item.id]?.name || 'Articolo ' + (itemIndex + 1)}</h3>
        <p>{forms[item.id]!.action === 'link' ? 'Collegata a ' + forms[item.id]!.targets.map(target => target.name).join(', ') : 'Collegata al nuovo oggetto'}</p>
        <ItemEditor part="expense" api={props.api} accountId={props.accountId} base={props.base} draft={draft} item={item} form={forms[item.id]!} disabled={disabled} change={value => props.change(item.id, value)} enrich={body => props.enrich(item.id, body)} />
      </section>)}
      {draft.mode === 'manual' && draft.items.length > 1 && !draft.houseExpenses?.length && !draft.purchaseTotal && <label>Totale della fattura (€), inserito da te<input className={ui.input} inputMode="decimal" value={props.manualTotal ?? ''} disabled={disabled} onChange={e => props.changeManualTotal?.(e.target.value)} /></label>}
    </div>}
    {mounted('contatti') && <div {...panelProps('contatti')}>{props.contactFields}</div>}
    {last && <section className={styles.summary} aria-label="Riepilogo prima di salvare">
      <SaveSummary draft={draft} forms={forms} documentOnly={documentOnly} title={props.summaryTitle} houseForms={props.houseForms} contacts={(draft.contacts ?? []).filter(contact => !contact.decision).map(contact => props.summaryContacts?.find(input => input.proposalId === contact.id) ?? initialContact(contact))} documentTargetLabel={props.documentTargetLabel} edit={{ go, steps: new Set(steps.filter(s => s.key !== 'riepilogo').map(s => s.key)) }} />
      {!documentOnly && draft.purchaseTotal && <p>Totale documento: {euro(draft.purchaseTotal.amountCents)}</p>}
      {!!totals.excludedCents && <p>Importi esclusi: {euro(totals.excludedCents)}</p>}
      {!!totals.excludedUnknown && <p>{totals.excludedUnknown} articoli esclusi con importo non disponibile.</p>}
      {problem && <div role="alert" className={styles.problems}><p>{problem}</p><ul>
        {props.documentProblem && <li><button type="button" onClick={() => go('documento')}>{props.documentProblem}</button></li>}
        {issues.map((issue, i) => <li key={i}><button type="button" onClick={() => go(issueStep(issue))}>{issue.message}</button></li>)}
        {props.houseProblem && <li><button type="button" onClick={() => go(props.expenseProblem ? 'spese' : 'contatti')}>{props.houseProblem}</button></li>}
        {!issues.length && !props.documentProblem && !props.houseProblem && <li><button type="button" onClick={() => go(technical ? 'contenuto' : 'spese')}>Controlla i dati</button></li>}
      </ul></div>}
    </section>}
    {attempted && blocked && !last && <div role="alert" className={styles.problems}>{stepProblem}{currentIssues.map(issue => <p key={issue.message}>{issue.message}</p>)}</div>}
    <div className={styles.footer} data-editor-save={editor ? 'true' : undefined} data-draft-save-failure={editor && props.draftSaveFailure ? 'true' : undefined}>
      {props.draftSaveFailure ? <>
        <div ref={saveError} role="alert" tabIndex={-1} aria-label="Salvataggio bozza"><strong>{props.draftSaveFailure.uncertain ? 'Salvataggio da verificare' : 'Bozza non salvata'}</strong><p>{props.draftSaveFailure.message}</p></div>
        <button type="button" className={ui.btn} disabled={props.busy} onClick={props.draftSaveFailure.uncertain ? props.retryDraftSave : props.saveDraft}>Riprova salvataggio</button>
      </> : <>
      {index > 0 ? <button type="button" className={`${ui.btn} ${styles.back}`} onClick={() => go(steps[index - 1]!.key)}>Indietro</button> : <span className={styles.back} />}
      <div className={styles.forward}>
        <p role="status" aria-live="polite" className={styles.position}>Passaggio {index + 1} di {steps.length}</p>
        {last ? <button type="button" className={`${ui.btn} ${ui.primary}`} disabled={disabled || !!problem || (!documentOnly && !items.length && !draft.documentInfo && !draft.houseExpenses?.length)} onClick={props.save}>{documentOnly ? 'Salva documento' : 'Salva e continua'}</button>
          : <button type="button" className={`${ui.btn} ${ui.primary}`} disabled={disabled} onClick={() => { if (blocked) setAttempted(true); else go(next!.key); }}>Avanti{next && <span className={styles.nextHint} aria-hidden="true">· {next.title}</span>}</button>}
      </div>
      </>}
    </div>
    </div>
  </section>;
}
