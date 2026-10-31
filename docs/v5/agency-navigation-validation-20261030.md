# Agenzie: collaudo del percorso planimetria, 30 ottobre 2026

Ripresa autorizzata da Vincenzo dopo la consegna delle 09:00. Questa verifica sostituisce lo stato di collaudo incompleto del [precedente handoff](agency-navigation-handoff-20261030.md), senza cancellarne le evidenze storiche. Solo branch dedicato, nessun merge o deploy e demo Alessio invariata.

## Funzionamento osservato nel browser

Stack isolato con router React effettivo, sessione/cookie/CSRF, API Nest e nuovo PostgreSQL del runner. Soltanto il provider AI e sintetico: non e una prova della qualita del riconoscimento su documenti reali. Nessun invio esterno o costo AI.

Desktop: accesso, elenco agenzie, creazione pratica, selezione e upload PNG sintetico, classificazione esplicita, consenso e avvio job via API, apertura bozza con due vani e balcone. Aggiunta di un punto su un lato e salvataggio; disegno indipendente del perimetro lordo e salvataggio; calibrazione numerica nota della fixture, categorie principali 100% e balcone 25%, computo e riapertura. Risultato **95,36 m2**, persistito con configurazione dopo ricarica. I vani del corpo principale non sono sommati nuovamente al lordo.

375 x 812: seconda pratica creata dalla UI, upload/classificazione/analisi/apertura ripetuti; aggiunta punto, disegno perimetro, categorie e computo 95,36 m2 salvati e ritrovati dopo ricarica. Anche una successiva correzione del perimetro riaperto viene salvata; questa modifica invalida correttamente il vecchio computo. Larghezza pagina osservata 360 px su viewport 375, nessun overflow della pagina. Il disegno ha scorrimento interno e zoom. Test su viewport emulato, non telefono fisico.

La fixture non contiene una barra metrica stampata: 100 pixel = 5 metri e una quota sintetica dichiarata, usata esclusivamente per collaudare la persistenza/configurazione e il computo. NON prova la lettura automatica di una barra o l'accuratezza metrica sulla planimetria reale di Vincenzo. Nel prodotto i DPI non definiscono i metri e la scala deve essere verificata sul documento.

## Correzioni emerse

- Aggiornati i due test che richiedevano assenza di Agenzie. L'ingresso e di account, separato dalle sezioni della casa; Amministratori resta assente. La route Agenzie e effettiva, non 404.
- Il workspace ora notifica il genitore solo dopo salvataggio confermato, anche dopo retry esplicito; la pagina aggiorna la revisione per la successiva azione. Un errore incerto non anticipa il callback.
- Il contratto frontend del perimetro ora corrisponde alla geometria grezza restituita dal backend. L'editor aggiunge soltanto ID stabile `gross` ed etichetta, senza inventare punti. Un perimetro persistito ha nome leggibile e si puo modificare/salvare nuovamente.
- Corretto un carattere corrotto nel messaggio di disponibilita della bozza.
- Finestra del profilo interattivo aggiornata esplicitamente per la nuova sessione; nessuna automazione notturna riavviata da questa attivita.

## Verifiche automatiche

Backend ordinario **522/522** sullo snapshot di inizio ripresa f249585, log `agency-resume-backend.log`. Primo tentativo in sandbox falliva su operazioni dei propri file temporanei/listener; ripetuto con permessi locali senza cambiare assert. L'incremento parallelo atti 332af64 ha verifiche distinte nel registro; non sommare conteggi ne attribuire 522 al suo codice successivo.

Frontend prima correzione **18/18**. Gruppo finale mirato **77/78**, otto file: i test Agenzie, i due nuovi casi di regressione e i due precedenti file con fallimenti passano; resta un timeout della vecchia navigazione Casa -> Documenti, routing.test.tsx:88. Prima esecuzione con runner concorrenti aveva anche attese fallite in altri file. Il primo passaggio completo e stato interrotto esplicitamente per non attribuire al codice finale una suite avviata prima delle correzioni; log `resume-full.log` conservato e NON presentato come esecuzione completa. Nessun test eliminato o timeout aumentato.

