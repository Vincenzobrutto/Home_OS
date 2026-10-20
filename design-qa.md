# Design QA — Bolletta manuale

final result: passed

Correzione funzionale richiesta sulle schermate fornite dal committente: Bolletta deve mostrare i campi spesa, non Articolo 1. Verifica browser su nuovo PDF sintetico: Categoria della bolletta, Fornitore, Importo editabile e Data visibili; sezione Oggetti assente. Scelta solo documento nasconde la spesa e rimane reversibile. Nessun avviso di versione dopo la correzione della sovrapposizione fra cambio manuale e allineamento. Screenshot outputs/bolletta-manuale/campi-spesa.png della chat. 69 test frontend e 37 backend riusciti; 3 test del flusso ripetuti dopo l’ultimo aggiustamento, build e lint riusciti. Nessun documento personale alterato o inviato all’AI. [Report](docs/v5/manual-bill-flow-20261018.md).

---

# Design QA — Documenti, proposta combinata

final result: passed

Riferimento: exec-5b4246c8-1f82-45a2-80e8-ce115521ed12.png, proposta combinata approvata. Confronto affiancato in outputs/documenti-spazio-unico/confronto-finale.png della chat; entrambi desktop1547x1017, revisione di proposta con salvataggio bloccato. Contenuto differente dichiarato: fattura illustrativa con data mancante nel mockup, ricevuta sintetica con possibile doppione nell’app reale.

Prima iterazione: P2 anteprima PDF nativa vuota, ripetizioni sopra il modulo e azione finale fuori vista. Corretti con renderer PDF.js locale, riduzione dei messaggi ripetuti e barra persistente con motivo del blocco. Seconda cattura e confronto: originale leggibile, tre aree separate, sezioni espandibili, stato personale in ambra, CTA e avviso visibili. Screenshot finali desktop-finale.png e mobile.png nella stessa cartella. Su mobile390 la coda scorre orizzontalmente; modulo e anteprima si impilano, barra sopra la navigazione, clientWidth=scrollWidth375. Nessun errore console finale.

Adattamenti al prodotto: shell/font/token già presenti conservati; avvisi sui doppioni e consensi espliciti prevalgono sulla fattura illustrativa. Nessun asset finto o documento reale esposto. Verificati chiusura/riapertura anteprima e zoom, upload sintetico, manuale, solo documento e passaggio alla proposta AI esistente. Prove automatiche: 131 test frontend, build/lint mirato riusciti. P3: ulteriore compattezza dei riepiloghi e menu coda mobile; campi non salvati non persistiti, con avviso di scarto dichiarato. [Report](docs/v5/document-editor-workspace-20261018.md).

---

# Design QA — Correzioni Documenti 1–4

final result: passed

Verificati sul percorso reale esistente i quattro interventi approvati dopo l’audit. Nuova fixture sintetica: scelta solo documento, nessun articolo fittizio, tipo mancante cliccabile e focus sulla select, salvataggio e Completato. Recuperata anche la richiesta pendente dell’audit senza cambiare intento/chiave. Dai dettagli il ritorno mantiene Completati e ricerca audit. Token, colori, tipografia e struttura del prodotto conservati; nessun nuovo asset.

78 test frontend e 41 backend riusciti, build e lint mirato riusciti. Screenshot locali outputs/documenti-fix/solo-documento.png e completati.png nella chat. Ricerca/mobile e ripristino dello scroll esclusi da questa iterazione. [Dettagli e limiti](docs/v5/document-ux-fixes-20261018.md).

---

# Design QA — Documenti, proposta 3

final result: passed

Confronto: terzo risultato Image Gen scelto dal committente (Da fare e Completati) con pagina reale del checkout esistente, non nuovo prototipo. Source 1487x1058; cattura desktop allo stesso viewport, ridimensionamento uniforme affiancato in work/design-comparison.png della chat. Stato Da fare confrontato con stato Da fare; i documenti sintetici disponibili sono tre, non i cinque illustrativi. Screenshot di Completati e mobile390 in outputs della chat. Confronto letto sia completo sia nei dettagli di righe/stati e CTA; mobile verificato separatamente a390 e320.

- Tipografia: font/token del prodotto conservati, nomi lunghi vanno a capo e azioni leggibili; nessun testo generato come immagine.
- Spaziatura: lista unificata con separatori e colonne titolo/stato/azioni; corretti overflow desktop e spazio verticale eccessivo della status area mobile. Nessun overflow orizzontale: clientWidth=scrollWidth ai breakpoint controllati.
- Colori: navy/teal del prodotto, stato con testo/icona oltre alla tinta; proposta ambra e completato verde, nessuna equivalenza fra analizzato e confermato.
- Immagini: nessun asset raster richiesto dal layout; logo e icone esistenti riusati, originali non alterati.
- Contenuto/interazioni: due viste dello stesso archivio filtrate dal server, stato personale corrente, selezione attivabile e annullabile, compilazione manuale/AI accessibile, proposta esistente aperta senza invio, originali e menu distruttivo conservati. Stato vuoto con destinazione Completati, layout responsive con navigazione mobile esistente.

