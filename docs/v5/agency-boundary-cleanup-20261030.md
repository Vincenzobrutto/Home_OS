# Planimetrie: contorni finali e diagnosi — 30 ottobre 2026

## Implementato e verificato

Il controllo di separazione delle maschere pixel non impediva alla successiva semplificazione di creare poligoni sovrapposti. Ora la segmentazione controlla anche i poligoni finali. Se trova un conflitto, rifinisce solo i contorni coinvolti dai rispettivi bordi pixel originali: tolleranza dimezzata, poi un quarto, infine contorno senza approssimazione aggiuntiva. Nessun muro o separatore inventato, nessuna nuova chiamata AI.

I contorni estranei al conflitto restano identici. Perimetro e buchi vengono ricostruiti insieme e validati. Se la separazione non riesce, entrambe le geometrie ancora in conflitto vengono scartate con issue region_overlap; non si accetta arbitrariamente la prima. Limite8192vertici per memorizzare un bordo esatto di fallback, ulteriori limiti del validatore invariati. La registrazione del risultato applica un secondo controllo pairwise prima di salvare.

Metadato opzionale region.boundary registra simplifyPixels effettivo e refinedForOverlap. Una correzione manuale cancella questa provenienza automatica e imposta origine manuale/seed/component/pixelArea nulli; lo storico precedente resta disponibile. Nessuna migration o endpoint nuovo. Fingerprint pipeline aggiornato a raster-seeds-v3-boundary-guards.

Diagnostica per tentativo di seed: invalid_seed, outside_image, on_ink, open_to_border, too_small, too_large, seed_accepted; indice del tentativo e dimensione della componente quando disponibile. Sono anche espliciti proposal_excluded, boundary_refined e boundary_overlap_rejected. Le issue esistenti restano compatibili. analysisDiagnostics opzionale conserva la diagnostica dell'analisi iniziale nel record, con stessi filtri di visibilità della fonte; non è una diagnosi rigenerata dopo gli edit manuali. Nessuna nuova schermata diagnostica in questo incremento.

Prompt futuro aggiornato per censire cantine/pertinenze separate come candidate con associazione da verificare, controllare strisce esterne per balconi e distinguere le celle della zona servizi. Non assegna titolarità/abitabilità. Efficacia del prompt ancora non verificata con nuove chiamate.

## Replay privato della seconda immagine

Riutilizzate le proposte AI già registrate e gli stessi pixel/configurazione della prova precedente. Nessuna correzione umana dei seed o geometrie, nessun invio esterno o persistenza nella pratica web.

- Prima5contorni con una coppia sovrapposta; dopo5contorni e zero coppie sovrapposte.
- Due soli contorni rifiniti a0,5pixel. Gli altri tre verificati identici punto per punto e nei buchi. Maschere/aree pixel originali invariate; differenze di area dei due poligoni rispettivamente -1,5 e -19pixel quadrati, nessuna conversione in metri.
- Quattro issue ancora aperte. Vano ovest e corridoio raggiungono una componente aperta verso il bordo dell'immagine; zona servizi1139pixel sotto la soglia1500. Piccolo passaggio ancora accorpato al vano sud. Cantina esclusa e balcone omesso nel censimento registrato: il replay non ricrea proposte assenti.

Questo dimostra la correzione dell'overlap su questo caso, non una ricostruzione completa o un tasso di copertura generale.

## Esperimenti separati, non applicati al prodotto

Sei confronti locali: chiusura binaria dei tratti con raggio0/1/2pixel, soglia minima1500/500pixel, stesse proposte AI. La soglia500 recupera una componente della zona servizi, non ne dimostra la completezza; chiusura2più soglia500 produce7componenti ma continua a non delimitare vano ovest/corridoio e introduce18728pixel neri nell'intera immagine. Raggio1 introduce6454pixel senza recuperare quei due spazi. Rimangono simboli/associazioni incerti.

Non scegliere una variante dal solo numero di regioni, non abbassare globalmente la soglia né chiudere porte automaticamente. Questi esperimenti restano privati e non diventano geometrie salvate. Per la prossima fase servono proposte di ripristino locale dei tratti, sovrapposte all'originale e verificabili, e un criterio di soglia adeguato alla risoluzione senza trasformare frammenti in vani completi.

## Verifiche e consegna

55/55 test mirati,584/584 backend ordinari,21/21 su nuovo PostgreSQL sintetico posseduto, build e lint mirato verdi. Nuove prove sintetiche per separatore obliquo con maschere distinte, inversione ordine dei vani, input raster immutato, diagnosi differenziata/seed alternativo, blocco alla registrazione e metadati/provenienza manuale. Primo fixture diagnostico superava il limite di tre seed: corretto il fixture, limite invariato. Nessun test usa geometrie personali nel repository.

Cluster di test fermato a fine suite, nessun DB esistente riutilizzato. Demo Alessio pulita e invariata; nessun merge o deploy. Nessun nuovo test browser: il trial precedente è scaduto alle16:15 e non viene riavviato implicitamente. Nessun nuovo invio AI/costo, ledger e riserve invariati. Originale, risposte registrate e replay/esperimenti soltanto nella cartella privata della chat. Grafico di confronto e relazione negli output.
