import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentCollectionFilters, type CollectionFilter } from './DocumentCollectionFilters';
import type { ConfirmBatchOutcome, OrganizeBatchPayload } from './model';
import { CONTEXT, batchOf, corpus, diagramCandidates, mixedBatch } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';
import { withServer } from './testing/server';

type User = ReturnType<typeof userEvent.setup>;
const dialog = () => screen.getByRole('dialog');
const open = (user: User, action: string, filename: string) => user.click(screen.getByRole('button', { name: new RegExp(`^${action} ${filename.replace('.', '\\.')}`) }));
const confirmIn = (user: User) => user.click(within(dialog()).getByRole('button', { name: 'Conferma e organizza' }));
const organized = (fn: unknown) => vi.mocked(fn as (p: OrganizeBatchPayload) => Promise<unknown>).mock.calls.map(c => c[0]);

describe('V2 · revisione individuale con Conferma e organizza', () => {
  it('APE: un solo passaggio applica direttamente, a livello casa, senza oggetti o spese', async () => {
    const user = userEvent.setup();
    const s = withServer(batchOf([corpus.ape()]));
    expect(screen.getByRole('heading', { level: 1, name: 'Controlla e organizza.' })).toBeInTheDocument();
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    expect(within(dialog()).getByRole('heading', { name: 'Controlla la proposta' })).toBeInTheDocument();
    expect(within(dialog()).getByText('Energia')).toBeInTheDocument();
    await confirmIn(user);
    expect(organized(s.props.onOrganize)).toEqual([{
      batchId: 'batch-demo', expectedVersion: 1, mode: 'single',
      items: [{ itemId: 'ape', expectedVersion: 1, expectedOrganizationVersion: 0, replaceOrganization: false, selection: { action: 'organize', title: 'Attestato di prestazione energetica', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }], target: { kind: 'home' } } }],
    }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Documento organizzato in Energia.')).toBeInTheDocument();
    expect(screen.getByText('In Energia')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Hai finito questo caricamento.' })).toBeInTheDocument();
    for (const fn of [s.props.onSaveReview, s.props.onConfirm]) expect(fn).not.toHaveBeenCalled();
    expect(screen.queryByText(/Scelta pronta|riepilogo|Scelte salvate/i)).not.toBeInTheDocument();
  });

  it('CILA e agibilità: contenuti proposti preselezionati, correggibili, un solo originale', async () => {
    const user = userEvent.setup();
    const s = withServer(batchOf([corpus.building()]));
    await open(user, 'Rivedi', 'Pratica_CILA_e_agibilita.pdf');
    expect(within(dialog()).getByRole('checkbox', { name: /CILA · pagine 1–10/ })).toBeChecked();
    await user.click(within(dialog()).getByRole('checkbox', { name: /Agibilità · pagine 11–14/ }));
    expect(within(dialog()).getByText('Pratiche edilizie')).toBeInTheDocument();
    await confirmIn(user);
    expect(organized(s.props.onOrganize)[0]!.items[0]!.selection.parts).toEqual([{ kind: 'cila', pageFrom: 1, pageTo: 10 }]);
  });

  it('il tipo di una proposta con un solo contenuto si cambia con un menu, senza perdere le pagine', async () => {
    const user = userEvent.setup();
    const s = withServer(batchOf([corpus.ape()]));
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    await user.selectOptions(within(dialog()).getByRole('combobox', { name: 'Tipo di documento' }), 'energy_certificate');
    await confirmIn(user);
    expect(organized(s.props.onOrganize)[0]!.items[0]!.selection.parts).toEqual([{ kind: 'energy_certificate', pageFrom: 1, pageTo: 8 }]);
  });

  it('schema con destinazione ambigua: nessuna scheda preselezionata; la scelta porta id e versione attesa', async () => {
    const user = userEvent.setup();
    const s = withServer(batchOf([corpus.diagram(), corpus.ape()]), { candidates: { schema: diagramCandidates } });
    await open(user, 'Rivedi', 'Schema_impianto.pdf');
    expect(within(dialog()).getByRole('radio', { name: /Solo alla casa/ })).not.toBeChecked();
    await confirmIn(user);
    expect(within(dialog()).getByRole('alert')).toHaveTextContent('Scegli una scheda esistente');
    await user.click(within(dialog()).getByRole('radio', { name: /Caldaia · Locale tecnico/ }));
    await confirmIn(user);
    expect(organized(s.props.onOrganize)[0]!.items[0]!.selection.target).toEqual({ kind: 'boiler', id: 'boiler-1', expectedVersion: 5 });
  });

  it('regolamento: resta Solo io; ricevuta: si archivia soltanto, percorso dedicato solo su richiesta', async () => {
    const user = userEvent.setup();
    const onOpenReceiptFlow = vi.fn();
    const s = withServer(batchOf([corpus.rules(), corpus.receipt()]), { onOpenReceiptFlow });
    expect(screen.getByText('Archivi soltanto la ricevuta: non viene creata una spesa.')).toBeInTheDocument();
    await open(user, 'Rivedi', 'Regolamento_condominio.pdf');
    expect(within(dialog()).getByText(/Solo io · Classificare non condivide/)).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Chiudi' }));
    await open(user, 'Rivedi', 'Ricevuta_macchina_caffe.pdf');
    expect(within(dialog()).getByText(/Già collegata a Macchina del caffè · Cucina e alla spesa/)).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Apri nella ricevuta assistita' }));
    expect(onOpenReceiptFlow).toHaveBeenCalledWith('ricevuta');
    expect(s.props.onOrganize).not.toHaveBeenCalled();
  });

  it('scansione senza testo: tipo da indicare, nessun tipo preselezionato («Altro» non è un default), nessuna fonte', async () => {
    const user = userEvent.setup();
    const s = withServer(batchOf([corpus.scan()]));
    expect(screen.getByText('Tipo da indicare')).toBeInTheDocument();
    await open(user, 'Indica il tipo', 'Scansione_documento.pdf');
    expect(within(dialog()).getByRole('heading', { name: 'Indica il tipo di documento' })).toBeInTheDocument();
    expect((within(dialog()).getByRole('combobox', { name: 'Tipo di documento' }) as HTMLSelectElement).value).toBe('');
    await user.type(within(dialog()).getByRole('textbox', { name: 'Titolo del documento' }), 'SCIA cucina');
    await confirmIn(user);
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(/Aggiungi almeno un contenuto/);
    await user.selectOptions(within(dialog()).getByRole('combobox', { name: 'Tipo di documento' }), 'scia');
    expect(within(dialog()).getByText('Pratiche edilizie')).toBeInTheDocument();
    await confirmIn(user);
    expect(organized(s.props.onOrganize)[0]!.items[0]!.selection).toEqual({ action: 'organize', title: 'SCIA cucina', parts: [{ kind: 'scia', pageFrom: null, pageTo: null }], target: { kind: 'home' } });
    expect(screen.queryByText(/Fonte · pagina/)).not.toBeInTheDocument();
  });

  it('le decisioni vengono prima dell’anteprima: l’originale si apre su richiesta e solo allora si carica', async () => {
    const user = userEvent.setup();
    const renderPreview = vi.fn(() => <p>ANTEPRIMA</p>);
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]), renderPreview }));
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    const decision = within(dialog()).getByRole('region', { name: 'La tua scelta' });
    const summary = within(dialog()).getByText('Vedi documento e fonte');
    expect(decision.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(renderPreview).not.toHaveBeenCalled();
    await user.click(summary);
    expect(within(dialog()).getByText('ANTEPRIMA')).toBeInTheDocument();
    expect(renderPreview).toHaveBeenCalledWith('ape', 1);
  });
});

