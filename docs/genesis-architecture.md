# Architettura di HomeOS Genesis

Percorso guidato ("Genesis") che porta una casa appena creata, senza dati, a un primo Digital Twin utile in pochi minuti: informazioni essenziali, documenti, una scansione guidata (oggi dimostrativa), revisione e conferma di ciò che propone, un primo Home Score con osservazioni. Vedi `decisions.md` #25 per le motivazioni delle scelte principali, `domain-model.md` per il dettaglio delle entità, `product-backlog.md` per come Genesis si colloca nella visione a lungo termine (EPIC 0).

## 1. Componenti

```
backend/src/genesis/
├── genesis.module.ts              — wiring (importa RoomsModule/AssetsModule, lega HouseScanProvider al mock)
├── genesis.controller.ts          — endpoint REST, un metodo per step del wizard
├── genesis.service.ts             — orchestrazione: nessuna business logic dei motori qui dentro
├── dto/                           — SaveHouseInfoDto, StartScanDto, ConfirmObservationsDto
└── scan/
    ├── house-scan-provider.interface.ts   — StartScanInput/ScanSessionResult/ScanObservationResult/HouseScanProvider
    ├── house-scan-provider.token.ts       — Symbol per l'injection token
    ├── mock-house-scan-provider.ts        — unica implementazione oggi
    └── genesis-demo-dataset.ts            — catalogo fisso (14 ambienti, 25 asset), non casuale

backend/src/common/
├── home-score.ts       — motore Home Score, funzione pura
├── home-score.spec.ts
├── home-detective.ts   — motore Home Detective, funzione pura
└── home-detective.spec.ts

frontend/src/components/Genesis.tsx   — wizard 6 step (GenesisWizard + step interni)
```

`GenesisService` è deliberatamente un **orchestratore**, non un motore: chiama `computeHomeScore`/`evaluateHomeDetectiveRules` (funzioni pure, senza accesso al DB), poi riconcilia il risultato con lo stato reale in `Issue`/`Recommendation`/`ScoreSnapshot`. Per creare Room/Asset da un'Observation confermata, inietta e riusa `RoomsService`/`AssetsService` esistenti invece di duplicarne la logica di generazione codice (`AMB-###`/`AST-###`) e i calcoli automatici (es. `warrantyUntil` di default).

## 2. Modello dati (riassunto)

Vedi `domain-model.md` per il dettaglio completo. In sintesi: `House` esteso con `address`/`postalCode`/`propertyType`/`country`/`genesisStatus`; `Room`/`Asset` estesi con `confidence`/`source`/`confirmed`; nuove tabelle `Floor`, `ScanSession`, `Observation`, `Issue`, `Recommendation`, `ScoreSnapshot`, `HouseTimelineEvent`. Tutte le estensioni sono opzionali o con default — nessuna migrazione di dati richiesta per le case create prima di Genesis.

## 3. Interfaccia provider e adapter mock

```typescript
interface HouseScanProvider {
  startScan(input: StartScanInput): Promise<ScanSessionResult>;
  getResults(scanSessionId: string): Promise<ScanObservationResult[]>;
}
```

`MockHouseScanProvider` è l'unica implementazione oggi, legata all'interfaccia tramite un token DI (`HOUSE_SCAN_PROVIDER`, `Symbol`). Il catalogo demo (`genesis-demo-dataset.ts`) è **fisso**, non casuale, ma la sessione contiene solo gli ambienti e Asset scelti dall'utente nello step Scansione. Questo mantiene risultati riproducibili senza imporre una casa-tipo unica.

**Il confine mock/reale è dichiarato anche in UI**: lo step "Scansione" del wizard dice esplicitamente che è una scansione dimostrativa, non un'analisi reale di foto/video — nessun testo lascia intendere il contrario.

## 4. Motore Home Score

`backend/src/common/home-score.ts`, funzione pura `computeHomeScore(input): ScoreResult`, versionata (`HOME_SCORE_VERSION = 'v1'`, salvata su ogni `ScoreSnapshot` per riconoscere in futuro punteggi calcolati con pesi precedenti).

