# Planimetria digitale su una casa esistente — 3 novembre 2026

## Risultato e perimetro

Su richiesta esplicita del proprietario è stata aggiunta la planimetria digitale alla sua casa reale già presente nell'ambiente locale. Account, casa e originale sono stati identificati e verificati prima dell'intervento; i relativi identificativi, documenti, geometrie, impronte personali e manifesti rimangono esclusivamente nelle evidenze private locali.

Lotto `codex/home-plan-backoffice-20261103`, base comune `3335ea9`, prodotto verificato `d42459cc533f90e73db171408f4a530ba0783bff`. L'importatore è un'operazione interna controllata: **nessun nuovo endpoint pubblico, ruolo amministrativo o schema proprio**. Riusa la tabella HomeDigitalPlan e gli accessi/audit già presenti nel comune. Non esegue una Gift, non crea una nuova casa e non attiva benefici o servizi AI.

**Importazione reale, delta, runtime web e UI autenticata desktop verificati.** Nessun trascinamento reale o nuovo collaudo mobile reale effettuato durante questo intervento.

## Collegamento alla casa e dati preservati

- **11 regioni digitali associate esplicitamente a 11 stanze esistenti.** Nessuna stanza creata, rinominata o sostituita dall'importazione.
- Conservate tutte le **12 stanze** e i **6 oggetti** già presenti: 5 attivi e 1 archiviato. La stanza non rappresentata da un contorno rimane disponibile nelle normali schede.
- I **5 oggetti attivi** sono disponibili nel modello: **4 mostrano segnaposti indicativi** perché già associati a stanze rappresentate; **1 resta “Da collocare”** perché privo di una precedente associazione a stanza. L'oggetto archiviato è escluso dalla mappa. Non sono stati creati cinque pin né assegnata automaticamente la stanza mancante.
- Collocazioni canoniche degli oggetti invariate. Non vengono inventate coordinate fisiche o spostati gli elettrodomestici durante l'importazione; gli eventuali segnaposti indicativi continuano a essere letture del normale modello Ambienti.
- Fonte ammessa mediante il **normale caricamento e un controllo Windows Defender effettivo**, non uno scanner simulato. La mappa è vincolata al documento locale corrente, alla sua versione e all'impronta dei byte.
- Per le **68 tabelle preesistenti** sono state verificate le impronte delle righe e colonne precedenti; **329 originali preesistenti** mantengono le proprie impronte. Il controllo dopo l'avvio conferma anche stanze, oggetti e collocazioni. Nel controllo prima del successivo login, la normale lettura della sessione aveva creato una sola sessione ospite: le righe Session precedenti sono state confrontate separatamente e risultavano invariate. L'accesso successivo usa il normale flusso di autenticazione, distinto dall'importazione. Nessun backfill dei dati personali.
- Il delta previsto comprende un documento con versione, file e ricevuta di caricamento, un audit e una ricevuta dell'importazione e una mappa. Nessuna scrittura aggiuntiva su stanze, oggetti o collocazioni.

## Qualifica della planimetria

È una **ricostruzione in bozza, non verificata**: conserva i contorni disponibili e ricostruisce un corridoio documentato nello storico locale. Non viene presentata come esportazione esatta del precedente salvataggio né come nuova inferenza AI. Le ulteriori candidate automatiche non adottate non sono promosse implicitamente a vani confermati.

Il layout importato mantiene `qualification:unverified`, `calibration:null` e `mainPerimeter:null`. Non dichiara una scala o superficie verificata, un totale commerciale, completezza o conformità. La precedente evidenza della barra metrica resta distinta dalla revisione dei contorni. I caveat indicano l'importazione tecnica e il controllo ancora necessario di contorni e ambienti; non viene fabbricata una revisione dell'agenzia o una ricevuta Gift.

## Contratto dell'importatore interno

Implementazione: `backend-v5/src/home-maps/operator-import.ts`, classe HomePlanOperatorImporter.

