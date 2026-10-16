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
