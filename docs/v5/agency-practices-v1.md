# Fascicolo Agenzie v1 — nucleo di dominio

30 ottobre2026. Implementazione locale in branch `codex/agenzie-fascicolo-20261030`, base remota `dd52a6a`. Non distribuita. Nucleo puro completato; secondo incremento aggiunge schema e adapter interno, senza endpoint HTTP né attivazione sui DB esistenti.

## Accessi

Ogni azione richiede due diritti attivi: appartenenza all’agenzia e assegnazione alla specifica pratica. Entrambi hanno validità temporale; revoca/scadenza hanno effetto a ogni richiesta, non solo durante login. Il ruolo admin non concede accesso implicito alle pratiche e non legge originali privati altrui. Viewer legge soltanto. L’export ha un permesso distinto.

I documenti possono essere privati all’account che li ha caricati oppure visibili alla pratica. La membership Home del proprietario non concede diritti sulle pratiche di agenzia. Identificativo noto e hash uguale non sono autorizzazioni; nessuna deduplica fra account che riveli un documento privato.

Le funzioni `requirePractice`, `sourceReadable`, `visibleSources`, `evidenceCurrent` accettano dati caricati dal server. Non sono autenticazione HTTP né verifica del formato dei file. Il futuro adapter deve valutare i diritti correnti nel DB, ricontrollarli a fine job/export, e proiettare soltanto la risposta autorizzata. Non restituire `Outcome.practice`: è un aggregato interno e contiene anche dati non visibili al richiedente.

`practiceSummary` è una proiezione limitata ai file effettivamente leggibili: non include ricevute, hash, prove o conteggi di fonti private altrui. `exportManifest` richiede selezione esplicita di1..50snapshot, vieta duplicati e più di100MiB, controlla tutte le autorizzazioni prima di restituire metadati e rifiuta l’intera selezione se una fonte manca o non è accessibile. Nessun download o ZIP generato in questo lotto. Il futuro endpoint deve rivalutare gli stessi permessi subito prima della consegna.

## Ricezione e versioni

`attach` registra metadati di un originale già verificato da un adapter, senza leggere bytes o storage. Richiede fingerprint SHA256, MIME ammesso, dimensione1..20MiB, nome senza percorsi e visibilità esplicita. Non analizza il documento e non accetta una classificazione già confermata come parte dell’upload.

`classify` è una decisione esplicita sul tipo. `replace` aggiunge un nuovo snapshot, conserva il precedente, azzera la classificazione e rende obsolete le dipendenze della fonte. Hash identico non è una nuova versione. `withdraw` nega nuove letture/export e invalida i dipendenti, ma non cancella bytes né decide la conservazione legale. Si tratta di un ritiro dalla pratica, non del cestino Home del prodotto.

L’originale di agenzia è modellato come fonte distinta dalla Home: l’eventuale collegamento/copia alla Home deve essere un futuro trasferimento autorizzato, non un’espansione di `Document.visibility`. Questa scelta permette di non alterare i permessi già implementati per la Home e di non riciclare la relazione1:1 delle versioni del documento attuale.

## Concorrenza e replay

`applyRequest` è una transizione pura: non muta l’aggregato ricevuto. `expectedRevision` protegge l’intera pratica, `expectedSourceVersion` la fonte; il ledger è delimitato ad account e pratica. Stessa chiave e stesso payload canonico restituiscono la ricevuta precedente senza nuovi eventi. Payload diverso con la stessa chiave genera conflitto. Autorizzazioni rivalutate prima del replay; un replay non rianima fonti ritirate. Eccezione esplicita: la ripetizione identica del ritiro può restituire la sua ricevuta, senza rendere il file leggibile.

Questi test dimostrano le transizioni sequenziali e il rifiuto di revisioni obsolete. Non dimostrano serializzazione reale del DB: il futuro adapter deve racchiudere lettura, controllo revisione, scrittura e ledger in una transazione con lock/CAS e vincoli univoci. La prova concorrente DB è ancora da fare.

## Evidenze e limiti

Ogni prova collega fonte/versione/SHA, pagina positiva ed estratto non vuoto; il riferimento deve corrispondere alla versione corrente autorizzata. Il nucleo non verifica ancora che il testo sia effettivamente presente nei byte o che pagina e regione siano dentro il PDF. Questi controlli spettano all’estrazione/adattamento, e la conferma umana resta distinta.

Nessuna AI, OCR, verifica di proprietà/conformità, produzione incarico, UI o upload HTTP aggiunti. Nessun cambiamento alla demo di Alessio. I dati dei test sono sintetici.

## Persistenza interna — secondo incremento

Migrazione additiva `20261030001000_agency_practices`: Agency, AgencyMember, AgencyPractice, AgencyPracticeGrant e AgencyCreateRequest, senza modifica delle tabelle Home/Document. Account riceve soltanto le relazioni ORM inverse. Le FK impediscono cancellazioni a cascata di soggetti e pratiche. CHECK SQL per ruoli, accessi, finestre temporali, revisione e versione snapshot.

AgencyPractice mantiene un aggregato JSONB versionato con fonti/versioni, dipendenze, ricevute ed eventi. È una scelta iniziale deliberata: transizione pura e commit unico sotto lock, senza distribuire il ledger fra tabelle premature. Label/revision/id/agencyId sono verificati contro i campi della riga a ogni lettura. Non è uno storage di file: conserva solo metadati e impronte. Byte, controllo MIME/hash reale, staging e conservazione devono arrivare con l’adapter di upload; nessun endpoint può accettare impronte autoattestate dal client. Separare/indicizzare i componenti dell’aggregato quando i volumi lo richiederanno; non promettere scalabilità illimitata.

AgencyPracticesStore crea una pratica assegnata al creatore attivo admin/agent, con replay protetto da ledger di creazione unico per agenzia/account/chiave. Le mutazioni caricano membership e assegnazione dal DB, ne bloccano la revoca con lock condiviso, bloccano la pratica in scrittura e applicano revisione ottimistica/CAS. Snapshot ed evento/ledger si aggiornano nella stessa transazione; input non valido e conflitto fanno rollback. Il ritorno è una proiezione autorizzata, mai l’aggregato privato.

Il manifest deve essere nuovamente autorizzato al momento della consegna dei byte: l’adapter attuale prepara solo metadati. Nessuna registrazione in AppModule né endpoint di provisioning dell’agenzia. La futura HTTP API riutilizzerà sessione/CSRF e non permetterà al client di costruire Actor o modificare membership liberamente.

Suite dedicata `npm run test:agency-practices-db -- --pg-bin <binari> --scratch-root <cartella nuova>`, registrata nell’aggregato DB protetto. Stato effettivo e risultati nel registro; nessun test sui dati del prodotto.

## Verifica

Comando protetto `npm run test:agency-practices` nella cartella backend-v5; il profilo è registrato anche nell’aggregato ordinario. ESLint mirato sul nuovo dominio e test. Gli esiti esatti aggiornati sono nel registro di lavoro.
