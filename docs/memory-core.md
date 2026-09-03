# Memory Core — audit e requisiti B47

Stato: **B47 implementato il 2026-09-03**. Questo documento conserva audit, requisiti e scelte di migrazione. `Intervention`, join multi-Asset/multi-documento, costo, timeline composta e fondazione `Warranty` sono ora nello schema; la UI completa delle garanzie resta B50.

## Obiettivo

Dimora deve poter rispondere, senza leggere testo libero o duplicare dati:

- che cosa è successo in casa e quando;
- quali Asset sono stati coinvolti;
- chi ha eseguito il lavoro;
- quali documenti lo provano;
- quanto è costato;
- quali garanzie ha originato;
- quale manutenzione programmata è stata soddisfatta.

Il record canonico è l'**intervento**, non la riga visuale della timeline. La timeline è una vista cronologica composta da interventi e da altri eventi informativi.

## Audit dello stato precedente

| Informazione | Dove vive oggi | Limite verificato |
|---|---|---|
| Data/tipo/dettaglio di un lavoro | `AssetTimelineEvent` | `eventType` è testo libero; distingue male lavori, documenti collegati e note |
| Esecuzione di un piano | `MaintenanceOccurrence` | Duplica data, contatto, documento e note anche in un nuovo `AssetTimelineEvent`; i due record non hanno una relazione |
| Tecnico | `AssetTimelineEvent.contactId`, `MaintenanceOccurrence.contactId`, `MaintenancePlan.preferredContactId` | La Rubrica conta solo `timelineEvents`; può sottostimare piani/occorrenze reali |
| Documento/prova | `AssetTimelineEvent.documentId`, `MaintenanceOccurrence.documentId` | Il DTO per un evento manuale non accetta `documentId`; API e tipo frontend della timeline non lo espongono |
| Costo intervento | nessun campo tipizzato | Gli importi esistono solo per `UtilityBill` o, incidentalmente, come `AssetCustomField` testuale non aggregabile |
| Garanzia | `Asset.purchasedAt` + `Asset.warrantyUntil` | Una sola data finale; niente durata, prova, fornitore, condizioni o garanzie nate da una riparazione |
| Provenienza/evidenza | `FieldSource`, `AssetFieldProvenance`, nuovo `EvidenceStatus` | Disponibile come linguaggio comune, ma non applicato a interventi e garanzie |
| Evento casa | `HouseTimelineEvent` | Correttamente separato dagli eventi Asset; non va unificato con gli interventi |

### Problemi concreti

1. **Doppia scrittura senza chiave comune.** Il completamento di una manutenzione crea un'Occurrence e una riga timeline nella stessa transazione, ma non è possibile dimostrare successivamente che rappresentino lo stesso fatto.
2. **Una fattura può riguardare più Asset.** B22 lo supporta già completando più piani dallo stesso documento; copiare il totale della fattura su ogni Asset moltiplicherebbe falsamente il costo.
3. **Il documento non coincide sempre con l'intervento.** Una fattura, un rapporto, una foto e una ricevuta possono provare lo stesso lavoro; il singolo `documentId` non copre il caso.
4. **La timeline è usata come database di dominio.** Una stringa pensata per essere mostrata (`eventType`) è oggi anche l'unica classificazione del fatto.
5. **Garanzia commerciale e prova sono confuse.** `warrantyUntil` dice solo una data; la provenienza del campo non equivale necessariamente al documento di garanzia.

## Modello implementato

### `Intervention`

Record canonico di un lavoro o accadimento tecnico effettuato nella casa.

Campi minimi:

| Campo | Regola |
|---|---|
| `id`, `houseId` | sempre presenti; autorizzazione tramite `HouseMembership` |
| `occurredAt` | data effettiva, obbligatoria |
| `kind` | enum: `INSTALLATION`, `MAINTENANCE`, `INSPECTION`, `BREAKDOWN`, `REPAIR`, `REPLACEMENT`, `OTHER` |
| `title` | breve descrizione utente-facing |
| `description` | dettaglio opzionale |
| `contactId` | tecnico/azienda opzionale, appartenente alla stessa casa |
| `costAmount` | `Decimal(12,2)` opzionale, mai dedotto automaticamente |
| `currency` | codice ISO 4217; default applicativo `EUR`, salvato esplicitamente quando esiste un importo |
| `evidenceStatus` | `EvidenceStatus`, default `UNKNOWN` |
| `createdByUserId`, `createdAt`, `updatedAt` | audit minimo della dichiarazione |