Adattamenti intenzionali al prodotto reale: nessun contatore inventato senza totali server; ricerca/raccolte ancora nel controllo Cerca e filtra, limitata a titoli e nomi file, non ricerca full text promessa dal mock. Menu testuale Altre azioni invece di ellissi e metadati privacy conservati. Il numero e contenuto dei documenti differiscono dal mock perché si usano dati locali veri/sintetici già disponibili; nessuna nuova analisi creata per riempire la schermata.

Nessuna criticità P0/P1/P2 aperta nel perimetro selezionato. Iterazione P3 possibile: totali server per tab e ricerca compatta sempre visibile, senza cambiare i filtri/cursori. Nessun deploy pubblico.


---

# Design QA — Attività desktop/mobile, 19 ottobre 2026

final result: passed

Confronto della proposta approvata con l’app reale; nessuna selezione multipla. Contenuti diversi dichiarati: mock Scadute 2, dati attuali Scadute 0 e fixture completata usata per il ritorno. Non si dichiara fedeltà pixel per pixel fra contenuti e densità differenti.

- desktop: sorgente `C:\Users\07704017\.codex\generated_images\01a1508d-6897-7942-a213-e42197294238\exec-0597c41c-7bae-444c-bcf1-969c0ac010ba.png` ((1487, 1058)); implementazione `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\attivita-audit\implementata-desktop.png` ((1440, 1024)), viewport CSS 1440×1024. Confronto completo `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\attivita-audit\confronto-desktop.png`: immagini scalate proporzionalmente alla stessa altezza di 800 px per ispezione, senza deformazione. Non necessario un crop separato: controlli e gerarchia leggibili nel confronto completo.
- mobile: sorgente `C:\Users\07704017\.codex\generated_images\01a1508d-6897-7942-a213-e42197294238\exec-240c5e2c-f50f-4798-afdb-34e84fde04e4.png` ((853, 1844)); implementazione `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\attivita-audit\implementata-mobile.png` ((375, 812)), viewport CSS 390×844. Confronto completo `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\attivita-audit\confronto-mobile.png`: immagini scalate proporzionalmente alla stessa altezza di 800 px per ispezione, senza deformazione. Non necessario un crop separato: controlli e gerarchia leggibili nel confronto completo.

Prima revisione: azione primaria sotto le viste e descrizione ripetuta consumavano spazio (P2). Correzione: azione primaria nel titolo desktop e prima delle viste a tutta larghezza su mobile; nota sulla data spostata in coda. Seconda cattura e confronto completo: nessun P0/P1/P2 osservato nella struttura verificata.

Differenze intenzionali: shell/token originali, selettore nativo per lo storico invece di menu personalizzato, selezione filtro in teal coerente con Dimora, dati effettivi e stato vuoto al posto delle fixture del mock. Strumenti richiudibili e viste scadenze/analisi conservati.

Interazioni browser: Casa→Oggi; In programma/Senza data/Scadute; Completate→dettaglio→ritorno con link e Indietro; focus e posizione 170 px ripristinati. Creazione aperta e annullata senza scritture; Analisi separata, nessun avvio. Console: nessun errore rilevato. Mobile documento 375 px su viewport 390 px. Limiti: non provati telefono fisico, screen reader, zoom 200%, rete degradata o lunghe liste reali; la paginazione dopo perdita della cache è verificata nel test mock. Nessuna certificazione WCAG.


---

# Design QA — Spese desktop/mobile, 19 ottobre 2026

final result: passed

Sorgente: mock desktop/mobile approvati, con modifica esplicita del committente che richiede di reinserire la distribuzione (grafico originale osservato anche nell’audit Spese). API reali al posto dei dati dimostrativi dei mock. Confronto strutturale, non attestazione di corrispondenza pixel per pixel.

- desktop: source `C:\Users\07704017\.codex\generated_images\01a1508d-6897-7942-a213-e42197294238\exec-13179d99-e617-46e6-97fb-8b6a7bc953fd.png`, pixel (1487, 1058); implementazione `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\spese-audit\implementata-desktop.png`, pixel (1425, 1013), viewport CSS 1440×1024. Evidenza congiunta `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\spese-audit\confronto-desktop.png`. Normalizzazione proporzionale ad altezza massima 900 px, senza deformazione.
- mobile: source `C:\Users\07704017\.codex\generated_images\01a1508d-6897-7942-a213-e42197294238\exec-c60e87d0-c6f0-482c-bb28-6be4a02e0afc.png`, pixel (853, 1844); implementazione `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\spese-audit\implementata-mobile-vista.png`, pixel (375, 812), viewport CSS 390×844. Evidenza congiunta `C:\Users\07704017\Documents\Codex\2026-10-18\sto-per-chiudere-questa-conversazione-codex\outputs\spese-audit\confronto-mobile.png`. Normalizzazione proporzionale ad altezza massima 900 px, senza deformazione.

