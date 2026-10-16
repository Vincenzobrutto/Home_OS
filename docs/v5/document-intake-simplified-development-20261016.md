# Documenti semplificati V2 — sviluppo avviato

## Approvazione e ripartizione

Il committente ha completato e approvato la prova guidata: singolo, multiplo con conferma diretta di due selezionati, copia mantenuta/aggiornata, confronto dei dati con consenso, scansione manuale SCIA, rinvio e reload, correzione dall'archivio senza doppioni. Specifica congelata in `document-intake-simplified-spec-v2.md`, commit e769abf (successivo chiarimento del contratto API nel commit backend).

Checkout Claude creato pulito da e769abf: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-documenti-semplificati`, branch `claude/documenti-semplificati-20261016`. Incarico `outputs/Dimora-V5-incarico-Claude-documenti-semplificati-20261016.md` nel workspace principale. Avvio a cura del committente, non ancora osservato. Claude possiede soltanto componenti `src/document-intake/**` e relativo rapporto; Codex API/backend, container, integrazione e collaudo. Nessun lavoro UI dichiarato già integrato.

## Backend realizzato

Nuovi POST organizzazione diretta e GET ricevuta. Riutilizzano la stessa applicazione per documento delle conferme V1: verifica fonte, permessi, versione, consenso; scrittura organizzazione/collegamento e ricevuta nella stessa transazione. Nessuno stato intermedio saved necessario nel nuovo percorso. Ledger distinto organize, chiave stabile e digest; replay di risposta parziale completa solo gli elementi non ancora registrati. Errori noti per file, incertezza DB propagata e recuperabile. Il backend impedisce nel multiplo copia, rinvio, dati già organizzati, classificazione manuale o proposta modificata; queste richiedono revisione individuale.

Nessuna migrazione, modifica dei vecchi caricamenti o degli originali, creazione di costi, cambio visibilità o chiamata esterna. API V1 mantenute. Il servizio in esecuzione non è stato riavviato: il nuovo endpoint non è dichiarato disponibile nell'app aperta.

## Prove

- Build TypeScript backend: passata.
- ESLint dei due file backend modificati e suite di organizzazione: passato.
- HTTP Nest + PostgreSQL V5 dedicato: 16/16 test passati (15 casi più contenitore), con 6 nuovi casi V2 e 9 precedenti di regressione. Prima verificati hostname 127.0.0.1, porta 55432 e database dimora_v5_product_dev.
- Nuovi casi: singolo senza saved, scope/CSRF/input; selezione 2 su 3 e replay immutabile; esclusioni multiplo ed errore parziale; conflitto/consenso/versione e originale unico; perdita risposta dopo primo commit, GET parziale e replay senza seconde versioni; elemento/fonte cambiati e viewer.
- Fixture documentali sintetiche di metadati, non upload fisico o classificazione PDF end-to-end. Fixture create dalla suite rimosse dalla sua pulizia circoscritta. Ledger AI e numero spese invariati.
- Nessuna prova UI/browser V2 sul prodotto ancora eseguita. Le precedenti prove browser sono del mockup.

## Prossimi passi

Codex: collegare nuove callback, chiavi/ricevute nel container; avvio automatico della sola classificazione locale dopo acquisizione; test mirati del collegamento. Claude: area di lavoro e conferma diretta, selezione multipla, copie/conflitti, recupero, mobile e test componenti. Quindi integrazione dei soli commit pertinenti, build/lint frontend, regressioni mirate e collaudo browser con dati sintetici prima della prova del committente.

## Aggiornamento notturno — collegamento Codex

Il committente conferma Claude avviato e autorizza controllo ogni 30 minuti, raccolta e integrazione autonoma. Attivata nella chat l'automazione `dimora-v5-raccogli-claude-e-integra-documenti-v2`, da mettere PAUSED a integrazione/verifiche concluse. Piano operativo nel workspace `outputs/Dimora-V5-documenti-semplificati-piano-autonomo-20261016.md`. Non riattivate le automazioni precedenti.

Adapter `src/intake-integration/organization.ts` collega POST/GET organizations: conserva corpo e chiave, riconosce ricevute parziali, completa con lo stesso POST, non converte esiti mancanti o malformati in successo. Callback additive passate dal container; l'interfaccia V1 attuale le ignora finché arriva il componente V2 di Claude. Nessuna modifica ai file di sua proprietà.

Il container avvia automaticamente SOLO local_text_v1, con capability abilitata e externalTransmission false, su originali acquisiti e leggibili, con permessi edit, non ancora analizzati e senza decisioni saved/deferred/confirmed. Un tentativo automatico per file durante il montaggio: un errore/risposta ignota causa rilettura del server e avviso, non un ciclo di richieste. Reload rilegge prima lo stato del server; nessun replay di organizzazione con chiave nuova per recuperare una richiesta pendente nell'interfaccia. Avvio analisi non implica conferma delle proposte.

Verifiche: build frontend TypeScript+Vite passata; ESLint src/intake-integration passato; 9/9 test in 3 file verdi. Coprono upload aggiunto nello stesso caricamento e autoanalisi del solo file nuovo conservando quello rimandato; autoanalisi da deep link con versioni correnti; errore con refetch senza loop; ricevuta parziale e key/corpo identici; esito completo senza altre scritture; errori/mancanze senza falsi successi; esclusione fonti perse, decisioni precedenti, capability esterna o senza permessi. Si tratta di test harness/componenti/trasporto simulato, non collaudo browser/API reale del nuovo frontend.

Ultimo controllo Claude: modifiche in corso a model.ts, nessuna fase pronta ancora osservata. Il prossimo controllo deve leggere CONSEGNA.md e status/log, senza toccare il suo checkout né dedurre completamento dal dirty o da un solo commit. L'app aperta è ancora da portare al nuovo componente e il servizio API resta da aggiornare tramite launcher registrato, prima della prova reale sintetica.

## Integrazione e collaudo conclusi — notte del 16 ottobre

### Raccolta e arbitrato

CONSEGNA.md di Claude dichiara pronte tutte e tre le fasi; checkout pulito e proprietà dei file rispettata. Integrati senza sync i commit e9db445, c04b291, 8351a98, 0232845, diventati sul master 1507cbb, 1a71f25, f883e5f, 4285326. Nessun push e nessuna modifica al checkout Claude.

Codex ha collegato le callback reali, aggiornato i test e i testi del container al percorso V2, aggiunto «Modifica titolo e tipo» nel dettaglio (prepareExisting, niente upload). Per mantenere i dati attuali di un conflitto senza riscriverli, il mantenimento già usato per le copie ora accetta anche stored con organizzazione attuale e proof valide: API/versione item/permessi verificati, analisi in corso esclusa; selection nulla e nessuna nuova organizzazione/link. Il componente usa questa azione anche per il conflitto non duplicato. Il titolo di un mantenimento completato proviene dai dati conservati, non dalla proposta scartata. Test aggiunti per entrambe le protezioni.

Recepito il dubbio del committente sulle caselle: l'elenco spiega che sono disponibili soltanto sulle proposte chiare; copie, dati diversi e rinviati richiedono Rivedi/Riprendi. La ricevuta esplicita che non crea una spesa.

### Verifiche di codice e contratto

- TypeScript backend e frontend, Vite production build e lint mirati: verdi. Ultimo passaggio solo tipi/lint dell'alias del payload, senza modifica JS.
- Componenti + container: 61 test in 9 file verdi dopo integrazione iniziale. Dopo l'arbitrato del mantenimento eseguita la suite pertinente ReplaceConsent + intake-integration + routes/documents + routes/documentSearch: 69 test in 6 file verdi. I numeri si sovrappongono, non sono 130 casi distinti.
- HTTP Nest + DB V5 dedicato, suite organizzazione: 17/17 verdi; include la compatibilità V1, conferma diretta, selezione parziale, consenso/versioni, fonte persa/ruoli, risposta persa e replay same-key, mantenimento stored dall'archivio senza riscrittura. Test con metadati sintetici, non parser fisico.
- Nessuna suite generale ripetuta, nessun reset o migrazione. Servizio API aggiornato usando soltanto `outputs/Dimora-V5-Dev.ps1 -Restart`, terminato con API V5 pronta.

### Browser reale con file fisici sintetici

Chrome non disponibile in questa esecuzione. Usato il browser integrato già autenticato, in una scheda separata, senza cambiare account o aprire documenti personali. Creata via UI una casa chiaramente denominata «COLLAUDO V2 — soli documenti sintetici», indirizzo fittizio, id 604f1dea-5e33-42ef-8f3f-ae3e75cb88dd. La casa reale non è stata modificata. La casa di prova e i suoi soli cinque originali sono conservati per ispezione, non eliminati silenziosamente.

Percorsi osservati nell'app con API/DB reali:

1. Selezione fisica di cinque PDF sintetici dal file chooser. Due upload contemporanei al massimo; analisi locale automatica senza consenso/avvio separato. Quattro proposte pronte, scansione senza testo manuale.
2. Selezione APE + CILA/agibilità: un solo Organizza 2, nessun ulteriore dialogo, due completati e tre non applicati. Collezioni Energia e Pratiche edilizie.
3. Regolamento rimandato: Più tardi 1 e Riprendi ancora presenti dopo reload. Non selezionato in blocco e non riclassificato implicitamente.
4. Scansione: originale espandibile, titolo e SCIA manuali, singola conferma in Pratiche edilizie; nessuna fonte inventata. Modifica successiva dal dettaglio ritrova titolo/tipo, blocca la sostituzione senza consenso e applica dopo consenso, stesso originale.
5. Ricevuta selezionata da sola nell'elenco, archiviata in Acquisti e garanzie; zero spese/oggetti/collegamenti creati.
6. Aggiunta dello stesso APE nello stesso caricamento: copia riconosciuta, nessuna scelta preselezionata, mantenimento invariato. Sei elementi nel manifest ma soltanto cinque documenti canonici nell'archivio.
7. Modifica del titolo personale APE con consenso; nuova revisione confronta DATI ATTUALI e PROPOSTA DAL DOCUMENTO, nessuna scelta preselezionata. Mantieni i dati attuali conserva il titolo personale, stato Mantenuto invariato e versione organizzazione 2 (nessuna ulteriore riscrittura).
8. Download effettivo dell'originale della scansione dopo la modifica: 570 byte e SHA-256 identico alla fixture. L'embed PDF espone un contenitore opaco nel browser integrato: non si dichiara una verifica visuale del motore PDF o OCR.

Viewport reali 390×844 e 320×740: nessun overflow orizzontale osservato (scrollWidth 375/305); primario del dialogo a bottom 819/844 e barra selezione bottom 727/740. Fonte apribile dopo i campi. Override viewport ripristinato; console senza errori osservati.

Prove in `outputs/documenti-v2-collaudo-20261016/`: screenshot 01–04, `db-state.json`, script read-only `verify-synthetic-state.cjs` circoscritto per database e nome/id della casa. Il controllo DB verifica cinque originali private/versione 1 con hash uguali alle fixture e quattro organizzazioni (regolamento ancora rimandato), zero spese, oggetti e link impliciti. Non sono state inviate email né richieste AI o a pagamento.

### Limiti e prossimo passo

Non sono prove con telefono fisico, lettore di schermo o partecipanti non guidati; errori di rete/permessi e recupero sono coperti da harness e HTTP/DB, non indotti nel browser sull'account del committente. Nessun provider esterno abilitato. Rimangono rifiniture non bloccanti da valutare: chiamare Rivedi la correzione di una scansione già classificata (oggi Indica il tipo, campi corretti) e rendere contestuali i link legacy di analisi/ricevuta mostrati anche su documenti tecnici. Non sviluppate fuori scope.

Il flusso V2 è disponibile nell'app locale, commit d'integrazione 56b7203. Prossimo passo con il committente: provare il nuovo caricamento nella propria casa, con pochi documenti scelti da lui, senza confonderlo con la casa sintetica. Alle 23:48 Europe/Rome l'automazione di raccolta è stata impostata e verificata PAUSED perché consegna integrata e collaudo concluso; chat aperta. Le note di chiusura aggiunte in coda ai documenti root condivisi restano nel working tree, insieme al dirty precedente, per non inglobarlo nei commit V5.