5 dimensioni pesate (0–100 ciascuna, overall = somma pesata, sempre clampato 0–100):

| Dimensione | Peso | Segnali (penalità/bonus) |
|---|---|---|
| Documentazione | 25% | −30 se la casa non ha nessun documento; −10 per ogni asset di tipo critico (CALDAIA/ELETTRICO/IDRAULICO/FOTOVOLTAICO) senza documento collegato |
| Manutenzione | 20% | −25 per una CALDAIA senza piano di manutenzione |
| Sicurezza | 25% | −20 per un asset critico senza **né** documento **né** piano di manutenzione (doppio segnale, deliberatamente conservativo) |
| Affidabilità del record (v2, B44) | 15% | riusa `computeMemoryReliability` (B48, `common/memory-reliability.ts`): stessa percentuale di copertura mostrata dalla card "Affidabilità della memoria" in Dashboard, mai una seconda formula. Sostituisce "Efficienza" (v1), il cui unico segnale (`estimatedReplacementYear`) non era mai valorizzato da alcun flusso automatico |
| Completezza (Digital Twin) | 15% | fino a 40 punti per stanze confermate, fino a 30 per asset confermati, +30 se Genesis è completo |

Ogni scostamento dal punteggio pieno produce una `reason` esplicita (`code`, `label`, `impact`) — mai un numero senza motivazione. **Nessuna stima di valore immobiliare, nessuna promessa di risparmio, nessuna diagnosi tecnica certa**: solo segnali osservabili dai dati già in HomeOS.

## 5. Motore Home Detective

`backend/src/common/home-detective.ts`, funzione pura `evaluateHomeDetectiveRules(input): IssueDraft[]`. Nessun LLM: regole `if/else` esplicite e leggibili, stesso stile "euristica trasparente" già scelto per `maintenance-guidelines.ts` e per il matching documento→asset.

8 regole (nomi = `ruleCode` salvato su `Issue`, per la riconciliazione idempotente). L'identità di ogni Issue non è più solo `(ruleCode, assetId)`: da B49 include anche `interventionId`/`warrantyId`/`contactId` quando pertinenti (vedi §6 e `decisions.md` #49) — necessario perché più regole ora si riferiscono a Intervention/Warranty/Contact, non solo ad Asset.

| `ruleCode` | Severità | Condizione |
|---|---|---|
| `HEATING_SYSTEM_WITHOUT_DOCUMENTATION` | MEDIUM | asset CALDAIA senza documento collegato |
| `UNCONFIRMED_SCAN_RESULTS` | LOW | ci sono Observation ancora `PENDING` |
| `HOUSE_WITHOUT_DOCUMENTS` | MEDIUM | nessun documento collegato alla casa |
| `GENESIS_INCOMPLETE` | LOW | il percorso Genesis non è ancora completato |
| `INTERVENTION_WITHOUT_DOCUMENT` (B49) | LOW | un `Intervention` senza nessun documento collegato |
| `INTERVENTION_WITHOUT_CONTACT` (B49) | LOW | un `Intervention` senza contatto associato |
| `WARRANTY_WITHOUT_PROOF` (B49) | MEDIUM | una `Warranty` senza documento di prova |
| `CONTACT_TO_VERIFY` (B49) | LOW | un `Contact` realmente usato (referenziato da almeno un Intervention/Warranty) ma senza telefono né email |

**`ASSET_WITHOUT_ROOM` rimossa (B44)**: esisteva una regola, ristretta ai tipi `ELETTRODOMESTICO`/`CLIMA` per rispettare la semantica di `Asset.roomId: null` come "impianto di casa" (non dato mancante, vedi `domain-model.md`) — spenta per decisione di prodotto (backlog B44), generava ancora troppi falsi positivi percepiti. Le Issue OPEN esistenti si auto-risolvono al primo ricalcolo successivo tramite lo stesso meccanismo di riconciliazione usato per ogni altra regola non più valida.

## 6. Riconciliazione Issue/Recommendation (idempotenza)

