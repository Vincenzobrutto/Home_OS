# M3 — review-v1, caso Caldaia

13 ottobre 2026. Contratto fissato da Codex per sviluppo parallelo. **Endpoint M3 non ancora implementati.** Identity-v1.1 e documents-v1 rimangono attivi e invariati. M3 si considera conclusa soltanto dopo API/PostgreSQL/job e navigazione browser reali; i mock frontend da soli non bastano.

## Scopo della verticale

Selezione di uno/due originali già caricati → avvio esplicito di analisi di test → scheda caldaia provvisoria → proposte marca/modello/potenza con fonte → conferma o correzione per campo → sole verifiche aperte in Da rivedere → valori confermati e storia persistenti.

L'upload M2 non avvia analisi. Nessuna normativa, scadenza, sicurezza impianto, diagnosi o azione esterna deriva da proposta o conferma. Confermare dati non certifica documento o impianto. Nessun matching/merge automatico fra esemplari, case o account. M3 tratta una caldaia per analisi e non promette la pipeline completa di import massivo.

## Provider di test, evidenze vere e documenti di esempio

Provider server `test_fixture_v1`, `isSimulation: true` obbligatorio in job/proposte/scheda. Mostrare **Analisi di test — nessuna AI reale** prima dell'avvio e accanto ai risultati. Nessun provider a pagamento attivato da questo contratto.

Il provider riconosce solo SHA-256 dei tre PDF in `docs/v5/fixtures/m3/manifest.json`. Pagina ed estratti sono verificati sul testo effettivo dei PDF. Documento sconosciuto → job failed `provider_fixture_unsupported`; **mai valori finti attribuiti a un originale qualsiasi**. Il nome del file, l'estensione o un token nel testo non autorizzano il riconoscimento. Il backend verifica il file/hash M2 prima dell'analisi.

| Fixture | Dati effettivi | Caso |
|---|---|---|
| A: libretto-caldaia-demo.pdf | Termica Demo, TD-24, Potenza utile al riscaldamento: 24 kW | Base |
| B: scheda-tecnica-caldaia-demo.pdf | stessa marca/modello, Potenza nominale riportata: 28 kW | A+B: interpretare due denominazioni, possibile conservazione distinta |
| C: rapporto-caldaia-demo-conflitto.pdf | stessa marca/modello, Potenza utile al riscaldamento: 28 kW | A+C: vero conflitto sulla stessa grandezza |

PDF interamente sintetici, una pagina; non sono documenti di produttori reali. Il frontend può copiarli **senza modificarne i byte** in `public/m3-examples/` e offrire download esplicitamente etichettati. Il caricamento usa sempre M2; nessun endpoint privilegiato di seeding o caricamento automatico al mount. Un file solo propone un valore per campo; due copie dello stesso PDF mantengono entrambe le provenienze, senza generare un falso conflitto.

Guasti/timeout del provider vengono iniettati nel harness backend, non tramite un flag arbitrario del client reale. Su documenti non riconosciuti resta disponibile l'originale e la compilazione manuale.

## Accessi e riservatezza M3

Tutte le risorse hanno homeId e accountId creatore. In questa prima verticale **job, scheda derivata, proposte e valori/storia sono personali al creatore**, anche quando una fonte M2 ha visibilità home. Non avviene una condivisione automatica di informazioni derivate da un originale private. UI: «Scheda personale in questa casa». È il confine iniziale di riservatezza; condivisione delle schede richiede una policy successiva, non va inventata dal frontend.

GET: membership Home read valida + account creatore. POST: stessa membership con edit. L'owner non legge risorse M3 personali altrui. Le fonti di ogni richiesta devono essere leggibili via policy M2; originale private non leggibile resta escluso. Home diversa/account diverso/ID UUID valido inesistente → 403 generico; UUID invalido → 422. Worker ricontrolla edit e le fonti prima di pubblicare; revoca impedisce pubblicazione e ogni accesso successivo. Viewer può leggere una propria scheda già esistente ma non avviare job o confermare.

Trasporto come M2: cookie, Account-Context catturato da query/form su ogni richiesta; Origin/CSRF su POST; cache no-store, cache frontend account/home/asset/job, abort e pulizia al logout/cambio contesto. Bozze solo in memoria. Nessun link pubblico, invito o trasferimento in M3.

## Modello del risultato

