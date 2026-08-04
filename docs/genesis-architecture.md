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
    └── genesis-demo-dataset.ts            — dataset fisso (4 stanze, 7 asset), non casuale

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

`MockHouseScanProvider` è l'unica implementazione oggi, legata all'interfaccia tramite un token DI (`HOUSE_SCAN_PROVIDER`, `Symbol`) in `genesis.module.ts` — un unico punto da cambiare per introdurre un provider reale (foto/video + computer vision), senza toccare `GenesisService` né il frontend. Il dataset demo (`genesis-demo-dataset.ts`) è **fisso**, non generato casualmente: stessa scansione, stesso risultato, ogni volta — riproducibile e spiegabile all'utente ("perché questo elemento ha l'89% di confidenza" ha sempre la stessa risposta).

**Il confine mock/reale è dichiarato anche in UI**: lo step "Scansione" del wizard dice esplicitamente che è una scansione dimostrativa, non un'analisi reale di foto/video — nessun testo lascia intendere il contrario.

## 4. Motore Home Score

`backend/src/common/home-score.ts`, funzione pura `computeHomeScore(input): ScoreResult`, versionata (`HOME_SCORE_VERSION = 'v1'`, salvata su ogni `ScoreSnapshot` per riconoscere in futuro punteggi calcolati con pesi precedenti).

5 dimensioni pesate (0–100 ciascuna, overall = somma pesata, sempre clampato 0–100):

| Dimensione | Peso | Segnali (penalità/bonus) |
|---|---|---|
| Documentazione | 25% | −30 se la casa non ha nessun documento; −10 per ogni asset di tipo critico (CALDAIA/ELETTRICO/IDRAULICO/FOTOVOLTAICO) senza documento collegato |
| Manutenzione | 20% | −25 per una CALDAIA senza piano di manutenzione |
| Sicurezza | 25% | −20 per un asset critico senza **né** documento **né** piano di manutenzione (doppio segnale, deliberatamente conservativo) |
| Efficienza | 15% | −15 per asset con `estimatedReplacementYear` già superato (segnale debole: nessun flusso valorizza ancora questo campo automaticamente — limite dichiarato, non nascosto) |
| Completezza (Digital Twin) | 15% | fino a 40 punti per stanze confermate, fino a 30 per asset confermati, +30 se Genesis è completo |

Ogni scostamento dal punteggio pieno produce una `reason` esplicita (`code`, `label`, `impact`) — mai un numero senza motivazione. **Nessuna stima di valore immobiliare, nessuna promessa di risparmio, nessuna diagnosi tecnica certa**: solo segnali osservabili dai dati già in HomeOS.

## 5. Motore Home Detective

`backend/src/common/home-detective.ts`, funzione pura `evaluateHomeDetectiveRules(input): IssueDraft[]`. Nessun LLM: regole `if/else` esplicite e leggibili, stesso stile "euristica trasparente" già scelto per `maintenance-guidelines.ts` e per il matching documento→asset.

5 regole (nomi = `ruleCode` salvato su `Issue`, per la riconciliazione idempotente):

| `ruleCode` | Severità | Condizione |
|---|---|---|
| `HEATING_SYSTEM_WITHOUT_DOCUMENTATION` | MEDIUM | asset CALDAIA senza documento collegato |
| `ASSET_WITHOUT_ROOM` | LOW | asset di tipo `ELETTRODOMESTICO`/`CLIMA` senza `roomId` — **non** tutti i tipi, vedi sotto |
| `UNCONFIRMED_SCAN_RESULTS` | LOW | ci sono Observation ancora `PENDING` |
| `HOUSE_WITHOUT_DOCUMENTS` | MEDIUM | nessun documento collegato alla casa |
| `GENESIS_INCOMPLETE` | LOW | il percorso Genesis non è ancora completato |

**Adattamento deliberato di `ASSET_WITHOUT_ROOM`**: la specifica originale chiedeva di segnalare qualunque asset senza stanza. In HomeOS `Asset.roomId: null` è già una scelta di dominio consolidata ("impianto di casa", es. impianto elettrico condominiale — vedi `domain-model.md`), non un dato mancante. Applicare la regola a tutti i tipi avrebbe prodotto falsi positivi sistematici su ELETTRICO/IDRAULICO/FOTOVOLTAICO/TETTO; la regola è quindi ristretta ai tipi che tipicamente vivono in una stanza specifica.

## 6. Riconciliazione Issue/Recommendation (idempotenza)

`GenesisService.reconcileIssues` confronta l'output di `evaluateHomeDetectiveRules` (cosa **dovrebbe** esistere ora) con le `Issue` `OPEN` già in DB, per chiave `ruleCode:assetId`:

- chiave presente nei draft ma non tra le `Issue` aperte → crea `Issue` + `Recommendation` collegata (1:1 oggi);
- chiave tra le `Issue` aperte ma non più nei draft → risolve la `Issue` (`status: RESOLVED`) e chiude le sue `Recommendation` collegate (`status: DONE`);
- chiave in entrambe → non fa nulla (idempotente: chiamate ripetute con lo stesso stato producono lo stesso risultato finale, verificato in `genesis.service.spec.ts`).

