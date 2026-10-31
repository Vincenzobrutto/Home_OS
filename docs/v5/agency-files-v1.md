# Agenzie — bytes immutabili delle fonti

## Confine implementato

`AgencyFileVault` è una porta filesystem interna con root assoluta dedicata, marcata e inizialmente vuota. Rifiuta cartelle non vuote senza marker e root simboliche/non canoniche. Nessun riuso dello storage Document/Home. Nessuna root configurata in AppModule e nessun file scritto fuori dalle directory temporanee dei test.

Oggetti content-addressed con SHA256 derivato dal server; nome originale separato, mai usato come percorso. Buffer copiato prima delle attese; massimo20MiB. Identificazione PDF/PNG/JPEG dai bytes, non dal nome o MIME dichiarato. Le firme non garantiscono struttura valida, assenza di malware o renderizzabilità: il decoder fidato deve ancora interpretare il documento prima dell'analisi. Il file PDF sintetico di test non è una prova di rendering.

Scrittura temporanea esclusiva e link atomico senza sovrascrittura. Duplicati concorrenti vengono verificati contro hash e dimensione; temporanei rimossi in finally. Lettura controlla tipo file, dimensione e hash; file mancanti/corrotti producono errore generico. Su Windows il sandbox nega gli hard link: il collaudo è eseguito con permesso soltanto su directory temporanee sintetiche. Il filesystem di produzione deve supportare questa primitiva; non esiste fallback con sovrascrittura.

`AgencyPracticesStore.upload` accetta solo attach/replace con dati di comando e buffer. Deriva SHA/dimensione/MIME, passa dal dominio e dai lock membership/grant/pratica esistenti, poi salva bytes prima del commit dei metadati. CAS, replay e limiti del dominio restano applicati. Errori storage fanno rollback; revisione o autorizzazione errate vengono rifiutate prima della scrittura. Input del browser con hash o campi file extra è rifiutato. Lo store metadata-only rimane una porta interna di test/worker, non un endpoint upload da esporre.

`readFile` richiede fonte leggibile e snapshot corrente esatto (id/versione/SHA) in transazione, verifica i bytes e ricontrolla autorizzazioni prima del ritorno. Un amministratore non legge originali privati altrui. Versioni precedenti, ritirate e accessi revocati non hanno un percorso pubblico di download. Nessun filesystem path è restituito.

## Limiti espliciti

DB e filesystem non sono una transazione distribuita. Un rollback/crash dopo il salvataggio può lasciare un oggetto non referenziato: non eliminarlo durante la richiesta, perché potrebbe essere usato da un'altra transazione. Garbage collection con età minima e scansione dei riferimenti da aggiungere prima del pilota. La consistenza dopo perdita di alimentazione/fsync directory e le quote complessive per agenzia non sono ancora implementate. La root deve essere privata del processo: i controlli non difendono da un amministratore del filesystem ostile che sostituisce file tra lstat/open.

Nessun controller multipart, streaming HTTP, limite reverse-proxy, scanner, download Content-Disposition o policy retention attivi. Nessun rendering PDF/immagine, job o chiamata provider. Upload limitato a buffer interni; il futuro trasporto dovrà imporre20MiB durante la ricezione, non soltanto dopo aver allocato il body.

## Prossimo task

Rasterizzatore fidato dalla lettura autorizzata corrente: PDF pagina selezionata, limiti tempo/pixel/processo, immagine in coordinate dichiarate e SHA del raster. Nessun percorso o comando proveniente dal client, nessuna rete o link remoto nel decoder. Poi ledger job/lease persistente e trasporto/sessione/CSRF con test HTTP. I vecchi metadati senza bytes devono fallire esplicitamente al rendering, senza fingere un originale disponibile.