`GenesisService.reconcileIssues` confronta l'output di `evaluateHomeDetectiveRules` (cosa **dovrebbe** esistere ora) con le `Issue` `OPEN` già in DB, per chiave `ruleCode:assetId:interventionId:warrantyId:contactId` (estesa in B49 — la sola `ruleCode:assetId` collideva per ogni regola riferita a un'entità diversa da Asset, con `assetId` sempre `null`: bug reale trovato e corretto, vedi `decisions.md` #49):

- chiave presente nei draft ma non tra le `Issue` aperte → crea `Issue` + `Recommendation` collegata (1:1 oggi);
- chiave tra le `Issue` aperte ma non più nei draft → risolve la `Issue` (`status: RESOLVED`) e chiude le sue `Recommendation` collegate (`status: DONE`);
- chiave in entrambe → non fa nulla (idempotente: chiamate ripetute con lo stesso stato producono lo stesso risultato finale, verificato in `genesis.service.spec.ts`).

Nessun vincolo unique DB per questa idempotenza: i 5 riferimenti sono tutti nullable, renderebbero un indice unique inaffidabile, e la query "esiste già una Issue OPEN con questa chiave" resta comunque necessaria per la semantica "riapri se torna a valere".

## 6bis. Deduplica contro dati già esistenti (avviso, mai fusione automatica)

`genesis-duplicate.ts` (funzione pura, `findPossibleDuplicate`) confronta il nome proposto da un'Observation con i Room/Asset già confermati in casa dello stesso tipo: nome identico case-insensitive, oppure almeno una parola significativa condivisa (stessa euristica di `haveSimilarSuggestedName` in `documents.service.ts`, senza la restrizione `PRODUCT_WORDS` — i nomi di ambiente non hanno lo stesso rischio "solo la marca in comune" dei nomi di elettrodomestici). `GenesisService.getScanResults` arricchisce ogni Observation con `possibleDuplicate: {id, name} | null`; il frontend lo mostra come avviso e fa partire quell'elemento su "Scarta" per default (annullabile). Quando una Room duplicata resta scartata, gli Asset dello stesso batch che la referenziano per nome si collegano comunque alla Room reale (mai orfani come "impianto di casa" solo per questo) — vedi `decisions.md` #26. **Mai una fusione automatica**: unire per errore due impianti realmente diversi sarebbe un danno peggiore di un duplicato lasciato lì, scartabile a mano.

## 7. Flusso end-to-end

```
POST /houses/:id/genesis/start                    genesisStatus: NOT_STARTED → IN_PROGRESS
PATCH /houses/:id/genesis/house-info               salva indirizzo/città/tipo immobile/superficie/anno (tutto opzionale)
POST /houses/:id/documents (esistente, riusato)     upload documenti — facoltativo, si può saltare
GET  /genesis/demo-catalog                          catalogo selezionabile di ambienti e Asset dimostrativi
POST /houses/:id/genesis/scan                       riceve roomNames/assetNames; crea solo le Observation scelte
GET /houses/:id/genesis/scan/:sessionId             legge le Observation proposte
POST /houses/:id/genesis/scan/:sessionId/confirm    converte le Observation confermate/modificate in Room/Asset reali (riusa RoomsService/AssetsService)
POST /houses/:id/genesis/complete                   home-detective + home-score, riconcilia Issue/Recommendation, salva ScoreSnapshot, genesisStatus → COMPLETED
GET /houses/:id/genesis                             risultati correnti (score, issues, recommendations, conteggi) — usato sia dal wizard che dalla Dashboard
GET /houses/:id/genesis/timeline                    HouseTimelineEvent, per la sezione "Cronologia casa" in Dashboard
```

Il frontend (`Genesis.tsx`) è una macchina a stati a 6 step (Welcome, House Information, Documents, House Scan, Review Digital Twin, Genesis Results). `House.genesisStep` persiste lo step esatto; `GET /houses/:id/genesis/resume` ricarica anche l'ultima `ScanSession` e le sue `Observation` quando lo step è Review. Le navigazioni all'indietro vengono persistite e il backend impedisce di saltare più di uno step in avanti.

