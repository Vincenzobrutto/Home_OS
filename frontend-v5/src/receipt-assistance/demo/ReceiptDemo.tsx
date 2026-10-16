/**
 * HARNESS DIMOSTRATIVO — dati sintetici, callback simulate in memoria. Non è una prova client/API reale
 * e non è importato dall'app. Serve solo a verificare layout, focus e dialoghi nel browser.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/tokens.css';
import '../../styles/global.css';
import { ReceiptAssistant, type ReceiptAssistantProps } from '../ReceiptAssistant';
import type { ConfirmOutcome, ReceiptDraft } from '../model';
import { CONTEXT, TODAY, kitchen, scenarios } from '../testing/fixtures';

const LONG = 'Macchina del caffè automatica con macinacaffè integrato e lancia vapore per cappuccino, modello da incasso';
type Name = keyof typeof scenarios | 'long' | 'unreadable';
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function build(name: Name, attempt: number): Pick<ReceiptAssistantProps, 'draft' | 'job' | 'objectCandidates' | 'expenseCandidates'> {
  if (name === 'unreadable') return { draft: null, job: { status: 'failed', reason: 'read_failed', message: 'Il PDF non contiene testo leggibile.' }, objectCandidates: { items: [], hasMore: false, status: 'idle' }, expenseCandidates: { items: [], hasMore: false, status: 'idle' } };
  const base = name === 'long' ? scenarios.ambiguous() : scenarios[name]();
  let draft: ReceiptDraft = base.draft;
  let objects = base.objectCandidates;
  if (name === 'long') {
    draft = { ...draft, proposals: { ...draft.proposals, name: { value: LONG.slice(0, 120), sources: [{ page: 1, excerpt: LONG }] }, supplier: { value: 'Emporio Casa Demo — Grandi Elettrodomestici e Accessori per la Cucina Srl', sources: [{ page: 1, excerpt: 'Emporio Casa Demo — Grandi Elettrodomestici e Accessori per la Cucina Srl' }] } } };
    objects = [kitchen({ name: LONG, roomName: 'Cucina al piano terra con affaccio sul giardino', reasons: ['same_brand_model'] }), ...objects.slice(1)];
  }
  return { draft: { ...draft, id: `${draft.id}-${attempt}` }, job: { status: 'none' }, objectCandidates: { items: objects, hasMore: name === 'long', status: 'idle' }, expenseCandidates: { items: base.expenseCandidates, hasMore: false, status: 'idle' } };
}

function Demo() {
  const [name, setName] = useState<Name>('existing');
  const [attempt, setAttempt] = useState(0);
  const [canEdit, setCanEdit] = useState(true);
  const [manual, setManual] = useState<ReceiptDraft | null>(null);
  const data = build(name, attempt);
  const props: ReceiptAssistantProps = {
    contextKey: { ...CONTEXT, draftId: manual?.id ?? data.draft?.id ?? null },
    load: { status: 'ready' },
    capabilities: { enabled: true, manualEnabled: true, providers: [{ id: 'demo', label: 'Servizio di analisi (demo)', requiresConsent: true, consentText: 'DEMO: nessun file viene letto o inviato.', costNote: null }] },
    original: { status: 'available', name: 'Ricevuta macchina del caffè (facsimile sintetico).pdf', pageCount: 1 },
    ...data,
    draft: manual ?? data.draft,
    today: TODAY,
    canEdit,
    onStartAnalysis: () => {},
    onStartManual: () => setManual({ ...scenarios.manual().draft, id: `manual-${attempt}` }),
    openOriginal: async () => { await wait(200); },
    renderOriginalPreview: () => <p style={{ fontFamily: 'ui-monospace, monospace', background: '#fffef9', border: '1px solid #e3dfd1', padding: 12, overflowWrap: 'anywhere' }}>FACSIMILE · Emporio Casa Demo · 15 settembre 2026 · Macchina del caffè Lume Mini 90 · TOTALE EUR 179,90</p>,
    loadMoreCandidates: () => {},
    onConfirm: async (): Promise<ConfirmOutcome> => { await wait(300); return { status: 'confirmed', result: { newObjects: 0, newExpenses: 0, object: null, expense: null, openComparisons: 0 } }; },
    onRecoverOutcome: async () => ({ status: 'not_found' }),
    onPark: async () => ({ status: 'parked' }),
  };
  const reset = (n: Name) => { setName(n); setManual(null); setAttempt(a => a + 1); };
  return (
    <>
      <div style={{ background: '#fff4dc', color: '#63450f', padding: '8px 16px', fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>HARNESS DEMO · dati sintetici, nessuna API</strong>
        <label>Scenario{' '}
          <select value={name} onChange={(e) => reset(e.target.value as Name)}>
            <option value="existing">Oggetto e spesa già presenti</option>
            <option value="fresh">Primo acquisto</option>
            <option value="ambiguous">Due oggetti compatibili</option>
            <option value="conflict">Valori diversi da quelli confermati</option>
            <option value="unreadable">Documento non leggibile</option>
            <option value="long">Contenuti lunghi</option>
          </select>
        </label>
        <label><input type="checkbox" checked={!canEdit} onChange={(e) => setCanEdit(!e.target.checked)} /> Sola lettura</label>
      </div>
      <main style={{ padding: '24px 16px', maxWidth: 1180, margin: '0 auto' }}>
        <ReceiptAssistant {...props} />
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
