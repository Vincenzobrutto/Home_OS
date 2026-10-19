# Ambienti dalla planimetria — 19 ottobre 2026

Implementazione nella V5 reale della proposta desktop/mobile approvata. Ingresso da Ambienti → Da una planimetria oppure dal dettaglio di un documento classificato floor_plan. Usa l’originale autorizzato nell’archivio, senza copie pubbliche o file personali nel repository.

## Comportamento

- Proposte AI separate dagli ambienti canonici, con consenso esplicito per l’invio ad Anthropic e budget della casa già configurato. Sono osservazioni visive da verificare, non un rilievo tecnico. Nessuna misura, superficie o destinazione delle stanze senza etichette viene dedotta.
- Numero stabile per ogni punto: punto 5 → scheda 5 → nome iniziale Ambiente 5 quando il tipo non è riconoscibile. Rinomine ed esclusioni non rinumerano; i nuovi punti usano max(numero)+1. Un punto salvato non viene cancellato: si esclude.
- Desktop: originale locale con punti, zoom e aggiunta punti, elenco modificabile accanto. Mobile: Planimetria/Elenco conservano lo stesso stato, selezione dalla mappa apre la scheda corretta senza aprire la tastiera; azioni sopra la navigazione inferiore.
- Nome, tipo, inclusione, posizione e collegamento a un ambiente attivo esistente sono modificabili prima della conferma. Salva bozza persiste le modifiche sul server senza creare ambienti. Un refresh recupera la bozza salvata; modifiche ancora locali richiedono Salva bozza.
- La conferma mostra il riepilogo prima della scrittura. Creazione e collegamento avvengono in un’unica transazione, con controllo versione e ledger idempotente. Il doppio invio o due conferme simultanee non creano altre stanze. I punti confermati rimangono leggibili e aprono gli ambienti canonici.
- Un nome già presente, anche archiviato, richiede collegamento o un nome distinto. Nessuna fusione automatica per tipo o somiglianza: due bagni possono avere nomi distinti. Due punti non possono collegare lo stesso ambiente. I nomi diversi non provano che siano stanze diverse: l’identità resta una scelta dell’utente.
- Gli ambienti confermati sono condivisi secondo G1; originale, coordinate e bozza mantengono accesso per fonte/account. La bozza planimetria è separata dalle bozze oggetti e dallo stato di compilazione del documento nell’archivio.

## API e persistenza

Base `/api/v5/homes/:homeId/floor-plan-layouts/:documentId`:

| Metodo/percorso | Contratto |
|---|---|
| GET base | document `{id,name,version,sha256,mimeType}`, draft oppure null, job `{id,state,errorCode}` oppure null, rooms condivise `{id,name,type,state}`, canEdit e budget autorizzato |
| POST `/analysis` | `{consentToProviderTransfer:true}`, Idempotency-Key; 202. Riusa la coda/lease/ledger onboarding con purpose=floor_plan, prompt floor-plan-v1. Nessuna conferma automatica |
| POST `/draft` | corpo sotto; salva solo bozza, 200 |
| POST `/confirmations` | stesso corpo; conferma esplicita, 200 `{draft,created,linked}` |

Corpo salvataggio/conferma: `{expectedVersion,documentVersion,documentSha256,plan:{points,view,warnings}}`. expectedVersion=0 solo per la prima bozza manuale. Point: `{number,page,x,y,name,type,included,roomId:null|UUID}`; view `{page,x,y,width,height}`. Coordinate normalizzate rispetto all’intera pagina fisica, origine in alto a sinistra; il ritaglio cambia solo la visualizzazione. Numeri unici 1–1000, al massimo 40 punti, nomi 1–80 caratteri, tipi G1. Le segnalazioni AI salvate provengono dal server, non dal corpo inviato dal client.

Bozze in ObjectOnboardingDraft, mode=floor_plan, output.floorPlan; review conserva il piano editato, decisions mappa numero→HomeRoom.id. Non vengono lette dagli endpoint di revisione oggetti. ObjectRequest conserva richieste draft/confirm con account/home/operation/document/key/digest. Membership, accesso originale, versione/SHA e ruolo edit sono ricontrollati anche nei replay. Lock condiviso g1:home, CAS e controlli dei nomi nella stessa transazione dei nuovi HomeRoom/ObjectEvent. Nessuna cascata su oggetti, spese o attività.

Migrazione additiva `20261019090000_floor_plan_jobs`: solo ObjectOnboardingJob.purpose con default products. I job esistenti conservano il comportamento precedente. Provider visuale dedicato anche per PDF con testo, massimo 5 pagine / 5 MiB per questa analisi, stessa campagna e limiti AI. Nessun retry automatico di esiti incerti e nessuna modifica a quote o ledger storici.

## Verifica e limiti

Test mirati per numerazione, coordinate/pagine non valide, deduplica di punti AI, percorso provider visuale senza rete; integrazione su casa/account sintetici isolati per bozza senza creazione, privacy, conferme concorrenti, collisioni nomi, collegamento esistente, replay e revoca del ruolo. Test frontend per punto 5, rinomina, esclusione, alternanza delle viste e salvataggio solo bozza. 47 test backend e 3 test frontend mirati superati; build/typecheck/lint verificati.

Browser reale: scelta documento, zoom/mappa, punto 5→Ambiente 5, bozza recuperata da refresh, cambio viste mobile senza perdita dati. Conferma completa provata soltanto in casa sintetica temporanea: 4 stanze create, 1 cucina collegata, punto escluso conservato; casa, stanze, documento e file sintetici rimossi dopo la prova. Nessun ambiente creato nella casa dell’utente.

Analisi della planimetria reale eseguita una volta dopo consenso esplicito ad Anthropic: job succeeded, 8 proposte in bozza, costo ledger 0,014802 USD, nessuna modifica del budget. Cucina/bagni riconosciuti; l’AI segnala confini incerti e posizioni approssimative. Il numero di proposte differisce dai 7 punti manuali dell’anteprima: non è una conferma del numero effettivo di stanze. Serve la revisione dell’utente prima della creazione.

Non sono implementati CAD, riconoscimento metrico, perimetri editabili, matching geometrico tra planimetrie diverse o affidabilità universale del riconoscimento. Nuovi punti si possono aggiungere manualmente; le posizioni AI sono correggibili. Screenshot di collaudo e confronto visivo restano negli output locali della chat; nessun originale personale è versionato. Design QA in frontend-v5/design-qa.md.