```ts
type FieldKey = 'brand' | 'model' | 'power';
type QuantityCode = 'useful_heating' | 'reported_nominal' | 'other';
type SourceRef = {
  documentId: string; documentVersion: 1; documentSha256: string;
  page: 1; excerpt: string;
};
type Measurement = {
  value: string; unit: 'kW'; quantityCode: QuantityCode; quantityLabel: string;
};
type Candidate = {
  id: string; value: string; sources: SourceRef[];
  measurement?: Measurement; // presente solo per power
};
type FieldInput = { kind: 'text'; text: string } |
  { kind: 'power'; measurements: Measurement[] };
type FieldValue = { kind: 'text'; text: string } |
  { kind: 'power'; measurements: Array<Measurement & {
    sources: SourceRef[]; origin: 'proposal_accepted' | 'user_correction' | 'manual';
  }> };
type ProposedField = {
  id: string; assetId: string; jobId: string; fieldKey: FieldKey;
  kind: 'single_value' | 'quantity_interpretation' | 'value_conflict';
  state: 'open' | 'accepted' | 'corrected' | 'discarded' | 'already_matches';
  candidates: Candidate[]; currentConfirmed: ConfirmedField | null;
  provider: 'test_fixture_v1'; isSimulation: true;
};
type ConfirmedField = {
  fieldKey: FieldKey; value: FieldValue; revision: number;
  origin: 'proposal_accepted' | 'user_correction' | 'manual';
  sources: SourceRef[]; note: string | null;
  confirmationId: string; confirmedAt: string;
};
type BoilerSummary = {
  id: string; homeId: string; name: string; type: 'boiler'; visibility: 'private';
  state: 'provisional' | 'partially_confirmed' | 'confirmed'; version: number;
  openReviewCount: number; confirmedFields: ConfirmedField[];
  permissions: Array<'read' | 'edit'>;
};
type BoilerDetail = BoilerSummary & { proposals: ProposedField[] };
type AnalysisJob = {
  id: string; homeId: string; assetId: string | null; parentJobId: string | null;
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  provider: 'test_fixture_v1'; isSimulation: true;
  documentIds: string[]; createdAt: string; finishedAt: string | null;
  outcome: null | 'proposals_created' | 'no_changes';
  openReviewCount: number | null;
  error: null | { code: string; message: string };
};
type HistoryEvent = {
  id: string; assetId: string; at: string;
  kind: 'analysis_published' | 'analysis_no_changes' | 'confirmation' | 'manual_confirmation';
  origin: 'test_provider' | 'explicit_user';
  confirmationId: string | null; note: string | null;
  changes: Array<{ fieldKey: FieldKey; before: FieldValue | null; after: FieldValue | null;
    proposalId: string | null; action: string; sources: SourceRef[] }>;
};
```

ID UUID, timestamp ISO UTC, hash esadecimali minuscoli. Marca 1–80, modello 1–120, nome scheda 1–80, quantityLabel 1–160, note 1–500 code point dopo trim. Stringhe di valori originali e fonti conservate; una correzione non cambia l'estratto originale.

Per power candidate.value coincide con measurement.value. Ogni misura confermata mantiene le proprie fonti e origine, non soltanto un elenco generale sulla scheda. Il client non invia sources/origin fidati: il server li costruisce da candidateId e dall'azione utente. Brand/model con stesso valore da due documenti possono avere un unico candidato e due SourceRef, senza perdere provenienza.

Potenza come stringa decimale positiva senza esponente, massimo 12 cifre intere e 6 decimali; server normalizza rappresentazione (`24.000` → `24`). Nessuna conversione di unità o soglia normativa in questa verticale. Ogni misura confermata ha denominazione e unità; due misure non diventano un unico numero generico.

Scheda provisional: zero campi confermati. Partially_confirmed: almeno un campo confermato ma altri campi mancanti o verifiche aperte. Confirmed: brand/model/power presenti e zero verifiche aperte. Etichette devono riferirsi ai **dati**, mai alla regolarità tecnica della caldaia. Un dato manuale incompleto può restare parziale senza bloccare l'uso della Home.

## Endpoint

Base `/api/v5`; ogni percorso è relativo a una Home. Liste con limit 1–50 default 20, cursor opaco facoltativo, ordine createdAt/id discendente. Cursor vincolato ad account/home/risorsa; 422 se invalido o riusato altrove. Nessun filtro di ricerca necessario in M3.

