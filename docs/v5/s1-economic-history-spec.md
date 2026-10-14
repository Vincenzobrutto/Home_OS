# S1 — Storico economico evoluto e compilazione assistita

> Vincolo esplicito del committente: Economia della casa è un modulo aggiuntivo. Non sostituisce o altera percorsi/comportamenti già definiti di Spese essenziali, Documenti, Attività, Oggetti e caldaia. Nuovo ingresso distinto all'area evoluta; registrazioni canoniche referenziate, nessuna duplicazione o riclassificazione automatica. Prima dello sviluppo il committente vuole navigare un mockup e valutare l'esperienza: backend e incarico frontend operativo sospesi fino a questa revisione UX. Mockup isolato mockup-economia-s1.html, nessuna API o DB reale.

14 ottobre 2026. Definizione di prodotto consolidata dopo approvazione in chat. Non è una funzionalità già attiva. Prevale sui precedenti rinvii dell'intera estrazione economica a S3 e sull'ordine C1 prima di S1. G1 resta completato; nuovo ordine S1, C1, S2 e restante S3/S4.

## Obiettivo e uscite

Sapere quanto ho registrato per la casa, per categoria, oggetto e lavoro, con inserimento manuale breve o compilazione da documento. Costi personali, non contabilità bancaria. Nessuna deduzione di pagamento, risparmio effettivo o completezza dei dati.

S1a: categorie, storico filtrabile, riepiloghi e confronti. S1b: raggruppamenti lavori e lettura per oggetto/ambiente. S1c: bozza economica da bolletta/fattura, verifica e registrazione o collegamento a costo esistente. Sono parti dello stesso S1; non dichiarare il modulo completo alla sola consegna S1a.

## Percorso manuale

«Aggiungi spesa» offre «Inserisci manualmente» e «Da documento». Il manuale rimane utilizzabile senza AI, documento o pagamento dichiarato.

Campi essenziali: descrizione, importo EUR, data di riferimento proposta su oggi server Europe/Rome e modificabile. Categoria facoltativa, inizialmente Non classificata. Oggetto e lavoro facoltativi; documento e nota aggiungibili dopo. Fornitore, numero/data documento, periodo di competenza e scadenza in dettagli aggiuntivi. Le date hanno etichette distinte: nessuna «data» indistinta che cambi significato fra percorsi.

La data di riferimento ordina lo storico e determina il periodo del riepilogo; non attesta pagamento. Mantiene il campo spentOn H3a e il vincolo non futuro. Per un documento si propone la data documento se non futura; se assente o futura l'utente sceglie una data di riferimento, senza ripiego silenzioso. Scadenza e fine competenza possono essere future ma non generano ancora un impegno.

Dal documento il riferimento è precompilato e autorizzato via API. Dall'oggetto si precompila il riferimento discriminato object/boiler; dal lavoro il raggruppamento. Ogni precompilazione è modificabile e non prova autorizzazione. Il costo generale della casa non richiede oggetto. Nessun passo obbligatorio per classificare tutti i dati.

Importi positivi in centesimi esatti, stessi limiti H3a; zero/negativi/frazioni di centesimo esclusi. Correzioni e archivio/ripristino hanno versione e storia. Vecchie registrazioni rimangono Non classificata, senza pagamento dedotto o modifica dei valori.

## Percorso da documento

Caricare tramite M2 o scegliere originale già autorizzato. Prima analisi economica: bollette luce/gas/acqua/internet e fatture semplici di manutenzione, riparazione o acquisto, PDF con testo estraibile. Non promettere lettura foto/scansioni: OCR/vision separato. Mutuo, polizza, tributi, documenti multi-fattura, note di credito e importi in altre valute non supportati da questo primo estrattore; restano archiviabili e il manuale è disponibile. Nessuna classificazione finta come fattura semplice.