Nessun vincolo unique DB per questa idempotenza: `assetId`/`documentId` nullable renderebbero un indice unique inaffidabile, e la query "esiste già una Issue OPEN con questa chiave" resta comunque necessaria per la semantica "riapri se torna a valere".

## 7. Flusso end-to-end

```
POST /houses/:id/genesis/start                    genesisStatus: NOT_STARTED → IN_PROGRESS
PATCH /houses/:id/genesis/house-info               salva indirizzo/città/tipo immobile/superficie/anno (tutto opzionale)
POST /houses/:id/documents (esistente, riusato)     upload documenti — facoltativo, si può saltare
POST /houses/:id/genesis/scan                       MockHouseScanProvider crea ScanSession + N Observation, genesisStatus → PROCESSING
GET /houses/:id/genesis/scan/:sessionId             legge le Observation proposte
POST /houses/:id/genesis/scan/:sessionId/confirm    converte le Observation confermate/modificate in Room/Asset reali (riusa RoomsService/AssetsService)
POST /houses/:id/genesis/complete                   home-detective + home-score, riconcilia Issue/Recommendation, salva ScoreSnapshot, genesisStatus → COMPLETED
GET /houses/:id/genesis                             risultati correnti (score, issues, recommendations, conteggi) — usato sia dal wizard che dalla Dashboard
GET /houses/:id/genesis/timeline                    HouseTimelineEvent, per la sezione "Cronologia casa" in Dashboard
```

Il frontend (`Genesis.tsx`) è una macchina a stati a 6 step (Welcome, House Information, Documents, House Scan, Review Digital Twin, Genesis Results), con `GenesisStatus` (4 valori grezzi) usato per decidere da quale step riprendere se l'utente esce e rientra — vedi limiti al punto 9.

## 8. Dashboard

`Dashboard.tsx` legge `GET /houses/:id/genesis` quando `genesisStatus === 'COMPLETED'` e mostra, in ordine: card Home Score (punteggio + 5 barre dimensione), sezione "Da tenere d'occhio" (Issue aperte), "Consigliato" (Recommendation aperte), poi la griglia statistiche esistente (con conteggio documenti ora reale, non più hardcoded a 0) e infine "Cronologia casa" (`HouseTimelineEvent`, ultimi 8). Prima del completamento, un banner invita a iniziare/riprendere Genesis.

## 9. Limitazioni note del prototipo

- **Nessuna autenticazione**: dichiarato esplicitamente prima di iniziare, accettato dall'utente come parte dello scope (vedi `decisions.md` #25). Nessuna verifica di ownership sulla casa negli endpoint Genesis — stessa lacuna già presente nel resto dell'API (`backlog.md` B2), non introdotta da Genesis.
- **Nessuna deduplica contro Asset/Room già esistenti**: confermare una Observation crea sempre una riga nuova, anche se esiste già un Asset con nome/tipo molto simile. Osservato in verifica live: un secondo "Impianto elettrico" accanto a uno reale già censito. Farlo bene richiederebbe un'euristica di matching non banale (vedi `decisions.md` #23 sulla stessa difficoltà per documento→asset) — tracciato in `backlog.md`.
- **Ripresa del wizard solo a grana grossa**: `GenesisStatus` ha 4 soli valori (`NOT_STARTED`/`IN_PROGRESS`/`PROCESSING`/`COMPLETED`), non uno per step. Uscire a metà della Review e rientrare riparte dallo step "Scansione", non esattamente da dove si era interrotto — lo stato dettagliato del wizard (`ScanSession`/`Observation` già create) non va perso lato dati, ma il frontend non lo ripresenta automaticamente in questa iterazione.
- **Efficienza con segnale debole**: `Asset.estimatedReplacementYear` esiste nello schema ma nessun flusso lo valorizza ancora automaticamente — la dimensione "Efficienza" dell'Home Score resta quindi quasi sempre 100 in pratica, dichiarato nel codice (`home-score.ts`) invece di nascosto.
- **Scansione dimostrativa, non reale**: nessuna computer vision, nessuna analisi di foto/video — un dataset fisso di 4 stanze/7 asset tipici, sempre uguale. Sostituire il mock richiede solo una nuova implementazione di `HouseScanProvider` (vedi §3), non un redesign.

## 10. Percorso verso il reale (path to replacing mocks)

1. Implementare un `HouseScanProvider` reale (upload foto/video → job asincrono → popolamento `Observation` con `confidence` derivata da un modello, non fissa) e legarlo al posto di `MockHouseScanProvider` in `genesis.module.ts` — nessun altro file cambia per contratto.
2. Aggiungere una fase di deduplica in `GenesisService.confirmObservations`, riusando/estendendo l'euristica di `documents.service.ts` (`haveSimilarSuggestedName`) prima di creare un nuovo Asset.
3. Persistere uno step corrente esplicito su `ScanSession` o `House` per una ripresa a grana fine del wizard.
4. Popolare `estimatedReplacementYear` da un flusso reale (es. estrazione documentale) prima di dare peso pieno alla dimensione Efficienza.
5. Applicare l'isolamento per utente (dipende da B2, autenticazione reale) prima di qualunque esposizione del backend oltre l'uso locale/LAN.