| Metodo / percorso | Input / risposta |
|---|---|
| GET `/homes/:homeId/analysis-capabilities` | 200 `{provider:'test_fixture_v1',isSimulation:true,enabled:true,maxDocuments:2,formats:['application/pdf']}` |
| POST `/homes/:homeId/analysis-jobs` | `{documentIds:string[],targetAssetId?:string}` + Idempotency-Key; 202 `{job:AnalysisJob}` |
| GET `/homes/:homeId/analysis-jobs` | 200 `{items:AnalysisJob[],nextCursor:string|null}` |
| GET `/homes/:homeId/analysis-jobs/:jobId` | 200 `{job:AnalysisJob}` |
| POST `/homes/:homeId/analysis-jobs/:jobId/retry` | `{}` + nuova Idempotency-Key; solo failed; 202 `{job:AnalysisJob}` nuovo con parentJobId |
| GET `/homes/:homeId/assets` | 200 `{items:BoilerSummary[],nextCursor:string|null}`; M3 solo boiler |
| POST `/homes/:homeId/assets` | `{type:'boiler',name:string}` + Idempotency-Key; 201 `{asset:BoilerDetail}` vuota/provvisoria personale |
| GET `/homes/:homeId/assets/:assetId` | 200 `{asset:BoilerDetail}` |
| GET `/homes/:homeId/review` | 200 `{items:ReviewItem[],openCount:number,nextCursor:string|null}`; **solo aperte** |
| POST `/homes/:homeId/assets/:assetId/confirmations` | body decisioni sotto + Idempotency-Key; 201 `{confirmationId:string,asset:BoilerDetail,resolvedProposalIds:string[],remainingOpenCount:number}` |
| POST `/homes/:homeId/assets/:assetId/manual-confirmations` | body manuale sotto + Idempotency-Key; stessa risposta, confirmationId persistente |
| GET `/homes/:homeId/assets/:assetId/history` | 200 `{items:HistoryEvent[],nextCursor:string|null}` |

`ReviewItem = { id:string, assetId:string, assetName:string, assetVersion:number, proposal:ProposedField }`; id identifica una verifica, proposal.id identifica la decisione. openCount è il totale aperto leggibile nella Home, non solo la pagina; remainingOpenCount è relativo alla scheda dell'operazione.

Avvio: 1–2 documentIds distinti, stessa Home, leggibili. `targetAssetId` opzionale ma deve appartenere al creatore: senza target si propone una **nuova** scheda dopo successo, senza fusione automatica. Nell'UI una rianalisi della scheda passa sempre il suo target; non ricrearla per errore.

## Conferme e correzioni

Body `{expectedVersion:number, decisions:Decision[]}`; 1–50 decisioni con proposalId distinti, tutte della stessa scheda/account e aperte. Versione confrontata in transazione. Conferme atomiche: o tutte riuscite o nessun valore/verifica/storia modificato.

```ts
type Decision =
  | { proposalId:string; action:'accept'; candidateId:string; replaceConfirmed?:boolean; note?:string }
  | { proposalId:string; action:'correct'; value:string; note:string; replaceConfirmed?:boolean }
  | { proposalId:string; action:'resolve_power'; mode:'keep_distinct'|'choose_one'|'correct';
      measurements:Array<Measurement & {candidateId?:string}>; note:string; replaceConfirmed?:boolean }
  | { proposalId:string; action:'discard'; note:string };
```

- Accept/correct solo brand/model. Due campi descrittivi possono essere confermati insieme.
- Power richiede **una decisione puntuale**, nota e semantica; la richiesta che la contiene non include altri campi. Mai conferma cumulativa implicita.
- A+B: keep_distinct deve conservare tutti i candidati, valori e quantità distinte con denominazioni esplicite; il server verifica associazioni candidateId, valori/unità e distinzione delle quantityCode originali. Non usare keep_distinct per nascondere A+C, che hanno la stessa quantità.
- A+C: choose_one seleziona un candidato della grandezza in conflitto, con motivazione; gli altri originali/candidati restano nello storico. Correct permette una misura dichiaratamente corretta dall'utente con denominazione e nota. Origine user_correction quando modifica valore o significato, non proposta accettata.
- Per correct power: 1–2 misure valide con denominazioni distinte, nota obbligatoria. CandidateId facoltativo associa una fonte di confronto; non attribuisce alla fonte un valore corretto che non contiene.
- Un campo già confermato non viene sostituito senza `replaceConfirmed:true` **e nota**: altrimenti 409 confirmed_value_exists. Il frontend richiede conferma esplicita della sostituzione, mostrando prima/dopo. Worker e nuova analisi non usano questa opzione.
- Discard chiude quella proposta con motivazione, senza cambiare il valore confermato e senza cancellare originali. Rimanda non invia una mutazione: verifica ancora aperta.
- Dopo successo chiudere soltanto resolvedProposalIds; ricaricare review/count, scheda e storia. Nessuna perdita dei campi non selezionati. A zero aperte mostrare stato vuoto, senza schede confermate disabilitate.

Body manuale `{expectedVersion:number, fields:Array<{fieldKey:FieldKey,value:FieldInput,note:string,replaceConfirmed?:boolean,proposalIdsToClose:string[]}>}`. 1–3 chiavi distinte, shape coerente con fieldKey; potenza da sola. Campo pieno richiede stessa sostituzione esplicita. Fonti di un dato manuale non inventate: origin manual, nessuna citazione a un originale che non contenga il dato. proposalIdsToClose comprende soltanto verifiche di quella chiave/scheda, scelte esplicitamente dall'utente; [] lascia le eventuali proposte ancora aperte. Manuale prima di ogni analisi è ammesso; nessun obbligo di provider disponibile.