Iterazione: prima revisione ha trovato azione primaria desktop sotto la testata e controlli mobile troppo dilatati (P2). Correzione: azioni affiancate al titolo desktop, riduzione spazi/controlli su mobile, totale e periodo nello stesso pannello; confronto finale ricatturato. Nessun overflow generale o controllo fuori pagina nella misura finale mobile. Grafico reinserito accanto all’elenco desktop e dopo le righe su mobile; ordine DOM/tastiera coerente. Nessun P0/P1/P2 residuo osservato nei controlli verificati.

Differenze intenzionali: shell e font/token reali, riga metadata invece di colonne rigide per titoli lunghi, submit esplicito della ricerca, modalità da documento con accesso secondario, grafico aggiunto su richiesta. Resta come P3 ulteriore riduzione della densità della testata mobile; le righe iniziano sotto la prima schermata e il grafico segue l’elenco. Full-page `implementata-mobile.png` mostra lista e distribuzione. Non si usa l’immagine completa per misurare il primo viewport.

Browser: ricerca fattura, filtro famiglia, dettaglio/ritorno, Indietro con ricerca e focus conservati a 656 px; cambio Famiglie/Categorie e vista Riepilogo/confronto; modulo aperto e annullato. Nessuna scrittura a dati o AI. Avviso di sviluppo HMR per un array di dipendenze modificato durante l’implementazione: dopo ricaricamento pulito nessun nuovo errore console rilevato. Test di 22 spese e cache rimossa verifica ricostruzione di due pagine; suite Spese/S1c/consensi 63 passati, regressioni ricerca ripetute. Non collaudati telefono fisico, zoom 200%, screen reader o errori di rete.


---

# Design QA — Ricerca Documenti unificata — 21 ottobre 2026

final result: passed

Riferimenti approvati in C:/Users/07704017/.codex/generated_images/01a1508d-6897-7942-a213-e42197294238/: desktop exec-baa39cfa-5844-47bf-90cd-60bad8c9858a.png (1487×1058), mobile exec-61e1b504-5b1c-4530-abe3-a67de817374b.png e pannello exec-fdb97ea5-8d5b-471c-a16c-1401255627da.png (entrambi 853×1844). Implementazione browser reale in C:/Users/07704017/Documents/Codex/2026-10-18/sto-per-chiudere-questa-conversazione-codex/outputs/document-search-implemented-20261021/desktop.png, mobile.png e mobile-filters.png. Viewport CSS 1440×1024 e 390×844; desktop acquisito 1440×1024, mobile acquisito 375×812 dal provider (riduzione uniforme circa 0,962), pannello 390×844. Confronti normalizzati rispettivamente a 1440×1024 e 390×844; nessuna cornice dispositivo.

Confronto affiancato nello stesso input: desktop-comparison.png, mobile-comparison.png, mobile-filters-comparison.png; dettaglio leggibile dei controlli in search-detail-comparison.png, tutti nella cartella sopra. Stato: query bolletta, Tutti attivo, filtri neutri; terzo confronto con pannello aperto. I mock usano documenti fittizi, l’app il solo risultato reale già esistente: la diversa quantità di righe e le informazioni del file non sono drift. Nessun dato sintetico inserito per imitare i mock.

Prima iterazione: P2 titolo risultati troppo debole e testata mobile troppo alta rispetto alla proposta. Correzioni: titolo risultati h2 a 18px; azione Aggiungi documenti affiancata al titolo con icona esportazione preservata (sotto a 320px). Una seconda cattura mostrava l’icona esportazione a capo per pochi pixel: ridotto il gap e impedito quel ritorno a capo. Confronti finali aggiornati e riesaminati: nessun P0/P1/P2 residuo sui controlli della ricerca o sul pannello.

Tipografia: font/font-size/line-height del prodotto conservati, gerarchia risultati ripristinata, testi lunghi vanno a capo. Spaziatura: ricerca, indicazione, stato e filtri nello stesso ordine visivo; mobile senza controlli nascosti, footer del pannello interamente visibile. Colori: navy, teal, sfondo e bordi dai token esistenti; stato attivo coerente. Immagini/icone: nessun asset raster richiesto da questa UI, icone Phosphor per ricerca, filtri e chiusura; logo/shell reali preservati. Testi: Tutti/Da fare/Completati, ricerca per titolo/nome file, Filtri e Annulla/Mostra risultati coerenti. Scostamenti accettati: identità reale della casa, esportazione, shell mobile esistente con Menu e dettagli reali delle righe, nessun badge Demo, campi select nativi.

Interazioni browser: nuova ricerca automatica globale a partire da Completati, passaggio Da fare/Completati, filtro PDF, annullamento/rimozione senza perdere query, dettaglio e ritorno con filtri/posizione/focus, Escape e Shift+Tab nel pannello, responsive 1440/390/320. Controllo DOM: larghezza contenuto 375 su viewport 390, 305 su viewport 320; nessun overflow orizzontale. Console errori/avvisi vuota. 50 test mirati, build e lint superati. Warning bundle Vite preesistente. Non eseguite prove su telefono fisico o screen reader. Nessun caricamento, salvataggio, analisi AI o modifica ai dati reali. Bozze rinviate.