describe('V2 · rinvio, chiusura e assenza della callback diretta', () => {
  it('Decidi più avanti: persiste con onSaveReview (defer) e il documento passa in «Più tardi», riprendibile', async () => {
    const user = userEvent.setup();
    const s = withServer(batchOf([corpus.ape(), corpus.rules()]));
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    await user.click(within(dialog()).getByRole('button', { name: 'Decidi più avanti' }));
    expect(vi.mocked(s.props.onSaveReview).mock.calls[0]![0]).toEqual({ itemId: 'ape', expectedVersion: 1, expectedOrganizationVersion: 0, replaceOrganization: false, selection: { action: 'defer' } });
    expect(screen.getByText(/spostato in «Più tardi»/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Più tardi · 1' }));
    expect(screen.getByText('Da riprendere')).toBeInTheDocument();
    await open(user, 'Riprendi', 'APE_Casa.pdf');
    expect(within(dialog()).getByRole('button', { name: 'Conferma e organizza' })).toBeEnabled();
    expect(s.props.onOrganize).not.toHaveBeenCalled();
  });

  it('una scelta legacy «saved» torna da rivedere: mai completata senza applicazione', () => {
    const saved = { ...corpus.ape(), reviewState: 'saved' as const, selection: { action: 'organize' as const, title: 'APE', parts: corpus.ape().proposal!.parts, target: { kind: 'home' as const } } };
    renderIntake(intakeProps({ batch: batchOf([saved, corpus.rules()]) }));
    expect(screen.getByRole('button', { name: 'Da rivedere · 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completati · 0' })).toBeInTheDocument();
    expect(screen.queryByText(/Scelta pronta|Organizzato/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rivedi APE_Casa\.pdf/ })).toBeInTheDocument();
  });

  it('chiudere con modifiche chiede di scartarle; senza modifiche chiude subito; la bozza non resta in silenzio', async () => {
    const user = userEvent.setup();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]) }));
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    await user.click(within(dialog()).getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    const title = within(dialog()).getByRole('textbox', { name: 'Titolo del documento' });
    await user.clear(title); await user.type(title, 'APE mio');
    await user.keyboard('{Escape}');
    expect(within(dialog()).getByRole('alert')).toHaveTextContent('Hai modifiche non confermate');
    expect(within(dialog()).getByRole('button', { name: 'Scarta le modifiche' })).toHaveFocus();
    await user.click(within(dialog()).getByRole('button', { name: 'Continua a modificare' }));
    expect(within(dialog()).getByRole('textbox', { name: 'Titolo del documento' })).toHaveValue('APE mio');
    await user.click(within(dialog()).getByRole('button', { name: 'Chiudi' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Scarta le modifiche' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    expect(within(dialog()).getByRole('textbox', { name: 'Titolo del documento' })).toHaveValue('Attestato di prestazione energetica');
  });

  it('callback diretta assente: azione disabilitata con il motivo, nessun percorso V1 né successo simulato', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: mixedBatch(), onOrganize: undefined, onRecoverOrganization: undefined });
    renderIntake(props);
    expect(screen.getAllByText(/La conferma diretta non è ancora disponibile/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('checkbox', { name: /^Seleziona/ })).not.toBeInTheDocument();
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    expect(within(dialog()).getByRole('button', { name: 'Conferma e organizza' })).toBeDisabled();
    expect(within(dialog()).getByRole('button', { name: 'Decidi più avanti' })).toBeEnabled();
    for (const fn of [props.onConfirm, props.onSaveReview]) expect(fn).not.toHaveBeenCalled();
  });
});