Regressione finale completa **1609/1609, 157 file, 832,42 secondi**, due worker e un retry massimo configurato; log `.agency-cache/resume-full-final.log`. Il risultato finale non cancella i fallimenti intermedi descritti sopra. Nessuna modifica al test precedente Casa -> Documenti, agli assert degli altri flussi o ai timeout. Typecheck app e lint mirato finali verdi dopo normalizzazione del perimetro, log `resume-perimeter-typecheck.log` e `resume-perimeter-lint.log`. Il primo typecheck rilevava metadati extra nel vecchio harness sintetico: allineato anche questo al contratto API grezzo, senza allentare i tipi.

Build frontend finale verde in 23,67 secondi, output privato `.agency-cache/production-validation`, log `resume-production-build.log`. Nessun bundle pubblicato. SHA256 uguali fra sorgente e frontend effettivamente servito per AgencyPages, workspace, client API, router e AppShell. Console browser: due warning key storici prima della normalizzazione del perimetro, nessun nuovo errore osservato dopo la correzione.

HTTP/DB 36/36 della tranche API precedente restano evidenza storica, non sono stati rieseguiti come suite in questa ripresa; nessuna implementazione backend di prodotto modificata qui. Il browser ha invece usato nuove API/DB reali nel run corrente.

## Ambiente per la prova manuale

Run `dimora-offline-qgt8oA`, separato dai servizi esistenti. URL locale `http://localhost:34873/agenzie`; account sintetico `agente@dimora.test`, password solo di collaudo `Dimora-Prova-2026!`. Agenzia di collaudo gia presente. La pratica `Verifica integrata · vani e perimetro` contiene il risultato completo; quella mobile conserva anche la successiva correzione e richiede nuovo computo.

Utilizzare soltanto il file sintetico fornito dal banner. Il provider rifiuta file diversi e non ha credenziali/rete esterna. L'avviso del trial specifica che l'AI e simulata; i controlli di consenso/quote della UI di prodotto restano visibili e non eseguono un addebito reale in questo ambiente.

Stop automatico **30 ottobre, 11:45 Europe/Rome (10:45 UTC)**. Il link funziona solo su questo computer e fino allo stop, non e un nuovo link pubblico. Il runner conserva i dati del cluster dopo l'arresto. Stop anticipato tramite file `trial-stop.json` nella cartella del run; non interrompere altri processi/DB. Nessuna disponibilita persistente promessa.

## Limiti e seguito

Restano la prova con provider effettivo e planimetria reale, configurazione dedicata e misura sulla barra reale: questa sessione non li sostituisce. Nel browser e stato provato PNG; non dichiarare verificato il verticale browser su PDF dalla sola copertura precedente del renderer. Il software non e stato integrato nel consolidamento ne pubblicato. La produzione richiede storage/budget/segreto/API key espliciti e consenso per documento, senza fallback mock.

Controllato in sola lettura il ledger locale delle precedenti prove sulla planimetria: 8 tentativi, riserve totali 4 EUR sul tetto 4 EUR, costo registrato 0,439352 USD. Un tentativo ha ancora stato `uncertain_no_retry`. Le riserve NON sono costi effettivi o conversioni EUR/USD. Nessuna nuova chiamata a pagamento, liberazione riserve, reset ledger o aumento plafond: prima della prova live occorre riconciliare il registro preesistente. Una nuova autorizzazione generica a proseguire non viene usata per aggirare il tetto.

Due piccole ruvidita osservate: il banner nuova bozza compare anche entrando con un job gia completato; dopo salvataggio la vista torna ai singoli vani. Nessuna perdita di geometria osservata; miglioramenti UX distinti, non risolti in questa tranche. Il problema di errore nella costruzione del provider prima del try del worker resta quello segnalato nel precedente handoff, fuori dalle modifiche correnti.

Screenshot nella cartella outputs della chat: `Dimora-API-collaudo-esito-375.png`, `Dimora-API-collaudo-contorni-375.png`, `Dimora-API-collaudo-perimetro-desktop.png`. Solo dati sintetici.
