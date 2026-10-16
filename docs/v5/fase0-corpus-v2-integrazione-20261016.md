# Raccolta e verifica corpus/scorer v2

16 ottobre 2026. Consegna Claude accolta con tre correzioni mirate Codex. Nessuna chiamata remota e nessuna misurazione dell'accuratezza Anthropic.

## Raccolta

Worktree Dimora-V5-Claude-Fase0-corpus-v2, branch claude/fase0-corpus-v2-20261016, baseline5285da0, pulito alla raccolta. Entrambi i commit completati e coerenti con l'incarico: 2c9c81f e 8eede88, integrati come59f6438 e d0e2e16. Nessun sync/push, modifica src/schema/package/lock o aree altrui nella consegna. File e limiti originali preservati in frontend-v5/docs/fase0-corpus-v2-20261016/CONSEGNA.md.

24 casi P01…P24 conservati; gold required/allowed/absent/future, pipeline e hash v2, adattatore versionato, scorer puro, report esplicito su provenienza e casi mancanti. Le osservazioni v1 non vengono reinterpretate. P01/P07 completi, preventivo P10 non corrente, etichetta P14 corretta, modelli P16 distinti, P20 economico con codice reale. E1…E8 implementati nel perimetro concordato.

## Verifiche indipendenti

- Prima integrazione: 24/24 test passati, zero saltati, inclusi i quattro test compilati saltati nel checkout Claude. Parser reale sui 24 input: 21 testuali coerenti con le pagine annotate e tre esiti negativi corretti. Byte dei due fixture identici al generatore reale, parità importi/date con codice compilato.
- EconomicFixtureProvider locale su P01/P07, adattatore e scorer: tutti i richiesti trovati (10 e7), un ammesso per caso, zero wrong/unexpected/unsupported/omitted e zero critici. È un provider deterministico locale, non Anthropic.
- Tre regressioni aggiunte Codex: suite completa mirata27/27 passata.
- Lint iniziale segnala tre spazi Unicode letterali nel nuovo scorer; sostituiti con escape Unicode equivalenti, senza cambiare le regole. Lint backend completo poi verde,18test puri riavviati verdi, test reale mirato di parità printedCents/printedDates verde. Nessuna nuova build runtime necessaria: nessun sorgente del servizio modificato. Non dichiarare una nuova esecuzione completa27 dopo l'ultima sola modifica lessicale.

Comando principale: node --test test/pilot-corpus.test.cjs test/pilot-score.test.cjs test/pilot-observations.test.cjs in backend-v5. Aggiunti i due nuovi file al comando npm test per non perdere le regressioni nelle esecuzioni future. Nessun lockfile o dipendenza modificati.

## Correzioni Codex

1. Due potenze corrette più la ripetizione di una di esse non devono diventare un falso conflitto: proposta classificata sui candidati distinti per valore/grandezza/etichetta, non sul numero di fonti ripetute. Il duplicato continua a non guadagnare punti.
2. Se una citazione contiene entrambi gli alias sha256/documentSha256, entrambi devono coincidere: il primo corretto non nasconde più il secondo errato.
3. documentKind errato è ora esposto anche in summary.propertyMismatches, oltre al dettaglio del caso. agreementWithAnnotations resta una misura dei fatti, non il verdetto dell'intero caso.

Nessuna di queste correzioni cambia il prodotto o la validazione dei documenti degli utenti.

## Arbitrato delle scelte aperte

- systemSafe=null sui positivi pubblicati: convalidato. Non significa sicuro; correttezza, omissioni, critici e differenze di proprietà vanno letti insieme. Un rifiuto non è un'estrazione corretta.
- Allowed come valori concreti: accettato per accordo con queste annotazioni. Un titolo alternativo ma dimostrabile può segnalare un gold troppo stretto; riesame manuale dei casi proven=true prima di classificarlo come errore del provider. Non modificare il gold dopo una campagna senza versionare e ricalcolare tutti i casi comparabili.
- providerCalled e provenance sono dichiarazioni nel file, non prova di chiamata né costo. Una futura campagna deve collegare osservazioni, hash, esiti effettivi e ledger; i file d'esempio di Claude sono costruiti a mano e non provano prestazioni live.

Restano i gap dichiarati (multipagina, prompt injection, altri formati numerici, più caldaie e casi tecnici negativi): non aggiunti silenziosamente ai24 casi. Nessuna soglia statistica o affidabilità generale ricavabile da questo campione.

## Stato e prossimo passo

Correzione del misuratore offline chiusa nel perimetro verificato. Resta da congelare la campagna sintetica rappresentativa, criteri di accettazione e budget/consenso nuovi prima di qualsiasi chiamata remota. Il precedente plafond M4 non è autorizzazione implicita. Nessun documento personale inviato, .env/quote/email/servizi/DB/sicurezza/main/legacy modificati; nessun push.

La prova personale può intanto iniziare come archivio secondo fase0-browser-collaudo-20261016.md: browser integrato account Vincenzo, creazione casa,2–3 PDF non delicati Solo io, originali conservati, backup da aggiornare dopo il lotto. Non usare l'account sintetico rimasto in Chrome. Eliminazione tecnica e ciclo copie restano aperti, Fase0 complessiva non dichiarata conclusa. Nessun lavoro automatico Codex dopo questo turno.