describe('V2 · errori, contesto, privacy e tastiera', () => {
  it('rifiuto del singolo: resta nel dialogo con la scelta, nessun esito di successo', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn(async (p: OrganizeBatchPayload) => ({ status: 'done' as const, results: [{ itemId: p.items[0]!.itemId, status: 'rejected' as const, message: 'La versione è cambiata: rileggi il documento.' }] }));
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]), onOrganize }));
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    await confirmIn(user);
    expect(within(dialog()).getByRole('alert')).toHaveTextContent('Non applicato: La versione è cambiata');
    expect(screen.queryByText(/Documento organizzato/)).not.toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Conferma e organizza' })).toBeEnabled();
  });

  it('upload fallito: si riprova solo quel file; l’errore degli altri non blocca nulla', async () => {
    const user = userEvent.setup();
    const failed = { ...corpus.rules(), uploadState: 'failed' as const, analysisState: 'not_started' as const, error: { code: 'storage_unavailable', message: 'Caricamento interrotto.' } };
    const props = intakeProps({ batch: batchOf([corpus.ape(), failed]), onRetryUpload: vi.fn(async () => ({ status: 'uncertain' as const })) });
    renderIntake(props);
    await user.click(screen.getByRole('button', { name: 'Riprova questo file' }));
    expect(props.onRetryUpload).toHaveBeenCalledWith('condominio');
    expect(await screen.findByText(/Esito non noto: ricarica la pagina/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rivedi APE_Casa\.pdf/ })).toBeEnabled();
  });

  it('cambio di account con risposta tardiva: nessuna bozza, selezione o esito passa al nuovo contesto', async () => {
    const user = userEvent.setup();
    let late!: (o: { status: 'done'; results: Array<{ itemId: string; status: 'confirmed' }> }) => void;
    const props = intakeProps({ batch: batchOf([corpus.ape(), corpus.rules()]), onOrganize: vi.fn(() => new Promise<ConfirmBatchOutcome>(r => { late = r; })) });
    const view = renderIntake(props);
    await user.click(screen.getByRole('checkbox', { name: 'Seleziona Regolamento del condominio' }));
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    const title = within(dialog()).getByRole('textbox', { name: 'Titolo del documento' });
    await user.clear(title); await user.type(title, 'Titolo privato A');
    await confirmIn(user);
    view.rerenderWith({ ...props, contextKey: { ...CONTEXT, accountId: 'acc-B' }, batch: batchOf([corpus.ape(), corpus.rules()]) });
    late({ status: 'done', results: [{ itemId: 'ape', status: 'confirmed' }] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body).not.toHaveTextContent(/Titolo privato A|Documento organizzato/);
    expect(screen.getByRole('checkbox', { name: 'Seleziona Regolamento del condominio' })).not.toBeChecked();
  });

  it('fonte revocata: titolo, estratti e scelta in cache spariscono; dialogo chiuso; non selezionabile', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([corpus.ape(), corpus.rules()]) });
    const view = renderIntake(props);
    await open(user, 'Rivedi', 'APE_Casa.pdf');
    const revoked = { ...corpus.ape(), documentLink: { state: 'unavailable' as const, document: null } };
    view.rerenderWith({ ...props, batch: batchOf([revoked, corpus.rules()]) });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Attestato di prestazione|APE_Casa|CLASSE ENERGETICA/i);
    expect(screen.getByText('Non più disponibile')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Seleziona Documento non disponibile/ })).not.toBeInTheDocument();
  });

  it('tastiera: focus su Chiudi, Tab confinato fra Chiudi e la conferma, Esc chiude e restituisce il focus', async () => {
    const user = userEvent.setup();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]) }));
    const trigger = screen.getByRole('button', { name: /^Rivedi APE_Casa\.pdf/ });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(within(dialog()).getByRole('button', { name: 'Chiudi' })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(within(dialog()).getByRole('button', { name: 'Conferma e organizza' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(within(dialog()).getByRole('button', { name: 'Chiudi' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('sola lettura e capacità disattivata: stati espliciti, nessun fallback', () => {
    const { unmount } = renderIntake(intakeProps({ batch: null, capabilities: { enabled: false, limits: mixedBatch().limits } }));
    expect(screen.getByText(/non è disponibile su questo servizio/)).toBeInTheDocument();
    expect(screen.queryByLabelText('File')).not.toBeInTheDocument();
    unmount();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape(), corpus.rules()], { permissions: { upload: false, review: false, confirm: false } }) }));
    expect(screen.getByText(/puoi consultare i documenti caricati, ma non organizzarli/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('DocumentCollectionFilters', () => {
  it('controllato a props; Tutti e Da organizzare presenti; conteggi solo se dichiarati esatti', async () => {
    const user = userEvent.setup();
    function Host(p: { exact: boolean }) {
      const [current, setCurrent] = useState<CollectionFilter>('all');
      return <><DocumentCollectionFilters current={current} onChange={setCurrent} counts={{ all: 9, energy: 2 }} countsExact={p.exact} /><output>{current}</output></>;
    }
    const { rerender } = render(<Host exact={false} />);
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Da organizzare' }));
    expect(screen.getByRole('status')).toHaveTextContent('unclassified');
    expect(screen.queryByText(/· 2/)).not.toBeInTheDocument();
    rerender(<Host exact />);
    expect(screen.getByRole('button', { name: 'Energia · 2' })).toBeInTheDocument();
  });
});


describe('ingresso oggetti dal caricamento', () => {
 it('foto senza testo: offre riconoscimento senza imporre una classificazione manuale', async () => {
  const user=userEvent.setup(), onOpenReceiptFlow=vi.fn();
  const photo={...corpus.scan(),filename:'Etichetta.jpg',mimeType:'image/jpeg'};
  const s=withServer(batchOf([photo]),{onOpenReceiptFlow});
  await user.click(screen.getByRole('button',{name:'Riconosci gli oggetti in Etichetta.jpg'}));
  expect(onOpenReceiptFlow).toHaveBeenCalledWith(photo.id);
  expect(s.props.onOrganize).not.toHaveBeenCalled();
 });
 it('APE non propone oggetti e non forza il percorso dedicato', () => {
  withServer(batchOf([corpus.ape()]),{onOpenReceiptFlow:vi.fn()});
  expect(screen.queryByRole('button',{name:/Riconosci gli oggetti/})).not.toBeInTheDocument();
 });
});


it('inline object proposals do not organize copies, change privacy or render inaccessible sources',()=>{
 const receipt=corpus.receipt(),renderObjectProposals=vi.fn(()=> <p>Proposte oggetti inline</p>);
 const {rerender}=renderIntake(intakeProps({batch:batchOf([receipt]),objectProposalItemId:receipt.id,renderObjectProposals}));
 expect(screen.getByText('Proposte oggetti inline')).toBeInTheDocument();
 rerender(<></>);
 renderIntake(intakeProps({batch:batchOf([{...receipt,documentLink:{state:'unavailable',document:null}}]),objectProposalItemId:receipt.id,renderObjectProposals}));
 expect(screen.queryByText('Proposte oggetti inline')).not.toBeInTheDocument();
});

it('a scanned floor plan uses house document review, not the article editor or AI product compilation',async()=>{
 const item={...corpus.scan(),filename:'Planimetria.pdf',documentLink:{state:'linked' as const,document:{id:'plan',name:'Planimetria.pdf'}}};
 const renderObjects=vi.fn(()=> <p>Editor oggetti</p>),renderActions=vi.fn(()=> <p>Azioni AI oggetti</p>);
 const props=intakeProps({batch:batchOf([item]),objectProposalItemId:item.id,renderObjectProposals:renderObjects,renderCompilationActions:renderActions});
 renderIntake(props);const user=userEvent.setup();
 expect(renderObjects).not.toHaveBeenCalled();expect(renderActions).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Rivedi documento della casa'}));
 expect(within(dialog()).getByRole('radio',{name:/Solo alla casa/})).toBeChecked();
 expect(within(dialog()).queryByRole('button',{name:/scheda esistente/})).not.toBeInTheDocument();
 await confirmIn(user);
 expect(organized(props.onOrganize)[0]!.items[0]!.selection).toMatchObject({title:'Planimetria',parts:[{kind:'floor_plan',pageFrom:null,pageTo:null}],target:{kind:'home'}});
});

it('unknown scan offers per-document compilation without a competing classify-only button',()=>{
 const item={...corpus.scan(),filename:'Acquisto.pdf',documentLink:{state:'linked' as const,document:{id:'coffee',name:'Acquisto.pdf'}}};
 renderIntake(intakeProps({batch:batchOf([item]),renderCompilationActions:()=> <><button>Compila manualmente</button><button>Compila tramite AI</button></>}));
 expect(screen.getByRole('button',{name:'Compila manualmente'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Compila tramite AI'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Indica il tipo/})).not.toBeInTheDocument();
 expect(screen.getByText('La lettura locale non trova testo utilizzabile. Puoi compilare manualmente o tramite AI.')).toBeInTheDocument();
});
it('removal of a stored document needs explicit confirmation and exposes a refused removal',async()=>{
 const user=userEvent.setup(),item={...corpus.ape(),canRemove:true},onRemoveItem=vi.fn(async()=>({status:'rejected' as const,code:'conflict' as const,message:'Analisi già avviata.'}));renderIntake(intakeProps({batch:batchOf([item]),onRemoveItem}));
 await user.click(screen.getByRole('button',{name:'Rimuovi '+item.filename}));expect(onRemoveItem).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Mantieni'}));expect(onRemoveItem).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Rimuovi '+item.filename}));await user.click(screen.getByRole('button',{name:'Conferma rimozione'}));await waitFor(()=>expect(onRemoveItem).toHaveBeenCalledWith(item.id));expect(await screen.findByText('Analisi già avviata.')).toBeVisible();
});
