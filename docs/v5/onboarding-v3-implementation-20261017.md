# Prima integrazione UX onboarding V3 — 17 ottobre 2026

## Completato

Specifica consolidata in `onboarding-simplified-spec-v3.md` dopo approvazione e collaudo del mockup. Lista compatta delle proposte con identità e costo effettivamente scelto, riepilogo di articoli pendenti/rinviati/esclusi, revisione dedicata e pannello mobile a schermo intero. Marca e modello nuovi diventano campi diretti precompilati; fonte e spiegazioni restano nell'aiuto contestuale, dati avanzati richiamabili. I dati già confermati conservano le sole decisioni protette supportate dal server.

Resta una conferma visibile per articolo e costo; singolo acquisto con costo proposto mostra «Conferma oggetto e spesa». Conferma multipla diretta per proposte pronte, senza Salva scelta. Candidati e costi verificati anche nella lista; fonte delle opzioni è sempre API autorizzata, mai le destinazioni statiche del mockup. Versione nuova invalida la selezione. Esclusi e rinviati non sono implicitamente selezionati.

Modifiche in revisione isolate fino alla conferma; Chiudi chiede se scartare, il rinvio salva via server. Gli errori di validazione conservano i dati, il recupero incerto mantiene chiave/corpo originali. L'arricchimento ufficiale preserva le correzioni nel pannello e precompila i nuovi campi. Gli aiuti annidati chiudono indipendentemente e i blocchi di scorrimento vengono ripristinati anche smontando entrambi i pannelli.

Quando la proposta oggetti è aperta nell'intake, eliminata la colonna laterale che restringeva il contenuto. Tema V5 attuale preservato. Nessun endpoint, migrazione, nuovo provider o modifica ai dati personali.

## Prove

- Modello onboarding: 6 test verdi, prima esecuzione, codice modello invariato.
- DocumentIntakeAssistant: 21 verdi e FieldInfo: 2 verdi nella regressione mirata.
- OnboardingPage e IntakePage: 27 verdi dopo aggiornamento dei percorsi di revisione, incluse tre nuove prove su collegamento alla scheda appena creata, scarto senza POST e aiuti annidati.
- Dopo cambio etichetta conferma: 22 OnboardingPage verdi. Dopo arricchimento nel pannello: nuova prova mirata 1 verde, le 22 precedenti non ripetute.
- Totale 57 casi distinti mirati verdi attraverso queste esecuzioni; non dichiarata una nuova suite completa del prodotto. Le prime esecuzioni hanno rilevato aspettative relative ai vecchi campi sempre aperti e due selettori intake da aggiornare; corretti e rieseguiti i soli gruppi interessati.
- Build e lint completi verdi. Nessun nuovo pacchetto.
- Browser API reale: ricevuta sintetica già esistente nella casa QA, elenco compatto, apertura revisione, blocco sul costo duplicato, aiuto Marca ed Esc senza chiudere la revisione; pannello a 320 px largo 320 px e nessun overflow orizzontale. Nessuna conferma/scrittura DB e nessun nuovo invio AI in questo collaudo browser. Evidenze `outputs/onboarding-v3-20261017/` del workspace, log test/build/lint esterni al repository.

Le verifiche del backend sulle scritture non sono state ripetute: contratto e codice backend invariati. I test componenti usano API simulate; non sono prove provider o DB. Accessibilità tastiera verificata limitatamente alle interazioni indicate, non audit WCAG completo.

## Resta per la copertura completa del mockup

1. Sostituzione esplicita dei valori già confermati: il backend onboarding attuale supporta keep/defer. Progettare un percorso versionato compatibile con modifica scheda e consensi, senza aggirare il resolver che protegge i dati confermati.
2. Spese per più articoli e quote manuali: oggi il backend conferma il costo solo per un articolo/esemplare. Necessaria estensione del contratto con evidenze delle righe, somma in centesimi, articoli esclusi e controllo server dei duplicati. Nell'app questi casi rimandano a Spese: nessun totale attribuito automaticamente.
3. Vocabolario ordine/consegna/etichetta del mockup e raccordo con classificazione locale: estensione separata, senza riclassificare una consegna come fattura e senza nuovo invio al provider implicito.

La prima integrazione è utilizzabile per i percorsi già supportati. Non equivale alla chiusura delle tre estensioni sopra elencate. Dirty legacy/documentazione preesistente preservati, nessun push o riavvio servizi.