## 8. Dashboard

`Dashboard.tsx` legge `GET /houses/:id/genesis` quando `genesisStatus === 'COMPLETED'` e mostra, in ordine: card Home Score (punteggio + 5 barre dimensione), sezione "Da tenere d'occhio" (Issue aperte), "Consigliato" (Recommendation aperte), poi la griglia statistiche esistente (con conteggio documenti ora reale, non più hardcoded a 0) e infine "Cronologia casa" (`HouseTimelineEvent`, ultimi 8). Prima del completamento, un banner invita a iniziare/riprendere Genesis.

La card Home Score espone anche il trend degli ultimi 12 mesi (`GET .../score-history`) per totale e cinque dimensioni. Il ricalcolo è esplicito (`POST .../recalculate`): riconcilia anche Home Detective e salva un nuovo `ScoreSnapshot` solo quando cambia almeno un valore o `calculationVersion`, evitando rumore storico.

## 9. Limitazioni note del prototipo

- ~~Nessuna autenticazione~~ — limite storico risolto da B2: gli endpoint Genesis usano la sessione e `AccessControlService` come il resto delle API.
- ~~Nessuna deduplica contro Asset/Room già esistenti~~ — risolto 2026-08-04, vedi §6bis e `decisions.md` #26: avviso + default "Scarta", mai fusione automatica.
- ~~Ripresa del wizard solo a grana grossa~~ — risolta con B34: lo step esatto è persistito su `House` e Review ricostruisce la sessione di scansione dal backend.
- ~~Efficienza con segnale debole~~ — risolto con B44: la dimensione è stata sostituita da "Affidabilità del record" (riusa `computeMemoryReliability`, B48). `Asset.estimatedReplacementYear` resta nello schema (ancora accettato in creazione Asset) ma non alimenta più alcuna dimensione dello score.
- **Scansione dimostrativa, non reale**: nessuna computer vision né analisi di foto/video. L'utente compone una proposta scegliendo da un catalogo fisso ampio; nomi e confidenze restano dimostrativi.

## 10. Percorso verso il reale (path to replacing mocks)

1. Implementare un `HouseScanProvider` reale (upload foto/video → job asincrono → popolamento `Observation` con `confidence` derivata da un modello, non fissa) e legarlo al posto di `MockHouseScanProvider` in `genesis.module.ts` — nessun altro file cambia per contratto.
2. Aggiungere una fase di deduplica in `GenesisService.confirmObservations`, riusando/estendendo l'euristica di `documents.service.ts` (`haveSimilarSuggestedName`) prima di creare un nuovo Asset.
3. ~~Persistere uno step corrente esplicito~~ — completato con B34 su `House`.
4. ~~Popolare `estimatedReplacementYear`...~~ — non più applicabile: la dimensione Efficienza che lo usava è stata sostituita da B44 con "Affidabilità del record".
5. ~~Applicare l'isolamento per utente~~ — completato con B2; restano da chiudere cifratura token e altri requisiti production-grade prima dell'esposizione pubblica.

## 11. Destinazione Check-up v6 (incrementale, non ancora UI corrente)

La specifica di settembre 2026 mantiene persistenza server e ripresa, ma ridisegna il percorso reale in cinque momenti: comune ISTAT e ruolo; foto reale della targhetta con proposta AI e conferma; stato dichiarato del libretto/ultimo controllo; primo valore orientativo con evidenza e fonti; una sola CTA contestuale. Il catalogo `GUIDED_MOCK` resta disponibile esclusivamente come demo esplicita.

Questo documento continua a descrivere il wizard attualmente eseguibile finché il nuovo frontend non viene completato. Le fondazioni (`EvidenceStatus`, `ThermalSystem`, regole versionate e `MaintenancePlan` generalizzato) sono state introdotte prima della UI per evitare claim costruiti su costanti non governate. Nessun flusso reale deve incontrare il catalogo demo al termine della migrazione.
