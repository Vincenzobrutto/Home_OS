/**
 * HARNESS DIMOSTRATIVO — lotto sintetico del mockup e container finto in memoria. Non è una prova di upload,
 * API, AI o DB e non è importato dall'app. Serve solo a verificare layout, dialoghi e focus nel browser.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/tokens.css';
import '../../styles/global.css';
import { DocumentIntakeAssistant } from '../DocumentIntakeAssistant';
import type { CandidatePage, ConfirmBatchOutcome, IntakeBatch, IntakeItem, OrganizeBatchPayload, WriteOutcome } from '../model';
import { CONTEXT, LIMITS, batchOf, copyOfOrganized, corpus, diagramCandidates, lostCopyStaleCache, mixedBatch, multiPartScan, pendingManifest } from '../testing/fixtures';

const LONG = 'Relazione_tecnica_impianto_termico_centralizzato_con_contabilizzazione_del_calore_e_valvole_termostatiche_2026_versione_definitiva.pdf';
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function initial(name: string): IntakeBatch | null {
  if (name === 'empty') return null;
  if (name === 'long') return batchOf([{ ...corpus.diagram(), id: 'lungo', filename: LONG, proposal: { ...corpus.diagram().proposal!, title: 'Relazione tecnica dell’impianto termico centralizzato con contabilizzazione del calore' } }, ...mixedBatch().items]);
  if (name === 'failed') return batchOf([corpus.ape(), { ...corpus.rules(), uploadState: 'failed', analysisState: 'not_started', error: { code: 'x', message: 'Caricamento interrotto: riprova questo file.' } }, { ...corpus.scan(), uploadState: 'uploading', analysisState: 'not_started' }]);
  if (name === 'v2') return batchOf([
    corpus.ape(), corpus.building(), corpus.rules(), corpus.receipt(), corpus.scan(), copyOfOrganized(),
    { ...corpus.diagram(), id: 'conflitto', filename: 'Visura_agibilita.pdf', analysisState: 'ready', organizationVersion: 1,
      proposal: { title: 'Visura agibilità', parts: [{ kind: 'agibility_record', pageFrom: null, pageTo: null }], sources: [{ page: 1, excerpt: 'VISURA AGIBILITÀ\nNON COSTITUISCE CERTIFICAZIONE' }] },
      confirmedOrganization: { title: 'Documento pratica casa', parts: [{ kind: 'other', pageFrom: null, pageTo: null }] } },
  ]);
  if (name === 'b4') return batchOf([
    { ...corpus.ape(), organizationVersion: 3, confirmedOrganization: { title: 'APE appartamento', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }] } },
    copyOfOrganized(), multiPartScan(), { ...lostCopyStaleCache(), id: 'persa' }, pendingManifest(),
  ]);
  return mixedBatch();
}

function Demo() {
  const [name, setName] = useState('v2');
  const [batch, setBatch] = useState<IntakeBatch | null>(initial('v2'));
  const [candidates, setCandidates] = useState<Record<string, CandidatePage>>({});
  const [run, setRun] = useState(0);
  const update = (id: string, patch: Partial<IntakeItem>) => setBatch(b => b && { ...b, version: Number(b.version) + 1, items: b.items.map(i => i.id === id ? { ...i, version: Number(i.version) + 1, ...patch } : i) });
  return (
    <>
      <div style={{ background: '#fff4dc', color: '#63450f', padding: '8px 16px', fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>HARNESS DEMO · dati sintetici, nessun upload, API o AI</strong>
        <label>Scenario{' '}
          <select style={{ maxWidth: "100%" }} value={name} onChange={(e) => { setName(e.target.value); setBatch(initial(e.target.value)); setCandidates({}); setRun(r => r + 1); }}>
            <option value="v2">V2: proposte, copia e conflitto</option>
            <option value="mixed">Lotto misto del mockup</option>
            <option value="long">Nomi lunghi</option>
            <option value="failed">Caricamento non riuscito</option>
            <option value="empty">Ingresso</option>
            <option value="b4">Rifinitura B4</option>
          </select>
        </label>
      </div>
      <main style={{ padding: '24px 16px', maxWidth: 1180, margin: '0 auto' }}>
        <DocumentIntakeAssistant
          contextKey={{ ...CONTEXT, batchId: `${CONTEXT.batchId}-${run}` }}
          load={{ status: 'ready' }}
          capabilities={{ enabled: true, limits: LIMITS }}
          batch={batch} canEdit homeName="Casa esempio" candidates={candidates}
          loadCandidates={(id) => setCandidates(c => ({ ...c, [id]: diagramCandidates }))}
          onSelectFiles={() => setBatch(mixedBatch())}
          onRetryUpload={async (id): Promise<WriteOutcome> => { await wait(200); update(id, { uploadState: 'stored', analysisState: 'ready', error: null }); return { status: 'confirmed' }; }}
          onCancelUpload={async (): Promise<WriteOutcome> => ({ status: 'rejected', code: 'unavailable', message: 'Nella demo non si annulla.' })}
          onSaveReview={async (p): Promise<WriteOutcome> => { await wait(150); update(p.itemId, { selection: p.selection, reviewState: p.selection.action === 'defer' ? 'deferred' : 'saved' }); return { status: 'confirmed' }; }}
          onRecoverReview={async () => ({ status: 'not_found' })}
          onResolveDuplicate={async (id): Promise<WriteOutcome> => { update(id, { reviewState: 'confirmed' }); return { status: 'confirmed' }; }}
          onConfirm={async (p): Promise<ConfirmBatchOutcome> => { await wait(250); p.items.forEach(i => update(i.id, { reviewState: 'confirmed' })); return { status: 'done', results: p.items.map(i => ({ itemId: i.id, status: 'confirmed' })) }; }}
          onRecoverConfirmation={async () => ({ status: 'not_found' })}
          onOrganize={async (p: OrganizeBatchPayload): Promise<ConfirmBatchOutcome> => { await wait(250); p.items.forEach(i => update(i.itemId, { reviewState: 'confirmed', selection: i.selection, confirmedOrganization: { title: i.selection.title, parts: i.selection.parts } })); return { status: 'done', results: p.items.map(i => ({ itemId: i.itemId, status: 'confirmed' })) }; }}
          onRecoverOrganization={async () => ({ status: 'not_found' })}
          renderOutcomeLinks={() => <a href="#documenti">Vai ai Documenti</a>}
          openOriginal={async () => { await wait(150); }}
          renderPreview={(id, page) => <p style={{ fontFamily: 'ui-monospace, monospace', background: '#fffef9', border: '1px solid #e3dfd1', padding: 12, margin: '0 0 8px', overflowWrap: 'anywhere' }}>DOCUMENTO SINTETICO · {id} · {page ? `pagina ${page}` : 'prima pagina'} · NON VALIDO</p>}
          onOpenReceiptFlow={() => {}}
        />
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