### `InterventionAsset`

Join tra intervento e uno o più Asset. Un intervento tecnico deve avere almeno un Asset; il vincolo viene garantito nel service/transazione. Una fattura relativa a caldaia e pompa crea un solo intervento con due collegamenti, non due costi totali duplicati.

Campi opzionali per collegamento: `role`/`notes`. L'allocazione economica per singolo Asset resta fuori dalla v1: il costo appartiene all'intervento complessivo.

### `InterventionDocument`

Join molti-a-molti tra intervento e documenti confermati della stessa casa. Prevede un `role` chiuso (`INVOICE`, `REPORT`, `RECEIPT`, `PHOTO`, `WARRANTY_PROOF`, `OTHER`) per distinguere i documenti senza cambiare `Document.docType` retroattivamente.

Invarianti evidenza:

- almeno un documento confermato collegato → `VERIFIED_PRESENT`;
- “ce l'ho ma non l'ho caricato” confermato dall'utente → `DECLARED_PRESENT`;
- “non esiste/non è stato rilasciato” esplicito → `DECLARED_ABSENT`;
- nessuna informazione → `UNKNOWN`;
- `NOT_APPLICABLE` solo per categorie per cui la prova non ha senso, mai come scorciatoia per un dato mancante.

### Collegamento a `MaintenanceOccurrence`

`MaintenanceOccurrence` resta la prova che una specifica scadenza/piano è stata soddisfatta; non diventa il record generale del lavoro. Riceve `interventionId` e smette progressivamente di duplicare contatto, documento e note.

Un intervento può soddisfare più Occurrence, necessario per B22 e per lavori che coprono più Asset. Il completamento deve creare/aggiornare intervento, collegamenti e Occurrence nella stessa transazione.

### `Warranty` (fondazione implementata, UI in B50)

Una garanzia è un'entità ripetibile, perché acquisto, sostituzione e riparazione possono produrre coperture diverse sullo stesso Asset.

Campi implementati:

- `assetId` obbligatorio;
- `originInterventionId` opzionale;
- `providerContactId` opzionale;
- `proofDocumentId` opzionale;
- `startsAt`, `expiresAt` (almeno `expiresAt` obbligatorio in v1);
- `kind`: `PURCHASE`, `REPAIR`, `EXTENDED`, `OTHER`;
- `evidenceStatus`, `notes`, audit di creazione/conferma.

`Asset.warrantyUntil` resta temporaneamente compatibile durante la migrazione, ma non può restare una seconda fonte modificabile. Il piano di implementazione deve scegliere un solo writer: una volta attivata `Warranty`, il valore riepilogativo dell'Asset è derivato dalla garanzia applicabile più lontana e non è aggiornato indipendentemente.

## Timeline e compatibilità

Non viene introdotta una tabella `Event` universale: resta valida la decisione #25 che separa `HouseTimelineEvent` dagli eventi legati agli Asset.

La timeline Asset diventa una **read model** composta da:

- `Intervention` collegati all'Asset;
- `AssetTimelineEvent` non tecnici/legacy, per esempio “Documento collegato”;
- in futuro eventuali garanzie, mostrate come milestone senza duplicarne i dati.

Ogni voce restituita dall'API deve avere `sourceKind` e `sourceId`, oltre a data/titolo/dettaglio. Il frontend non deve indovinare il tipo dalla stringa del titolo.

Le nuove scritture tecniche passano da `Intervention`; `AssetTimelineEvent` non riceve più nuovi lavori manuali o completamenti di manutenzione. Le righe storiche non vengono reinterpretate automaticamente quando il match con un'Occurrence è ambiguo.

## Flussi utente v1

### Aggiungi intervento manuale

1. Data, tipo, titolo e almeno un Asset.
2. Tecnico esistente o nessun tecnico; nessuna creazione automatica da testo AI.
3. Costo e valuta opzionali.
4. Selezione di zero o più documenti già confermati della casa.
5. Stato evidenza esplicito se non esiste un documento.
6. Salvataggio atomico; nessun aggiornamento automatico dei campi Asset.