L'AI propone descrizione, fornitore, categoria, importo, numero/data documento, competenza, scadenza. Oggetto/lavoro solo suggerimenti fra riferimenti già autorizzati, nessuna creazione o collegamento automatico. Ogni valore estratto ha pagina ed estratto verificato della fonte originale/versione/hash. I valori assenti restano assenti; correzioni manuali sono distinguibili dalle proposte.

Regola importo: per fattura semplice proporre totale lordo del documento, non imponibile, IVA o singola riga. Per bolletta distinguere totale corrente del documento, arretrati/saldi e importo da pagare. Non usare automaticamente l'importo da pagare se include arretrati già possibili nello storico. Se il totale corrente non è sostenuto chiaramente, mostrare candidati con denominazione e fonte e richiedere scelta/completamento. Un dato inferito non diventa importo confermato. S1 non scompone automaticamente una bolletta fra categorie né crea più costi da righe.

Bozza accanto a fonte, azione «Conferma e registra». Nessun costo nei totali prima della conferma. Confermare significa dichiarare i dati economici scelti, non dichiarare pagamento. Nessuna scrittura su campi caldaia M3 o creazione di obblighi futuri.

Costi esistenti dello stesso documento e candidati autorizzati per fornitore/numero/importo/date vengono proposti per «Collega alla spesa esistente» o «Registra nuova spesa». Non bloccare costi legittimi diversi nello stesso originale. Nessuna fusione o modifica automatica. Scegliere una spesa esistente mantiene importo/data/categoria; eventuali aggiornamenti richiedono distinta anteprima e conferma con versione attuale. Stessa conferma/retry non crea due costi.

Stati espliciti: pronto ad analizzare, elaborazione, bozza da confermare, nessun dato utilizzabile, documento non supportato, errore, fonte non più disponibile, confermato. Riaprire una bozza confermata conduce al costo collegato. Ripetere analisi non sovrascrive un costo confermato. Consentire abbandono senza perdita dell'originale.

## Storico e categorie

Vista iniziale Sostenute, anno corrente server; anno diverso o intervallo personalizzato inclusivo. Filtri categoria, oggetto discriminato, ambiente, lavoro; ricerca descrizione/fornitore. Archivio distinto. Totali e conteggi applicano lo stesso ambito e filtri della vista, solo costi attivi; importi archivio non mescolati. Una voce personale resta tale anche con oggetto/ambiente condiviso.

Categorie: energia elettrica, gas, acqua, internet/servizi, condominio ordinario, condominio straordinario, assicurazione, tributi, manutenzione, riparazione/lavori, acquisto/sostituzione oggetto, finanziamento, altro; più Non classificata per valore assente. Codici stabili nel contratto, etichette italiane nel client, nessuna categoria libera in S1.

Raggruppamenti: gestione (utenze/servizi/ordinario/assicurazione/tributi/manutenzione); lavori e acquisti (straordinario/riparazioni/acquisti); finanziamento separato; Non classificata visibile e inclusa nel totale generale. Non attribuire i non classificati a gestione. Categoria modificabile con storia. La rata intera dichiarata non si risomma a capitale/interessi; S1 non calcola mutui.

Totali denominati «Costi registrati», non uscite effettive o debiti. Fonte manuale/documento collegato/estrazione confermata distinta; collegare un PDF non certifica l'importo manuale. Nessun nuovo stato Pagata in S1.

## Oggetti, ambienti e lavori

Riutilizzare collegamenti G1, senza duplicare HomeExpense o caldaia. Scheda oggetto: lista, totale periodo e totale delle registrazioni disponibili, distinzione per categorie. Cambio posizione modifica il filtro ambiente corrente, non la storia della spesa: esplicitare che si usa la posizione attuale. Oggetto multiambiente: vista aggregata deduplica ID; nessuna quota stanza inventata.

Lavoro personale semplice: nome, nota, stato attivo/archiviato, versione e storia; un costo appartiene al massimo a un lavoro. Oggetto principale del costo rimane unico G1. Facoltativo riferimento a una attività personale già autorizzata, senza attestare costo/pagamento o completare l'attività. Nessun preventivo/avanzamento/SLA in S1.