- `preview(accountId, homeId, input)` produce il fingerprint dell'anteprima e il riepilogo dei collegamenti, senza scritture.
- `apply(accountId, homeId, input, expectedFingerprint, key)` applica lo stesso manifesto soltanto se il contesto è ancora corrente.
- Il manifesto esatto contiene account atteso, documento/versione/impronta, snapshot digitale, binding espliciti per ogni regione, motivo e provenienza della ricostruzione. Nessuna associazione fuzzy o desunta automaticamente dal nome.
- Ogni regione usa una stanza attiva della stessa casa, una sola volta, oppure una creazione esplicitamente dichiarata. La possibilità di creare una stanza è coperta dai test; nell'intervento reale non è stata usata.
- Owner e account atteso, membership corrente, visibilità della fonte, tipo PDF, versione e byte fisici sono ricontrollati anche prima di restituire un replay. Essere owner non concede lettura dei documenti privati caricati da altri.
- Il fingerprint include fonte e snapshot, scelte, contesto della casa e inventari pertinenti di stanze, oggetti, collocazioni e mappe. Un cambiamento richiede una nuova anteprima.
- Riusa i lock canonici della casa. Mappa, eventuali nuove stanze, audit e ricevuta sono atomici; stanze e oggetti esistenti non sono aggiornati. La fonte viene ricontrollata anche dopo le scritture, prima del commit.
- ObjectRequest fornisce idempotenza scoped per attore/casa/documento/operazione; la stessa chiave con contenuto diverso è un conflitto. Una chiave diversa non sostituisce né duplica una mappa esistente. ObjectEvent registra una importazione tecnica con provenienza e qualifica di bozza.
- Gli ID di regione riservati `__proto__`, `constructor`, `prototype` sono rifiutati prima di qualsiasi accesso DB: la serializzazione JSON non garantisce la conservazione di queste chiavi. Il contratto DigitalPlan generale resta invariato.

## Preparazione e aggiornamento locale

Prima di avviare o aggiornare il prodotto sono state verificate una copia fisica fredda del cluster, una copia logica con controllo di leggibilità e una copia degli originali con verifica delle impronte. L'eventuale recupero WAL ordinario resta distinto da un ripristino o da un reset del database; nessun ambiente dimostrativo scaduto è stato ripristinato come utenza reale.

Applicate **8 migrazioni già presenti nel ramo comune**, senza riscrivere lo storico di Prisma. Due vecchie migrazioni avevano terminatori misti: sono state recuperate le copie storiche con byte esattamente corrispondenti alle impronte applicate e verificata l'identità SQL dopo la sola normalizzazione dei terminatori. Nessuna differenza semantica, modifica di `_prisma_migrations`, risoluzione forzata o azzeramento dello storico.

Il runtime locale è attivo dalla fonte verificata `d42459c`, in un checkout di rilascio detached, con API loopback3011 e frontend5174. Verificati manifesti e impronte di **216 file compilati, 27 file generati e 383 asset**, identità dei processi e risposte frontend200/proxy401. Le sonde delle operazioni AI, email e Gift sono respinte con403.

La modalità manuale conserva le normali operazioni Home e mappa con autenticazione e CSRF. Durante l'intervento e il collaudo sono sospesi tutti i worker, la coda locale e le pulizie automatiche; nessun lavoro arretrato è avviato implicitamente. Nessuna nuova chiamata AI, spesa o email per questo intervento. Nessuna modifica a main o alla demo pubblica Alessio.

Un primo preflight si è fermato sulla rappresentazione delle date nei manifesti: il lettore è stato corretto prima dell'avvio e le8guardie pure rieseguite. La prima sonda HTTP senza richiesta HTML riceveva404; è stato corretto il verificatore distinguendo pagina HTML e proxy API, senza cambiare il server attivo. Il controllo successivo all'importazione presumeva erroneamente sei oggetti attivi: la lettura ha confermato cinque attivi e uno già archiviato. L'importazione era già committata e **non è stata ripetuta**.

## Verifiche eseguite

| Verifica | Esito | Ambito |
| --- | --- | --- |
| Backend ordinari | **894/894** | Include i 5 casi puri dell'importatore |
| DB/API mappa e importatore | **33/33** | Nuovo cluster sintetico `m9qhWO`, poi arrestato |
| Frontend interessato | **43/43** | Mappa e integrazione Ambienti; non una nuova suite frontend completa |
| Typecheck, lint e build | **Verdi** | Fonte prodotto verificata |
| Guardie operative pure | **8/8** | Programmi privati; nessuna connessione o scrittura reale da questi test |
| Delta reale | **Verificato** | Collegamenti e dati preesistenti preservati come sopra |
| Runtime web locale | **Verificato** | Manifesti/processi/proxy, frontend200 e blocchi403; modalità manuale |
| UI autenticata della casa | **Desktop verificato** | Schede12, mappa11regioni, PDF/overlay/caveat e ricarica;4segnaposti indicativi e1oggetto da collocare |
| Trascinamento e mobile reali | **Non eseguiti** | Nessuna modifica di collocazioni o nuova prova reale a375px durante questo intervento |

