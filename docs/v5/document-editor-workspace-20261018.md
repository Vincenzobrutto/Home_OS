# Documenti — spazio di lavoro combinato, 18 ottobre 2026

## Decisione e implementazione

Il committente sceglie il mockup combinato: struttura della terza proposta (coda e sezioni) con originale affiancato dalla seconda. Implementazione nel prodotto reale, non nuovo prototipo o dati dimostrativi di fallback.

- Dopo il caricamento riuscito da Documenti si apre il primo file acquisito nella scheda unica. Upload parziali conservano manifest, file mancanti e recupero esistenti; nessuna conferma parziale nascosta.
- Coda personale Da fare con stato server, selezione corrente e caricamento delle pagine successive. La fonte corrente può essere mostrata separatamente se non rientra nei filtri. I filtri restano nel ritorno all’archivio.
- Scheda centrale riusa DraftEditor/UnifiedReview per manuale e AI. L’AI richiede il consenso esistente; le proposte pronte vengono riaperte senza un nuovo invio. Un nuovo avvio da una bozza manuale dichiara che i campi non salvati non vengono trasferiti alla proposta AI distinta.
- Documento, spese, oggetti e contatti sono raggruppati. I costi associati agli articoli sono mostrati nella sezione spese senza duplicare il controllo automatico dei doppioni. Riepilogo esplicito del numero di oggetti da creare/collegare anche quando la sezione è chiusa. I contatti compaiono solo quando esistono proposte.
- «Conserva solo il documento» resta disponibile; il manuale conserva il default già approvato. «Salva e passa al successivo» avanza solo dopo conferma server, invalidazione delle query e controllo account corrente. Analisi in corso e da verificare non vengono avviate o confermate automaticamente.
- Dati mancanti nel campo/riepilogo e nella barra di salvataggio. Le checklist aprono la sezione pertinente prima del focus. Avviso esplicito prima di scartare modifiche cambiando documento, tornando all’elenco o aggiungendo file; beforeunload per chiusura/ricaricamento.
- Anteprima richiudibile. PDF.js 6.4.299 con worker, font, CMap, ICC e decoder distribuiti localmente tramite Vite; nessun visualizzatore esterno o CDN. Byte originali letti dalle API autorizzate, mai copiati negli asset pubblici. Rendering di una pagina alla volta, zoom, cambio pagina, download e distruzione del documento/worker allo smontaggio. PDF non supportati o protetti possono usare il download originale.
- Vecchi indirizzi con documento selezionato aprono lo stesso spazio di lavoro. Lotti senza documento selezionato e percorsi automatici precedenti rimangono compatibili per recupero e consenso esistente.

## Verifica

131 test frontend mirati riusciti su intake-integration, object-onboarding, nuovo workspace/PDF e documentWorkflow; prove con backend simulato, non certificazione AI live. Build TypeScript/Vite e lint mirato riusciti. Test aggiunti per selezione successiva solo dopo conferma, filtri, avviso modifiche, riapertura caricamento nella stessa rotta, anteprima/zoom/paginazione e rilascio PDF. Aggiornate aspettative obsolete dei vecchi pulsanti, preservando prove di idempotenza, upload parziale, doppioni e consenso. Nessun endpoint/backend/schema modificato: non necessaria una nuova suite DB.

Browser reale su COLLAUDO V2: caricamento audit-spazio-unico.pdf, manuale, scelta Regolamento condominiale, salvataggio solo documento e passaggio alla proposta AI già pronta; nessun nuovo oggetto/spesa/contatto o invio a pagamento. Nuovo file sintetico id 1f9b6734-5da8-40b3-a11b-5f3075f9ccdf. Verificati originale PDF, zoom, chiusura/riapertura anteprima, desktop e mobile390 senza overflow orizzontale; nessun errore console nella cattura finale.

Confronto visivo affiancato con il mockup approvato e screenshot finali in outputs/documenti-spazio-unico della chat. Il PDF sintetico e il caso reale di possibile doppione differiscono dalla fattura illustrativa: avvisi e controlli aggiuntivi sono intenzionali. Font, navigazione e privacy del prodotto conservati.

## Limiti e seguito

Non aggiunto autosalvataggio dei campi non confermati: «Riprendi più tardi» conserva il documento e le bozze già persistite; l’avviso chiarisce lo scarto dei campi locali. La protezione non copre ogni possibile navigazione esterna dell’app. Cestino, OCR, ricerca full text e ridisegno complessivo della ricerca restano separati. La coda passa fra i risultati caricati; «Altri documenti» amplia l’insieme. Nessun deploy pubblico. Tre differenze legacy locali conservate ed escluse dal commit.
