# Caricamento automatico V5 — 18 ottobre 2026

L’utente vuole caricare documenti e trovare oggetti e spese organizzati, intervenendo solo nelle ambiguità. Implementato un percorso opt-in con consenso esplicito per lotto, trasferimento ad Anthropic dei documenti elencati (anche dati personali) e conferma delegata dei soli casi chiari. Senza consenso resta la compilazione manuale.

## Funzionamento

Originali acquisiti con i servizi esistenti; consenso associato alla lista esatta e a versione/SHA. Richiesta durevole scoped account/casa/lotto, worker con lease e recupero, elaborazione progressiva. Non dipende dalla pagina aperta. Una richiesta AI per originale, oppure riuso di estrazione già presente dello stesso originale. Errore/incertezza non avviano invii aggiuntivi. Limiti configurati e conteggi storici restano invariati.

La policy ammette solo fonti complete, nomi non troncati, singolo esemplare dichiarato e beni inerenti alla casa. Nessun candidato oggetto/spesa, nessun campo già modificato da sovrascrivere. Costi solo con data e importo verificati; riga con prezzo proprio nelle fatture multiple, nessuna ripartizione del totale. Bollette senza oggetto e planimetrie solo casa. Totali ambigui, quote canone/arretrati, consumabili, quantità multiple e possibili doppioni diventano richieste di revisione. Guard finale ripetuto nella stessa transazione delle creazioni per evitare gare.

L’interfaccia offre consenso unico, caricamento e riepilogo; durante il percorso automatico nasconde il vecchio elenco da revisionare interamente. Espone solo eccezioni con collegamento alla revisione unica esistente, oltre a Oggetti/Spese/Documenti. Avanzamento recuperato dal server dopo refresh. Nessun dato reale inventato in caso di errore.

## Validazione

14 test di policy;13 test DB riportati (12 scenari più contenitore) con servizi canonici e output sintetico normalizzato;33 regressioni DB/HTTP onboarding e provider finto;40 test frontend onboarding già passati più11 test finali del container automatico/intake. Build, typecheck e lint. Nessuna chiamata provider reale o consumo budget in questa sessione. Test non equivalgono a un nuovo collaudo della qualità del modello.

## Limiti

L’estrattore sottostante resta V12: i fallimenti di quantità e di output emersi nel ripopolamento sono ancora aperti. Il filtro è conservativo e può richiedere revisione anche per un documento leggibile. Matching fra diversi originali assistito; nessuna sovrascrittura automatica di schede esistenti. Classificazione e creazione canonica hanno due ricevute e non una transazione unica: dopo una classificazione riuscita la creazione può restare da rivedere. Non implementato annullamento collettivo delle creazioni; le azioni di modifica/archiviazione individuali esistenti rimangono disponibili. Worker eseguito con il server locale acceso, non quando il PC è spento.

Browser nell’app: ingresso unico verificato desktop e layout390px senza overflow orizzontale; consenso non preselezionato, nessun invio avviato. Il riepilogo e le eccezioni sono coperti dai test frontend, le creazioni dai test DB sintetici. Nessun nuovo collaudo end-to-end con provider reale. Screenshot nel workspace outputs/automatic-intake-desktop-20261018.png e automatic-intake-mobile-20261018.png. Runtime API locale aggiornato, LAN esistente invariata.
