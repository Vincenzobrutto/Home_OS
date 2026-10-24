# Riesame indipendente PR #9 su 73288e5 — 24 ottobre 2026

## Perimetro ed esito

Punta esaminata `73288e5385035235bba292630d37441c46f230c5`, non unita. Worktree nuovo `Dimora-V5-cestino-riesame-finale-20261024`, branch proprio `codex/cestino-riesame-finale-20261024`, registrato prima dei test nel commit `a8e7f13`. Letti AGENTS.md, lotti e report Claude, compresa la sezione sulle correzioni finali. Nessun cambiamento al codice prodotto, schema o migrazioni di Claude; nessun push sui suoi branch, sul consolidamento o su main.

Le riproduzioni originali C1–C4 passano e i test delle PR #14/#18 sono identici ai commit consegnati. **Non raccomando ancora il merge:** sei nuove riproduzioni falliscono per quattro rilievi P2. I nuovi profili sono aggiunti dopo la costruzione dell’aggregato, che resta invariato: non si nascondono i rossi dentro un conteggio verde.

## Rilievi, tutti P2

1. **D1 — ordine dei lock inverso nella creazione di una condivisione.** `backend-v5/src/documents/trash.ts:96`, con `sharing/sharing.service.ts:102–103` e `:29`. Lo spostamento tiene già `Document FOR UPDATE` e aggiorna `SharePreview`. `SharingService.create`, invece, blocca prima `SharePreview FOR UPDATE`, poi `previewView` richiede `Document FOR SHARE`. Due barriere indipendenti sulle transazioni riproducono `40P01` (`P2010` Prisma), non un timeout del test. Il caso è ripetuto su due cluster nuovi. La correzione C2 della vecchia revoca è efficace, ma questa scadenza delle anteprime introduce un altro ordine inverso. Allineare gli ordini mantenendo controlli di fonte e revoche atomici; niente retry per nascondere il deadlock.
2. **D2 — voci oltre 500 irraggiungibili.** `backend-v5/src/documents/trash.service.ts:100`. `list` tronca a 500 e risponde solo `{items}`, senza cursore o indicazione del limite; la query non ammette parametri di continuazione. Con 501 documenti sintetici validi una voce non è raggiungibile per il ripristino. La UI della PR #16 usa inoltre `items.length` per annunciare quanti elementi verranno eliminati, mentre `empty` considera tutte le righe. Servono continuazione e conteggio coerenti, mantenendo lo scope del solo caricatore.
3. **D3 — estratti dell’originale ancora restituiti dal profilo.** `backend-v5/src/object-onboarding/access.ts:30`, esposto da `home-objects/home-objects.service.ts:78` e dai candidati. Il controllo `confirmed` autorizza correttamente il valore canonico, ma viene poi restituito l’intero campo con `sources[].excerpt`. Dopo cestino e dopo purge, `getObject` conserva la marca confermata **e** rende ancora leggibile un marcatore sintetico che appartiene soltanto alla citazione. Controllo positivo prima del cestino incluso. Separare valore confermato e presentazione della fonte attiva, come già fa `ReceiptAssistanceService.fields` con `sourceAvailable`; il valore deve restare, l’estratto indisponibile no.
4. **D4 — profilo confermato omesso dall’export.** `backend-v5/src/personal-export/projection.ts:69`. La mappa delle fonti contiene solo documenti attivi: dopo cestino/purge `sources` è vuoto e il campo `extraction_confirmed` viene scartato interamente. Il controllo positivo esporta la marca prima del cestino; dopo resta l’oggetto ma manca la marca confermata, pur presente nella scheda. Preservare il valore con la visibilità/prova dei dati confermati, omettendo solo la citazione dell’originale indisponibile. Non estendere questa eccezione a proposte o confronti non confermati.

Riproduzioni in `backend-v5/test/document-trash-extra-review.integration.test.cjs`: due casi per D1/D2 e due fasi ciascuno per D3/D4. **0/6, tutti fallimenti di asserzione attesi sui difetti sopra**. D1 è già riprodotto su due cluster precedenti; la prova definitiva di D2 include 501 originali distinti in memoria con SHA corrispondenti e un controllo positivo di ripristino della voce nascosta quando l’id è noto. Non è una suite prodotto verde: i rossi sono la consegna al correttore.

## Correzioni C1–C4 e scope delle fonti

