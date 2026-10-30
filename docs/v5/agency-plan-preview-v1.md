# Agenzie — anteprima originale allineata ai contorni

Nel cablaggio UI è emerso un requisito necessario: il PDF originale non può essere usato direttamente come immagine SVG, e un rendering con DPI scelto diversamente disallinea i vertici. Non è corretto adattare il PDF alle dimensioni del canvas o indovinare la scala.

Il worker ora conserva DPI, trasformazione affine e versione del renderer insieme a dimensioni/SHA del raster. Entrano nel fingerprint della pipeline (raster-seeds-v2-rendering). Snapshot preesistenti senza provenienza rimangono leggibili, ma non si inventa un'anteprima allineata per essi. La misura metrica continua a dipendere dalla barra/calibrazione, non dai DPI.

`authorizedPlanImage` rilegge un piano visibile/corrente e i suoi bytes autorizzati, usa lo stesso renderer/DPI e confronta dimensioni, trasformazione e SHA dei pixel prima di restituire PNG. Fonte revocata/sostituita, raster diverso o metadata assenti impediscono l'overlay. Nessun adattamento silenzioso a un'immagine simile. Le verifiche post-render dei permessi sono conservate.

GET opt-in `/plans/:planId/image` produce PNG con no-store/nosniff. Non registrato nei servizi esistenti. Nessuna nuova lettura di originali personali o chiamata AI: test con PNG e provider sintetici. Il test del worker verifica provenienza persistita e PNG effettivo, poi altera il fingerprint nel solo fixture DB e verifica rifiuto; la route HTTP verifica piano divenuto stale. Rendering PDF/rotazione/DPI già collaudati nel decoder; non nuovo benchmark su PDF reali.

Client frontend `agencyPlanApi` riusa ApiTransport V5 per cookie, account-context, CSRF e Idempotency-Key. Legge pratica/piani, carica PNG come Blob e invia edit; nessun fallback mock o memorizzazione token. Lo scope è catturato alla creazione, non ritargettabile mutando l'oggetto selezione. Harness sintetico rimane distinto dalla modalità reale.

Non è ancora la UI della pratica: workspace, form scala/coefficienti e creazione iniziale del perimetro sono il prossimo task. Segreti/consensi e AI live non attivati. Mancano quote/concorrenza/cache del rendering prima del pilota, oltre all'isolamento OS già segnalato. Se versione/libreria del decoder produce pixel differenti, l'anteprima fallisce esplicitamente e richiede gestione della nuova analisi, senza sovrapporre contorni non verificati.
