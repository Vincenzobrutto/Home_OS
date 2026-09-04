# Dimora — MVP v1 (Private Alpha)

Fonte di verità per lo **scope di rilascio** della prossima fase. Non sostituisce `docs/vision.md` (che resta la descrizione del prodotto completo) né `docs/roadmap.md` (che resta l'ordine di sviluppo di lungo periodo): questo documento definisce **cosa è visibile a un utente reale della private alpha**, distinto da cosa è già costruito nel backend/frontend. Vedi `decisions.md` #51 per la motivazione della scelta.

## 1. Obiettivo

Consentire a un proprietario di:

1. creare la propria casa;
2. caricare o fotografare un documento;
3. ricevere una proposta AI;
4. confermare Asset, dati, intervento o garanzia;
5. ritrovare tutto successivamente cercando per Asset, documento o tecnico.

L'MVP deve dimostrare che Dimora è più utile di una cartella Drive perché collega i documenti alla storia fisica della casa.

**Nota tecnica**: questo percorso esiste già ed è verificato — è la pipeline costruita e testata dal vivo in B47-B50 (documento → estrazione AI → conferma → Asset/Intervention/Warranty → ricerca globale). L'MVP non richiede di ricostruirlo: richiede di **nascondere tutto ciò che lo circonda** e di colmare un piccolo numero di lacune concrete elencate in §8.

## 2. Utente iniziale

Proprietario di una singola abitazione che possiede documenti sparsi tra carta, email e cartelle digitali.

Primo segmento consigliato:

- proprietario tra 35 e 65 anni;
- casa con caldaia, climatizzatore ed elettrodomestici;
- almeno 3–10 documenti disponibili;
- nessuna necessità di competenze tecniche o catastali.

Prima versione destinata a una **private alpha con 15–20 utenti reali**, non ancora a un lancio pubblico indiscriminato.

## 3. Promessa utente

> "Fotografa o carica un documento. Dimora capisce a cosa appartiene e costruisce la memoria della tua casa, sotto il tuo controllo."

Non promettiamo:

- conformità normativa;
- certificazione dei dati;
- diagnosi degli impianti;
- risparmio energetico;
- scansione automatica della casa;
- aggiornamenti autonomi senza conferma.

## 4. Percorso principale

### Primo accesso

1. Registrazione o login.
2. Creazione casa con nome, comune, eventuale indirizzo.
3. Schermata iniziale con una sola azione dominante: **"Aggiungi il primo documento"**.

Niente wizard Genesis a sei passaggi nel percorso reale — l'onboarding passa dal flusso Documenti (Inbox), non dalla scansione guidata. Il wizard Genesis resta accessibile come **modalità demo interna**, non come primo accesso: non esiste oggi un provider di scansione "reale" (foto targhetta → estrazione) diverso dal mock a catalogo fisso (`MockHouseScanProvider`, vedi `decisions.md` #44), quindi usarlo come onboarding reale mostrerebbe dati inventati a un utente vero. Il flusso Documenti non ha questo limite: l'estrazione è già reale.

### Acquisizione

L'utente può scattare una foto, caricare PDF o immagine, eventualmente aggiungere più file dello stesso intervento. Gmail e Drive non sono necessari nella prima alpha.

### Analisi e conferma

Dimora propone tipo di documento, Asset esistente o nuovo, ambiente opzionale, marca/modello/seriale/date, intervento associato, tecnico, costo, eventuale garanzia. L'utente corregge e preme **"Conferma"**.

Restano invarianti (già vere nel codice, non da introdurre):

- l'AI non salva direttamente;
- i campi Asset già valorizzati non vengono sovrascritti;
- un documento ambiguo rimane da classificare;
- nessuna informazione viene inventata per completare la scheda.

### Risultato

Dopo la conferma viene mostrata la scheda dell'Asset: informazioni essenziali, documenti collegati, cronologia degli interventi, costo, garanzie, prossimo promemoria se presente, provenienza delle informazioni. Già costruita (B38/B47/B50).

### Recupero

Ricerca globale, elenco Asset, documenti recenti, promemoria in Dashboard. Obiettivo: ritrovare un documento o l'ultimo intervento in meno di 30 secondi. Già costruito (B49).

## 5. Navigazione MVP

| Voce | Decisione | Stato tecnico |
|---|---|---|
| Home | Mantenere e semplificare | Esiste; da alleggerire (nascondere le card dietro flag, vedi sotto) |
| Documenti (ex Inbox) | Mantenere, rinominare | Esiste |
| Asset | Mantenere | Esiste |
| Cerca | Mantenere, molto importante | Esiste (B49) |
| Ambienti | Mantenere solo come classificazione semplice | Esiste la vista a blocchi; la vista planimetria va nascosta, non la voce di nav |
| Planimetria (disegno forme) | Nascondere | Da nascondere dietro flag dentro Ambienti |
| Profilo casa completo | Nascondere | Da nascondere dietro flag |
| Energia e confronto YoY | Nascondere | Da nascondere dietro flag |
| Rubrica separata | Nascondere come voce di nav; tecnico accessibile dagli interventi | **Gap reale**: `AddContactModal` oggi si apre solo da `ContactsView` — serve un ingresso alternativo per creare un contatto dal form Intervento/Garanzia, altrimenti in alpha non si può aggiungere un tecnico nuovo (vedi B59) |
| Genesis demo | Spostare in modalità demo interna | Da spostare fuori dal nav principale |
| Home Score e trend | Nascondere nell'alpha | Da nascondere dietro flag |
| Home Detective | Solo suggerimenti semplici e contestuali | **Da decidere**: quali delle 8 regole restano visibili in alpha — non assumere, è una scelta di prodotto separata da fare prima di implementare |
| Compliance ("Stato adempimenti") | Non esporre | Da nascondere dietro flag (appena costruita in B44) |
| Gmail/Drive | Rinviare dopo la validazione dell'upload manuale | Da nascondere dietro flag |

Navigazione visibile in alpha: **Home · Documenti · Asset · Cerca**.

## 6. Funzionalità incluse

Autenticazione; una casa per utente nell'interfaccia (il modello dati resta multi-casa); upload e foto da mobile; estrazione AI; revisione e conferma; creazione/collegamento Asset; documenti della casa non collegati ad Asset; interventi canonici; garanzie; ricerca globale; promemoria essenziali in-app; provenienza ed evidenza; visualizzazione mobile.

Il modello dati continua a supportare multi-casa, stanze, contatti e manutenzioni complesse: non va rimosso dal backend, solo non esposto per intero in UI.

## 7. Funzionalità esplicitamente fuori MVP

Scansione demo con Asset fittizi; disegno della planimetria; integrazione Gmail/Drive; consumi energetici; confronto YoY; Home Score e trend; check-up normativo; regole regionali; condivisione multiutente; notifiche email/push; IoT; agente conversazionale; trasferimento della casa; marketplace e benchmark costi.

Nessuna di queste viene cancellata: restano nel codice, nascoste dietro feature flag o mantenute in modalità demo.

## 8. Requisiti indispensabili prima dell'alpha

Verificati uno per uno nel repository (non un elenco generico) — quelli marcati **nuovo** non esistono oggi in nessuna forma:

| Requisito | Stato |
|---|---|
| Flusso mobile completo verificato | Da testare end-to-end sul percorso ridotto |
| Gestione chiara degli errori AI | **Nuovo**: oggi un fallimento di parsing Claude risale come `InternalServerErrorException` tecnica ("Risposta del modello non era JSON valido"), non un messaggio comprensibile con percorso di correzione manuale |
| Limite dimensione e formati upload | **Nuovo**: `FileInterceptor` oggi non ha alcun `limits`/filtro mimetype configurato |
| Privacy informativa e consenso all'elaborazione AI | **Nuovo**: nessuno schermo, nessun campo di consenso esiste |
| Eliminare documento e account | Documento: parzialmente presente (ignora/rimuovi collegamento). **Account/casa: nuovo** — nessun endpoint `DELETE` per `House`/`User` esiste; le relazioni da `User` sono miste `SetNull`/dirette, va progettato quale cancella cosa prima di esporre l'endpoint |
| Export minimo dei propri dati | **Nuovo** — anticipa parte di B51 (P1) come prerequisito, non più rimandabile a dopo l'alpha |
| Backup database | Da verificare separatamente con l'infrastruttura di hosting scelta — non uno stato del codice applicativo |
| Logging senza documenti, token o dati sensibili | Verificato ora: nessun logging esplicito di body/token/documenti trovato nel codice attuale — nessuna azione necessaria, solo da ricontrollare se si aggiunge logging futuro |
| Token OAuth non coinvolti se Gmail/Drive restano disabilitati | Conseguenza automatica di §5 (Gmail/Drive dietro flag): nessun lavoro dedicato |
| Test end-to-end del percorso principale | **Nuovo**: l'unico file `*.e2e-spec.ts` esistente è il boilerplate di default di NestJS ("Hello World"), non copre alcun flusso reale |
| Nessuna regressione dell'isolamento tra case | Già garantito da `AccessControlService.assertHouseAccess` su ogni rotta (B2) — da ri-verificare con test e2e, non da ricostruire |

## 9. Criteri di accettazione

L'MVP è pronto quando un nuovo utente può: creare la casa senza assistenza; caricare una foto dal telefono; confermare il risultato entro 3 minuti; ottenere un Asset con documento collegato; aggiungere successivamente una fattura allo stesso Asset; vedere intervento, costo e garanzia senza duplicazioni; ritrovare il documento tramite ricerca; comprendere quali dati vengono dall'AI e quali ha confermato; eliminare o esportare i propri dati.

## 10. Metriche della private alpha

Almeno 70% degli utenti carica il primo documento; almeno 60% conferma il primo Asset; tempo mediano al primo risultato inferiore a 5 minuti; almeno 40% carica un secondo documento entro 7 giorni; almeno 80% riesce a ritrovare un'informazione senza aiuto; meno del 10% delle proposte richiede l'abbandono completo; zero scritture AI senza conferma.

## 11. Backlog tecnico derivato

Vedi `docs/backlog.md` B52-B59 per le voci concrete di ridimensionamento (flag di navigazione, cancellazione account, export minimo, consenso privacy, limiti upload, gestione errori AI, ingresso contatto senza Rubrica, suite e2e).