- C1: il corpo intake viene riconosciuto per coppia lotto/id elemento oltre che clientItemId; titolo e selezione del documento eliminato non sopravvivono. I digest e le altre voci restano.
- C2: la revoca dopo commit agisce sulle sole righe ShareRecord inizialmente bloccate e controlla lo stesso lifecycle; il replay/ripristino originale passa. D1 sopra è una regressione diversa, sulle anteprime.
- C3: `confirmedProof` è usato sia nella revisione sia nella conferma per il valore precedente; la nuova ricevuta resta vincolata alla fonte attiva. La riproduzione di riuso passa.
- C4: il ricontrollo fresco dell’export verifica anche i documentIds catturati; le riproduzioni concorrenti trash/purge passano senza restituire nomi o metadati.
- Controllati tutti i chiamanti `readableReceiptProofKeys/Proofs`: confronti/proposte usano `proposal`; gli usi `confirmed` trovati riguardano valori canonici. D3/D4 mostrano che questa separazione va completata anche nella presentazione del profilo.

## Diagnosi indipendente dei 403

`HomeMembership.validFrom` ha default PostgreSQL `now()`; `validMembership` confronta con `new Date()` di Node. Nelle due fixture segnalate il campo era omesso. Prova osservativa su cluster nuovo, senza clock finto né attese/retry: **240 campioni**, **235** date ancora future al ritorno a Node, **67** rifiuti 403 reali di `ReviewService.require`, differenza osservata **da −2 a +2 ms**. Aggiornando soltanto l’inizio delle appartenenze sintetiche a una data esplicitamente passata, i controlli passano **240/240**.

Il meccanismo è riprodotto; non attribuisco senza misura la discrepanza a uno specifico timer Windows. Il controllo del prodotto è corretto nel rifiutare una data futura: nessuna tolleranza aggiunta. La creazione pubblica delle case usa già una data Node esplicita (`homes.service.ts:33`). Nel branch di revisione propongo soltanto `validFrom: 2026-01-01` nei setup dei due test, lasciando identici asserzioni, privacy, idempotenza, gold e timeout. Il test diagnostico protegge anche i confini +1 ms, revoca e validUntil.

## Verifiche

| Verifica | Esito |
| --- | --- |
| Race PR #18, riesame PR #14, cestino | 5/5, 7/7, 16/16, cluster nuovi in sequenza |
| Aggregato sulla punta Claude con fixture originali | **513/513**: 54 HTTP, 457 diretti, 2 dopo riavvio |
| Diagnostica orologi | 1/1, 240 controlli positivi con date passate e confini rigorosi |
| Due file con la sola correzione del setup | **61/61** integrazioni, stessi assert e dati economici |
| Nuove regressioni D1–D4 | **0/6**, difetti riprodotti; non incluse nell’aggregato |
| Ordinari, onboarding, lint | **236/236**, **306/306**, lint superato; build ripetuta dal runner a ogni profilo |

Il primo tentativo dell’aggregato si è fermato a readiness: il wrapper locale aveva ereditato un preload `unit` anche sul runner, che gli impediva il GET verso la sua API temporanea. Corretto soltanto l’avvio del wrapper secondo il runner ufficiale: ambiente depurato sul padre, guardie del runner sui figli. Il tentativo successivo è verde; nessuna modifica a guardie di repository, timeout o asserzioni.

Comandi nuovi, sempre da `backend-v5` con bin PostgreSQL esplicito e scratch corta: `npm run test:membership-clock-db -- --pg-bin <bin> --scratch-root <cartella>`, `test:membership-fixtures-db`, `test:cestino-extra-review-db`. Questi profili sono separati dall’aggregato e mantengono l’ingresso obbligatorio `offline.cjs`. Solo test sintetici e cluster posseduti, nessuna AI/email, DB/API/storage reale, `.env`, migrazione reale, reset/clean o rimozione worktree. Le dipendenze già disponibili sono riusate in sola lettura e il client generato, copiato nel nuovo worktree, corrisponde allo schema identico.

## Seguito

Correggere D1–D4 mantenendo le nuove asserzioni. Le due PR Claude sono ancora precedenti al consolidamento attuale: dopo le correzioni, merge dal consolidamento a cura dell’autore e nuova verifica di integrazione. Nessun merge da questo riesame; backup e altre tipologie di cestino restano lotti separati.