Archiviare lavoro non archivia costi né cambia totale Home; costi possono restare nel raggruppamento storico. Nessuna cancellazione fisica. Un lavoro che interessa più oggetti ha un totale unico e non viene replicato nei totali degli oggetti: allocazioni/many-to-many monetario rinviati. Nessun automatismo quando si chiude un'attività.

## Confronti

Confronto anno corrente fino a oggi contro identico intervallo dell'anno precedente; anno chiuso contro anno chiuso. Intervallo personalizzato confrontato con stesse date nell'anno precedente, 29 febbraio adattato al 28 con criterio visibile. Differenza assoluta; percentuale solo con base precedente positiva. Base zero mostra «Nessun costo registrato nel confronto», non infinito o 100% risparmio.

Si confrontano registrazioni per data di riferimento, non consumi normalizzati o competenza: scriverlo. Non dedurre completezza da numero categorie/documenti. Periodo senza record è «Nessun costo registrato», non costo reale zero. Nessuna etichetta «Hai risparmiato».

## Confini tecnici e privacy

HomeExpense canonico e migrazioni additive; vecchie API expenses-v1 restano compatibili. Nuova capacità/versione esplicita per S1. Contratto congelato prima del frontend operativo. Totali/filtri/ricerca/paging/history/replay autorizzati server, membership corrente + creatore; owner non eredita costi personali. Revoca fonti redige ID/nome/estratti anche bozza/storia/replay; dato manuale autorizzato non cancellato. Account/Home change e 403 ripuliscono cache e bozze. Nessun importo o testo documentale in URL/log pubblico.

Analisi economica è un nuovo verticale separato dalle proposte caldaia M3/M4; riusare infrastruttura sicura, non reinterpretare output tecnici. Nessun consenso implicito a trasferire testo al provider da upload. Anthropic già scelto, ma nessuna nuova chiamata a pagamento o riapertura campagna M4 in questa fase: implementazione e test fixture sintetici; collaudo live separato da autorizzare prima dell'invio.

## Accettazione

1. Manuale minimo da Spese, oggetto, lavoro e documento; stesso costo nei riepiloghi una sola volta, anche multiambiente.
2. Vecchio costo importo/data/collegamenti invariati, categoria assente; modifica e archiviazione coerenti con totali/storia.
3. Filtri combinati/ricerca/paging oltre prima pagina; totali globali del filtro non solo righe caricate; caratteri wildcard letterali.
4. Bolletta sintetica corrente 80 EUR + arretrati 20: candidati distinti, nessuna registrazione automatica di 100; fattura imponibile 100 + IVA 22: totale proposto 122 con fonte.
5. Importo/scadenza mancanti, scansione, multi-fattura, credito, fonte revocata: nessun successo inventato e manuale raggiungibile.
6. Bozza non entra nei totali; conferma/replay crea una spesa; collega esistente senza seconda spesa o sovrascrittura implicita; risposta persa e conflitto versione gestiti.
7. Lavoro archiviato e oggetto spostato: costi conservati, filtri spiegati, nessuna quota inventata.
8. Confronto stesso intervallo, base zero, bisestile, storico incompleto: nessun risparmio o completezza affermati.
9. Test account/Home/viewer/revoca/bozze/proposte/ricerca/candidati/totali/history/replay, nessuna perdita di privacy.
10. DB/HTTP/client reali, 320/390/desktop, tastiera/focus, reload/login. Fixture e browser reali distinguibili; no conformità WCAG dichiarata.

## Consegna e responsabilità

Codex: contratto REST con DTO/esempi/errori/capabilities/paging/CAS/idempotenza e migrazioni, backend, integrazione e verifica. Claude: prima revisione UX documentale di questa specifica, poi frontend solo dopo incarico implementativo con baseline/contratto congelati. Nessun prompt di revisione autorizza già sviluppo runtime. C1 resta dopo S1; S2 e S3 avanzato/S4 successivi.
