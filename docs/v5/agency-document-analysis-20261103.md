# Analisi documentale nativa Agenzie — 3 novembre 2026

## Obiettivo e stato

Lotto `codex/agency-document-analysis-20261103`, successivo all'integrazione Gift PR76. Collegare atto, successione e visura del fascicolo a condizioni/consenso, job durevole, lettura testuale autorizzata, proposte citate e revisione esistente. Nessuna AI reale o spesa autorizzata da questo lotto; nessun deploy, main, demo Alessio o servizio esistente modificato.

**In lavorazione:** moduli, persistenza, API e interfaccia scritti; verifiche complete di integrazione ancora da eseguire. La prima esecuzione pura ha superato 29/29 casi prima degli ultimi irrigidimenti e degli otto test HTTP. Non presentarli come collaudo finale del lotto.

## Esperienza nell'app

Area Agenzie → pratica → Dati, fonti e verifiche → Apri dati e verifiche → Analizza atto o visura. La classificazione della fonte determina i campi ammessi. L'agente sceglie documento e pagine fisiche, legge condizioni e limite, autorizza e avvia. Stato e chiave sono riconciliabili dopo una risposta perduta; ricarica/polling non eseguono POST automatici. Le proposte aprono il pannello esistente: citazione, associazione esplicita a persona/unità, poi decisione sul fatto. Non sono fatti già confermati o certificazioni.

Il runtime senza configurazione e budget documentale attuali mostra indisponibilità; lo storico autorizzato resta leggibile. Non esiste fallback fixture nel prodotto. I provider sintetici sono soltanto dependency injection dei test, vincolati agli SHA delle fixture.

## Contratto e persistenza

- Scopo `DOCUMENT_EXTRACT`, distinto dal budget delle planimetrie e dalla vecchia riserva di 4 EUR. Valuta, modello, tariffe input/output, eventuale costo del conteggio e massimale sono espliciti. Nessun tasso di cambio o modello/prezzo implicito.
- Offerta immutabile: attore/pratica, fonte/versione/SHA/tipo, pagine fisiche, configurazione, prompt, contratto campi, massimale e scadenza. Il consenso indica esattamente quell'offerta.
- Ammissione atomica con prenotazione e chiave/idempotenza per attore. Un'unica prova attiva/incerta anche fra attori/chiavi/configurazioni impedisce reinvii alternativi.
- Marker durevole prima di conteggio e generazione, lease con epoch e capability, coda riscoperta da SQL. Nessun lavoro esterno sotto lock SQL. Un marker incerto non autorizza retry o rilascio automatico della prenotazione.
- Conteggio noto riprendibile soltanto prima della generazione mai inviata. Una risposta tardiva viene contabilizzata ma non riapre una quarantena. Finalizzazione di accounting/job/proposte nella stessa transazione.
- Membership, grant e accesso alla fonte rivalutati per fase. Revoca, cambio documento/configurazione o lease scaduta impediscono pubblicazione; la contabilità interna può conservare il costo noto senza rendere il contenuto leggibile.
- Ordine lock ordinario: membership/grant/pratica → budget → job/dispatch. Lo storico del solo attore richiede lettura, non export; avvio e lavoro richiedono gestione.

Nuova migrazione additiva `20261103130000_agency_document_analysis`: budget, offerte, job e dispatch dedicati. Nessuna API pubblica per attribuire budget o dichiarare un risultato provider attendibile.

## API

Sessione normale e controlli Origin/CSRF sulle mutazioni, no-store e DTO esatti:

- `GET /agencies/:agencyId/practices/:practiceId/deed-analysis-options?sourceId=…&expectedSourceVersion=…&pages=1,2`: condizioni e disponibilità; nessun invio provider o prenotazione.
- `POST …/deed-analysis-jobs`, header `Idempotency-Key`, body `{expectedRevision, sourceId, expectedSourceVersion, pages, offerId, approved:true}`.
- `GET …/deed-analysis-jobs`: storico del chiamante.
- `GET …/deed-analysis-jobs/lookup`, stesso header: recupero durevole senza nuovo avvio.
- `GET …/deed-analysis-jobs/:jobId`: stato minimo del job, nessun testo o credenziale.

Le route esistenti `deed-proposals`, bindings e review restano il percorso delle proposte; il browser non può attestare testo decodificato, risultati, prezzi o proof server.

## Limiti deliberati

Prima versione per PDF nativi testuali, massimo 10 MiB, 20 pagine e limiti del decoder esistente. PDF scansiti, misti con pagine prive di testo o non supportati sono indisponibili: nessun OCR reale incluso. Il provider riceve il testo delle sole pagine scelte, conservandone i numeri fisici.

Il contratto riusa i sei campi letterali esistenti per atto/successione; visura ammette i quattro identificativi catastali e nome con ruolo irrisolto. Non ricava data dell'atto da una data di visura o proprietario attuale da un soggetto storico. Citazione letterale verificata non dimostra significato o validità giuridica. Catalogo esteso e normalizzazioni restano successivi.

Trasporto HTTP predisposto e verificabile con fetch iniettato, senza chiamate esterne di collaudo. Attivazione reale richiede configurazione server, budget attuale, consenso specifico e successivo collaudo autorizzato. Generazione incarico resta bloccata senza modello dell'agenzia approvato.

## Verifiche da concludere

Suite pure aggiornate, nuovo DB/API isolato e arresto, UI con perdita risposta/ricarica/consenso e collaudo browser desktop/375 px. Risultati e hash finali saranno registrati qui, distinguendo qualsiasi failure e successiva riesecuzione.
