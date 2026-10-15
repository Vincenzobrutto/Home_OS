# Estrazione economica Anthropic — adapter offline

15 ottobre 2026. Incremento autorizzato: sviluppo del backend e prove senza consumo API. Nessuna attivazione del provider, nessuna nuova campagna di spesa.

## Implementato

`backend-v5/src/economy/document-anthropic.ts`: adapter prepare/decode separato dal worker. Parser PDF reale con controlli hash/pagine/limiti già esistenti; prompt economico versionato `economic-text-v1`, dati documentali trattati come non fidati, JSON strutturato, output circoscritto a bollette e fatture semplici EUR. Il modello non decide pagamenti, data di riferimento, obblighi o conferme. Campi assenti/insicuri restano assenti.

Il modello restituisce pagina ed estratto, non UUID/hash/versione del documento: questi ultimi sono assegnati localmente e le citazioni controllate contro il testo originale. Richiesta con sole pagine, senza identificatori account/Home/documento. Valuta esplicita sostenuta da citazione, documenti misti/non EUR esclusi conservativamente. Candidati di importo distinti: totale corrente/lordo, dovuto, arretrati, imponibile, imposta e righe; nessuna somma o deduzione inventata.

Preparazione strutturata riusa il trasporto Anthropic esistente tramite un metodo aggiuntivo `prepareStructured`, preservando il prompt/schema e comportamento del percorso caldaia. Verifica modello e conteggio token precedono Messages. Nessun retry automatico. `decode` verifica anche modello/usage/rifiuto/troncamento/tool calls prima dell'evidenza.

`document-evidence.ts`: equivalenza esplicita di date ISO e italiane numeriche o mese in lettere, importi a due decimali con raggruppamenti validi italiani/inglesi/spazi. Nessuna data o somma inferita; importi negativi, tra parentesi, interi senza decimali e raggruppamenti malformati non sono evidenza valida di un costo positivo. Questa verifica è riutilizzata anche dal validatore economico canonico.

## Verifiche

- Build e lint backend verdi.
- 95 test offline verdi, inclusi sei nuovi test adapter e regressioni Anthropic caldaia; log workspace `outputs/Dimora-V5-economic-anthropic-offline.log`.
- 12 test S1c PostgreSQL/storage/HTTP verdi dopo la modifica ai validatori, log `outputs/Dimora-V5-economic-anthropic-fixture-regression.log`.
- Le chiamate metadata/count/Messages dei nuovi test usano esclusivamente fetch stub; nessuna chiave caricata nei test offline, nessuna rete verso Anthropic. Parser PDF reale sui byte sintetici. Test di abort/hash corrotto/limite token impediscono dispatch; test di citazioni inventate, valute e output malformato rifiutano l'intero risultato.

API/worker pubblici conservano il rifiuto di Anthropic economico. L'adapter non è registrato nei provider Nest né collegato al worker: questa separazione è intenzionale fino al controllo del budget dedicato. Nessuna migrazione, modifica .env, riavvio dei servizi o modifica frontend in questo incremento. Database legacy, campagna M4 e contatori non modificati.

## Ancora necessario prima del collaudo a pagamento

1. Ledger economico dedicato persistente, separato dagli AiAttempt con FK ai job caldaia: riserva atomica del costo massimo, limite chiamate, esito incerto conservativo, uso effettivo e recupero senza secondo invio dopo crash.
2. Collegamento nel worker con consenso esplicito, controlli permessi/fonte immediatamente prima del trasferimento, lease/deadline e persistenza risposta prima di pubblicare la bozza. Lo start/retry deve riservare sul solo plafond economico; nessun riuso implicito della campagna M4.
3. Proiezione capabilities/modello/billing dalla disponibilità reale e adeguamento frontend al consenso per provider reale (attualmente la UI avvia solo fixture).
4. Solo dopo queste guardie, autorizzazione di importo/modello/campagna e prova live limitata su documenti sintetici, poi eventuali documenti scelti dal committente.

Non dichiarare l'analisi di bollette reali disponibile nell'app: è stato completato l'adapter offline, non la sua attivazione. Il supporto reale a scansioni/OCR, note di credito, multivaluta e impaginazioni problematiche non è incluso. L'evidenza sintattica non certifica la correttezza semantica della scelta di importo: l'utente deve sempre confermare.

## Riferimento tecnico

Formato `output_config.format` verificato sulla [documentazione ufficiale Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Lo schema limita il formato; i controlli locali su fonti, importi e permessi restano necessari.