I test DB usano esclusivamente cluster nuovi posseduti; l'ambiente reale è stato usato per l'intervento richiesto e la verifica del relativo delta, non come banco di prova. Le regressioni coprono riuso/creazione esplicita, versione fonte superiore a uno, permessi e fonte privata, inventario cambiato, replay/concorrenza, conflitti, file mancante o alterato e rollback imposto.

Il primo run DB ha evidenziato fixture non conformi ai contratti reali di ruolo, cestino e rifiuto sincrono: corrette preservando le asserzioni. Il secondo ha rilevato la perdita della chiave riservata nella serializzazione: il manifesto è stato irrigidito e sono state aggiunte regressioni di rifiuto senza scritture. Non presentare questi tentativi come suite verdi; il risultato finale è quello della tabella.

## Collaudo UI desktop concluso

L'accesso è riuscito attraverso il normale pulsante Accedi, usando credenziali già disponibili nel browser, senza leggere la password, creare nuove credenziali o fabbricare una sessione di bypass.

Verificate la normale vista Schede con **12 ambienti**, la planimetria con **11 vani**, il PDF sorgente con sovrapposizione visivamente allineata e il caveat di bozza visibile. I cinque oggetti attivi restano disponibili: quattro hanno un segnaposto indicativo nelle stanze già associate; quello senza stanza resta “Da collocare”. L'archiviato non è esposto sulla mappa. Nessuna associazione fuzzy o posizione è stata scritta per completare il disegno.

Una ricarica riapre la mappa conservando gli stessi conteggi e collegamenti. Screenshot conservato soltanto nelle evidenze private fuori Git. Il controllo visivo non certifica correttezza o completezza dei contorni; la qualifica della bozza resta invariata.

Non sono stati eseguiti trascinamenti o spostamenti reali, né una nuova prova dell'utenza reale a375px. I test sintetici di spostamento e le verifiche frontend restano distinti da questo collaudo desktop autenticato.

## Sfondo originale facoltativo

Seguito richiesto dal proprietario, stessa [PR78](https://github.com/Vincenzobrutto/Home_OS/pull/78), frontend prodotto `f243516da63874b6545f1c208b59ec8e580f5cd6`: il comando “Mostra planimetria originale” è attivo all'apertura. Disattivandolo si nasconde soltanto il canvas raster; frame, contorni, oggetti e controlli restano montati, senza cambiare zoom, coordinate o associazioni. La scelta vale per la vista corrente e torna attiva riaprendo la mappa. Nessuna preferenza, geometria o posizione viene scritta sul server.

Il caricamento e la verifica del rapporto della pagina restano obbligatori anche con sfondo nascosto. Nascondere il raster non aggira errori di lettura o di frame e non avvia una nuova rasterizzazione quando lo si riattiva.

Verifiche del seguito: **45/45 test del gruppo mappe**, compresi due casi sul componente reale per frame/coordinate invarianti, identità del canvas e mancata ripetizione del rendering; errori di frame continuano a bloccare il disegno anche da nascosto. Typecheck, lint mirato e build verdi. Il primo setup dei nuovi casi non prevedeva `Image.decode` assente in JSDOM: corretto il solo adattatore sintetico. Nessun nuovo test backend o DB necessario/eseguito per questa modifica visiva; i conteggi precedenti rimangono distinti.

Aggiornato soltanto il frontend locale con build e fonte congelate, mantenendo API `d42459c`, processo PostgreSQL, sessioni e guardie originali. Verificati HTML, asset e proxy e preservati i blocchi AI/email/Gift. Controllo visivo nella casa autenticata: sfondo inizialmente visibile, disattivazione, zoom, ripristino dell'originale allo stesso zoom e nuova disattivazione; contorni e quattro segnaposti restano visibili. Nessun salvataggio di oggetti o geometria. Nessuna nuova verifica a 375 px dichiarata. Il controllo browser dedicato era temporaneamente indisponibile; la verifica è stata completata tramite la superficie nativa della stessa app, con screenshot privato fuori Git.
