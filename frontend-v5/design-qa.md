# Design QA — Catalogo Oggetti e impianti

19 ottobre 2026. Riferimento: proposta definitiva desktop/mobile approvata, outputs/oggetti-proposta-definitiva/desktop-mobile.png. Implementazione reale: /home/:homeId/oggetti. Immagine sorgente e catture desktop.png/mobile-cucina-fixture.png aperte insieme nello stesso input di confronto; mobile.png controllata separatamente sui dati reali. Desktop 1440×1024, mobile 390×844; screenshot a densità 1. Ulteriore controllo 320×740.

## Riscontri

Nessun P0/P1/P2 aperto. Composizione conservata: ricerca e aggiunta, chip, filtri e alternanza viste, conteggio/ordine, due colonne di schede orizzontali desktop e una mobile. Le cinque voci della navigazione mobile restano accessibili. Controllo ravvicinato di nome lungo TV, marca/modello, badge collocazione e data garanzia leggibili.

- Tipografia: Manrope/DM Sans del prodotto esistente, gerarchia titolo/nome/metadati rispettata; nome lungo su due righe senza spingere freccia/data fuori dalla scheda.
- Spaziatura: schede desktop 134 px minimi, gap 14, icona 64×76; mobile testo e data impilati per mantenere leggibilità e touch target. Filtri visibili, chip scorrono nel solo contenitore. Pagina senza overflow anche a 320 px.
- Colori: navy, bianco e teal coerenti con i token esistenti; attività imminenti ambra, garanzia scaduta neutra. Focus della scheda visibile.
- Asset: icone Phosphor nitide. Foto illustrative sostituite intenzionalmente dalle icone approvate come fallback: nessuna immagine generata è attribuita a un prodotto reale. Nessun SVG artigianale nuovo.
- Testi e dati: conteggi/ambienti reali, niente stanze fittizie; singolare corretto «1 oggetto trovato». Garanzia solo da profilo disponibile, attività solo da collegamento effettivo.

Differenze intenzionali: chrome dell’app e testi privacy/ritorno conservati; pulsante Cerca esplicito. Screenshot desktop reale con 3 oggetti personali anziché 48 illustrativi. Verifica filtro Cucina mobile con fixture di 48 oggetti generici e conteggi 12, poi rimossa: soggetti e dati non coincidono con i prodotti del mockup e non vengono valutati come una replica fotografica. Mobile con avviso/data occupa più altezza della scheda illustrativa senza data. Tutti i contenuti restano leggibili.

## Verifica interazioni

Ricerca per modello, cambio vista, filtro ambiente, paginazione e ritorno con focus/scroll identici; Indietro mobile conserva ambiente/vista. Test sintetici isolati rimossi, dati reali preservati. Console finale senza errori/warning. Tastiera: link intera scheda, focus e controlli standard; nessuna certificazione accessibilità completa.

Checklist completata: confronto visivo, desktop/mobile/320, dati autorizzati, viste e filtri funzionanti, contesto ripristinato, fixture rimossa. P3 futuro: foto reali opzionali, fuori dall’incarico corrente.

final result: passed

---

# Design QA — Ambienti dalla planimetria

19 ottobre 2026. Target: anteprima approvata `outputs/dimora-v5-completo/ambienti-preview/`, desktop 1440×1024 e mobile 390×844. Implementazione: V5 reale, route ambienti/da-planimetria/:documentId. Confrontate immagini di riferimento e catture implementate nello stesso input visivo; ulteriore verifica ravvicinata di mappa/punto 5/campi e footer mobile.

Composizione conservata: mappa a sinistra, schede numerate a destra, riga attiva chiara e punto evidenziato, controlli zoom/aggiunta, footer con conteggio e conferma. Su mobile alternanza Planimetria/Elenco, dati conservati, controlli sopra le cinque voci inferiori. Nessun overflow orizzontale a 390 px. Dialog nativo con riepilogo prima della scrittura.

Differenze intenzionali: chrome dell’app esistente, Salva bozza, selezione di ambienti già presenti, informazioni di condivisione e segnalazioni AI richiudibili. L’AI reale ha proposto 8 punti, mentre il prototipo conteneva 7 punti preparati manualmente: dati e numeri spaziali non possono essere confrontati come una replica identica dell’estrazione. La numerazione interna mappa/elenco è stata controllata, inclusa scheda 5 con nome iniziale Ambiente 5. Nessuna creazione reale eseguita.

Correzioni durante QA: avviso di duplicato rimosso dalle schede già confermate, selezione esistente mostra l’ambiente effettivo, toolbar mobile più compatta, segnalazioni raccolte in un riepilogo, recupero bozza e scheda selezionata verificati. Salvataggio completo e protezione duplicati provati in casa sintetica isolata, poi rimossa.

Evidenze locali: ambienti-implementation/desktop-real.png, mobile-map-real.png, mobile-list-real.png, synthetic-confirmed.png sotto gli output del mockup. Verifica finale dopo ricarica per distinguere errori transitori HMR da errori riproducibili.

Limiti residui: posizioni e confini proposti dall’AI approssimativi, da rivedere sull’originale. Nessun P0/P1/P2 aperto nell’interfaccia verificata; non è una certificazione dell’estrazione geometrica.

final result: passed