### Completa manutenzione

1. Il piano propone Asset/soggetto e data prevista.
2. L'utente conferma data effettiva, tecnico, documenti, costo e Asset coinvolti.
3. Un solo intervento può completare più piani selezionati.
4. La transazione crea l'intervento e collega tutte le Occurrence.

### Da documento già analizzato

Claude può proporre descrizione, data, tecnico testuale e importo, ma non crea contatti, interventi, garanzie né costi. L'utente seleziona Asset, contatto/documenti e conferma. Un importo estratto è una proposta modificabile; non viene ripartito tra Asset.

## API implementate

Prima tranche implementata:

- `GET /houses/:houseId/interventions` — filtri `assetId`, `contactId`, intervallo date e testo;
- `POST /houses/:houseId/interventions` — creazione atomica con Asset e documenti;
- `GET /interventions/:id`;
- `PATCH /interventions/:id` — solo modifica esplicita utente, con controlli stessa casa;
- `GET /assets/:id/timeline` — risposta unificata e tipizzata, mantenendo temporaneamente la rotta;
- completamento manutenzione esteso con `interventionId` o payload di creazione intervento.

La cancellazione fisica di un intervento con Occurrence collegate non fa parte della v1: si valuta annullamento/rettifica con audit, per non distruggere storico.

## Migrazione implementata

1. Migrazione additiva: nuove tabelle, enum e `MaintenanceOccurrence.interventionId` nullable.
2. Backfill conservativo:
   - creare Intervention dai completamenti di manutenzione solo quando il corrispondente `AssetTimelineEvent` è univoco per Asset, data, documento e contatto;
   - lasciare `interventionId = null` nei casi ambigui;
   - non inventare costi, prove o tipi specifici da testo libero;
   - creare Warranty legacy da `Asset.warrantyUntil`; solo un documento confermato citato dalla provenienza vale come `VERIFIED_PRESENT`, altrimenti lo stato resta `UNKNOWN`.
3. Dual-read temporaneo della timeline; nessun dual-write non collegato.
4. Dopo verifica su dati reali, le nuove scritture usano solo Intervention e la UI distingue le righe legacy.

Durante il deploy la migrazione emette un riepilogo PostgreSQL con Occurrence collegate, Intervention creati, eventi legacy collegati, Occurrence lasciate legacy e garanzie presenti.

## Criteri di accettazione B47

- Un intervento collega 1..N Asset, 0..1 contatto e 0..N documenti della stessa casa.
- Il costo è numerico, con valuta, e non viene duplicato per Asset.
- Una manutenzione completata crea un solo fatto tecnico canonico e collega le relative Occurrence.
- La timeline mostra interventi e righe legacy senza doppioni noti e senza parsing del titolo.
- La Rubrica conta gli interventi canonici, non la somma di tabelle duplicate.
- Una garanzia può citare intervento e prova; più garanzie possono convivere sullo stesso Asset.
- Nessun valore AI viene scritto senza conferma; i campi Asset già presenti non vengono sovrascritti.
- Autorizzazione per-casa applicata a tutti gli ID annidati.
- I test service coprono il caso multi-Asset con documento e costo unico, l'invariante dell'evidenza, la timeline senza doppioni noti e il raggruppamento delle manutenzioni; la migrazione resta da provare sul database reale prima dell'uso.

## Fuori scope

- benchmark dei costi e confronto prezzi;
- verifica qualifiche o marketplace tecnici;
- contabilità, IVA detraibile e pagamenti;
- ripartizione automatica del costo tra Asset;
- firma digitale o valore legale della prova;
- unificazione di `HouseTimelineEvent` e `AssetTimelineEvent`;
- UI completa della “cartella clinica”, che appartiene a B50.

## Sequenza completata e dipendenze successive

1. ~~Approvare il confine `Intervention` multi-Asset e la strategia Warranty.~~
2. ~~B47a: schema additivo + migrazione conservativa e test.~~
3. ~~B47b: service/API + adattamento completamento manutenzioni/documenti.~~
4. ~~B47c: timeline unificata minima e Rubrica coerente.~~
5. B48 usa Intervention/EvidenceStatus per l'affidabilità; B49 per ricerca; B50 completa garanzie e cartella clinica.