## Idempotenza, versioni, nuova analisi

Chiavi 16–100 ASCII alfanumerici/_/-, UUID ammesso; ambito account+home+tipo operazione+target. Impronta su DTO normalizzato, liste di ID ordinabili come insiemi senza perdere la corrispondenza decisione/valore. Stessa chiave/body ritorna **lo stesso risultato della prima operazione**; chiave con body diverso 409 idempotency_conflict. Retry dopo perdita della risposta si risolve prima del confronto expectedVersion, evitando falso conflitto della propria conferma già riuscita; permessi attuali sempre verificati. Nessun retry automatico POST.

Nuova proposta ha stato open e fonte immutabile; nessuna scrittura di ConfirmedField. Se il dato coincide con quello già confermato, o il medesimo insieme di evidenze immutabili è già stato risolto/discarded e quel campo non è cambiato dopo la decisione, il provider registra already_matches/no_changes e non ricrea la verifica. Questa è una comparazione, **non una nuova conferma utente**. Evidenze/valori differenti producono una proposta con currentConfirmed visibile, senza sovrascriverlo. Conservare impronte e revisioni per non sopprimere nuove divergenze.

Asset.version aumenta quando cambiano proposte aperte/valori/verifiche della scheda; ogni conferma/manuale riuscita aumenta una volta. Una nuova analisi conclusa senza cambiamenti non cambia i valori né la versione della scheda. 409 asset_version_conflict richiede rilettura e nuova scelta; non reinviare automaticamente decisioni obsolete. Proposta già risolta con nuova chiave → 409 proposal_already_resolved.

## Job persistenti e recupero

POST crea il job e la richiesta idempotente, non proposte sincrone fittizie. Worker locale con stato/lease persistente in DB: queued → running → succeeded/failed. Dopo crash riprende queued e running con lease scaduta; pubblicazione di scheda/proposte/verifiche e successo del job nella stessa transazione, unicità per job/campo. Nessuna doppia scheda o doppia verifica su recupero. Job fallito non lascia una nuova scheda vuota o dati parziali pubblicati.

Logout non cancella il job già avviato: il lavoro resta personale; revoca/permessi mancanti prima della pubblicazione impediscono l'effetto. Retry manuale di failed crea un nuovo tentativo con parentJobId e stessi snapshot/target, dopo controllo fonti/diritti; non azzera il vecchio errore. Stato running con limite tecnico 120 secondi, poi fallimento esplicito analysis_timeout; niente attese infinite. Nessuna notifica/email esterna.

UI polling GET a 1 secondo mentre queued/running, massimo 30 secondi per visita; poi «Analisi in corso, puoi tornare più tardi» e aggiornamento manuale, senza simulare successo. Risultato persistente accessibile da Attività. Stop polling al logout/cambio casa/unmount. Il provider fixture va completato rapidamente, ma il frontend non assume una durata.

## Errori

Envelope identity-v1.1; errori in italiano, fieldErrors facoltativi. Errori HTTP: 401, 403, 409, 422, 429, 503. UUID/DTO/cursor non validi 422 validation_error; JSON non valido/non-JSON successo è errore servizio. Riferimenti M2 e policy file invariati.

Codici stabili: idempotency_conflict, asset_version_conflict, confirmed_value_exists, proposal_already_resolved, invalid_resolution (422), invalid_job_state (409), csrf_invalid, account_context_changed, storage_unavailable. Job failed include provider_fixture_unsupported, analysis_unavailable, analysis_timeout o access_revoked. Quando membership non è più valida l'endpoint resta 403, non espone dettagli del job al richiedente revocato.

## Criteri di uscita M3

API/DB: due account/due Home; job e schede personali; source private non leaks; revoca anche durante worker; recupero crash senza duplicati; conferma brand sola lascia model/power aperti; reload e login preservano esiti; idem/concorrenza/versioni; correzione utente non sovrascritta da reanalisi; A+B conserva 24 e 28 con nomi/unità; A+C richiede scelta puntuale e conserva fonti; discard/rimanda distinti; originali/hash/status M2 immutati; nessuna scadenza o effetto normativo.

Frontend: mock solo harness; nessun esito fake nell'app reale; fonte apribile via flusso M2 autenticato; quantità/valori distinguibili; chiusura esatta delle schede; stati job e errori; manuale disponibile; 320/390/desktop/tastiera; passaggio account/casa e 401 durante richieste; nessuna bozza persiste localmente. Collaudo finale Codex su backend vero. Non dichiarare conformità WCAG.

