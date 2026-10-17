# Onboarding assistito degli oggetti dai documenti — V1

17 ottobre 2026. Sviluppo autorizzato dal committente. Estensione additiva del percorso Documenti V2 e della ricevuta assistita: non sostituisce archivio, schede o spese. La prima implementazione offline non abilita ancora il percorso nell'app.

## Esperienza attesa

Carica uno o più documenti → lettura → proposta di organizzazione e, quando il documento descrive prodotti, «Oggetti individuati». Una scheda per prodotto, anteprima originale accessibile, dati mancanti lasciati vuoti. Si può organizzare soltanto il documento oppure confermare anche gli oggetti; non è obbligatorio farlo nello stesso momento. Rinvio e rientro persistenti.

Per ogni prodotto: nome proposto modificabile, marca/modello soltanto se leggibili, quantità esplicita se disponibile. Mostrare eventuali corrispondenze della stessa casa e account, ambiente e motivazione. Azioni Crea oggetto / Collega a oggetto esistente / Salta. Nessuna scelta predefinita quando ci sono corrispondenze o ambiguità. In assenza di corrispondenze evidenziare «Puoi creare un nuovo oggetto», senza crearlo. La ricerca manuale delle schede rimane disponibile.

Un documento può descrivere più prodotti. Nessun taglio silenzioso al primo; limite iniziale 20 righe e 20 oggetti creati per conferma, segnalazione esplicita oltre il limite. Quantità >1 richiede una scelta sulle unità, non crea venti schede automaticamente. Consumabili, servizi e accessori incerti non sono proposti automaticamente come oggetti della casa. Testo troncato resta troncato, senza completamenti inventati.

## Caso guida Amazon

Screenshot di mail «In consegna» con Amazon Echo Dot Max, quantità1: proporre un oggetto con il nome leggibile e collegare l'email originale soltanto dopo conferma. Non affermare che è stato consegnato/installato; non derivare ambiente, garanzia o data di acquisto. Non creare spesa perché manca il prezzo. Mittente Amazon.it da solo non prova la marca di ogni prodotto.

Ordine e consegna non sono ricevute di pagamento. Questo incremento NON propone né scrive spese; la ricevuta assistita esistente resta il percorso economico distinto. Un totale d'ordine non viene distribuito fra gli oggetti. Resi/annullamenti non eliminano oggetti esistenti.

### Secondo caso guida: consegna con tre articoli

Esempio fornito dal committente il17ottobre: una sola schermata con cavo prolunga SMA, router4G LTE e un set di pulitori, ciascuno quantità1. I titoli visibili sono troncati: non ricostruire modello o descrizione completa. Conservare un solo documento e tre righe da valutare indipendentemente; non confondere tre articoli con quantità3 dello stesso prodotto. Il numero d'ordine non identifica un singolo oggetto.

Il router può essere proposto come nuova scheda o collegato a uno esistente. Per il cavo, offrire la possibilità di collegare il documento alla scheda pertinente (per esempio router), creare una scheda separata se utile, oppure saltare: il collegamento al router non va dedotto dalla sola presenza nello stesso ordine. Il set di pulitori può essere saltato o valutato manualmente senza imporre una scheda. La classificazione accessorio/consumabile resta una proposta da verificare: non escludere definitivamente articoli che l'utente vuole conservare.

Prova di accettazione da implementare: tre righe rilevate → utente sceglie crea router, rinvia cavo, salta set → un solo nuovo oggetto e nessuna spesa; originale invariato e rientro sul solo articolo rinviato. La schermata personale non è una fixture da committare né una fonte autorizzata per chiamate esterne. Usare una riproduzione sintetica per i test automatici.

## Evidenze e matching

### Quarto caso guida: fotografia dell'etichetta di un apparecchio

Il committente autorizza il percorso Foto etichetta→identificazione→scheda precompilata con più informazioni attendibili possibili, riducendo la compilazione manuale a un controllo/conferma. La foto diventa fonte originale collegabile alla scheda, senza obbligare a caricare una ricevuta. Supportare immagine inclinata/sfocata e proporre una seconda foto soltanto quando i codici necessari non sono leggibili. Ritaglio/rotazione per lettura non sostituiscono l'originale.

Esempio17ott2026: marca Moulinex, riferimento leggibile AL4018F0, potenza2200W, alimentazione220–240V/50–60Hz. Il sito ufficiale Moulinex associa esattamente AL4018F0 a Easy Fry XL Surface, friggitrice ad aria, capacità4L. Identificazione del prodotto e capacità sono arricchimento da fonte produttore; dati elettrici vengono dalla foto. Non attribuire a OCR indipendente questa lettura. Foto personale non inviata a provider.

Ricerca web con marca+riferimento prodotto, mai seriale, nome utente, indirizzi, immagine intera o ID di casa/account. Privilegiare produttore e manuali ufficiali, corrispondenza esatta del riferimento e variante/regione. Se non c'è una corrispondenza univoca, mostrare alternative o chiedere controllo del codice, senza scegliere il primo risultato. I dati trovati online rimangono distinti dai dati letti nella foto, con URL/data consultazione e campo cui si riferiscono. Nessun recupero indiscriminato di URL/QR presenti nella foto; solo fonti selezionate e controllo dell'accesso server. Nessun download automatico di manuali/accessori di modelli solo simili.

Precompilazione attesa: nome comprensibile, tipo apparecchio, marca, riferimento commerciale/modello, eventuale seriale esatto se esplicitamente etichettato, potenza con unità, tensione/frequenza, altre caratteristiche documentate dal produttore e link alla pagina/manuale quando verificati. Non confondere type/ref/SKU/lotto/data produzione/seriale. Se il documento non espone il nome del prodotto, il nucleo deve accettare una proposta di identificatore prima dell'arricchimento: il nome ricavato dal catalogo non deve essere presentato come citazione letterale della foto. Evitare un contenitore generico di note: campi tipizzati e fonti per campo, ampliando il contratto prima della UI.

Non dedurre data acquisto, costo o decorrenza garanzia dall'etichetta o da un codice di produzione. Il prezzo corrente online non è il costo storico dell'utente. Potenza nominale2200W non è consumo misurato né stima annua. L'ambiente si propone solo se noto dal contesto scelto dall'utente, non dalla categoria apparecchio. Per garanzia24mesi serve comunque una data di partenza: dalla sola etichetta resta vuota.

Prima di creare: cercare schede della stessa casa/account; brand+modello identifica il modello, non l'esemplare fisico. Seriale affidabile o collegamento precedentemente confermato costituiscono evidenza più forte, mai associazione automatica per modello se due esemplari possibili. Su scheda esistente riempire vuoti e presentare differenze senza sovrascriverle. L'utente vede una proposta già compilata, confermabile in un'unica azione; può correggere/omettere campi e associare una scheda esistente.

Nuovi requisiti tecnici da implementare oltre O1: documentKind device_label, identificatori anche senza name, campi tecnici tipizzati/unità e fonti esterne separate, ricerca catalogo controllata, riconciliazione seriale, preview e conferma unica. I tre campi name/brand/model dell'adattatore O1 NON coprono ancora questo caso. Collaudi sintetici: riferimento esatto e ambiguo, O/0 e I/1, due apparecchi uguali, seriale mancante, valori diversi fra etichetta e catalogo, manuale variante sbagliata, foto senza nome commerciale e nessun costo/data inventato.

Fonte verificata17ott2026: [Moulinex AL4018F0 — pagina prodotto ufficiale](https://www.moulinex.it/p/easy-fry-xl-surface-friggitrice-ad-aria-grande-superficie-di-cottura-visore/1510002932). Nessun dato dell'utente salvato nell'app o nel catalogo durante l'ispezione.

#### Manuale online nella scheda — requisito approvato17ottobre

Durante l'identificazione/arricchimento cercare anche il manuale ufficiale per l'esatto riferimento del prodotto. Nella scheda confermata mostrare, nella sezione Documenti e manuali, il collegamento «Apri manuale sul sito del produttore», con produttore, lingua quando nota e riferimento del modello. In fase1 basta il link esterno: nessun download o copia del PDF nell'archivio personale. Il manuale online resta distinto dai documenti originali caricati dall'utente.

Preferire il manuale specifico ufficiale (PDF o pagina che lo espone) rispetto alla pagina commerciale. Se il manuale riguarda una famiglia, verificare che includa esplicitamente il riferimento identificato. Se il produttore richiede di scegliere lingua o variante, collegare la pagina ufficiale specifica di supporto con etichetta «Istruzioni e assistenza»; non chiamarla manuale già trovato. La semplice pagina prodotto o un risultato del motore di ricerca non è un manuale verificato. In assenza di una corrispondenza attendibile non inserire link arbitrari; mantenere disponibile l'aggiunta manuale.

La proposta di link è inclusa nella conferma della scheda, senza un ulteriore passaggio obbligatorio. Conservare URL, riferimento prodotto e data di verifica; apertura esterna con comportamento accessibile e sicuro, senza trasmettere identificatori personali/seriale. Nuova identificazione o cambio modello non riusa silenziosamente il link precedente. URL non più disponibile: la scheda e i documenti caricati restano utilizzabili, con possibilità di correggere il link.

Prove richieste: manuale esatto; manuale famiglia contenente il modello; variante non corrispondente; sola pagina assistenza; nessun risultato; più lingue; link non disponibile; modello modificato; documento personale e link esterno distinti. Funzione da implementare, non ancora collegata al nucleo O1.

### Terzo caso guida: ricevuta Amazon PDF scaricata

Esempio personale esaminato soltanto in locale il17ottobre: PDF testuale di una pagina, intestato Ricevuta d'acquisto, con una macchina del ghiaccio, quantità1 nella colonna «Qtà», data ordine/ricevuta esplicita, prezzo articolo/totale e spedizione gratuita. Il documento dichiara di non essere valido come fattura. L'originale personale non va copiato nel repo né trasmesso al provider sulla base di questa sola ispezione.

Atteso: organizzare come ricevuta in Acquisti e garanzie, proporre un oggetto con nome breve comprensibile ricavato dalla descrizione; conservare la descrizione originale come evidenza. Dati tecnici presenti nel titolo (capacità, produzione, colore) non devono essere scambiati per modello o seriale. Il venditore del marketplace non è automaticamente la marca; ASIN, SKU ed EAN non sono un modello certo. Campi marca/modello assenti o ambigui restano vuoti.

A differenza della mail di consegna senza prezzo, questa ricevuta può alimentare ANCHE il percorso economico esistente: proposta di costo separata, facoltativa, con importo/data rilevati da controllare e verifica di un costo già presente. Non allargare implicitamente l'endpoint oggetti alla scrittura di spese. Il medesimo importo compare in prezzo articolo, totale e riepilogo pagamento: una sola spesa, non tre. Spedizione zero non crea un'altra spesa; nessuna data di pagamento dedotta da «pagato» senza data esplicita. Oggetto e costo possono essere confermati indipendentemente, collegati allo stesso originale.

Casi sintetici da aggiungere prima del rilascio: quantità tabellare «Qtà» (il primo nucleo riconosce solo etichette Quantità/Quantity/Qty); descrizione commerciale oltre120caratteri da abbreviare in modo dichiarato senza perdere la citazione; totale su più colonne/righe; venditore diverso dalla marca; codici commerciali non scambiati per modello; prezzo ripetuto senza duplicati. Questi casi sono requisiti aperti, non prove già verdi del parser attuale.

PDF testuale: citazione letterale verificata sulle pagine estratte dal parser. Immagine JPEG/PNG: osservazione del provider con estratto e riquadro della regione, vincolata a versione/SHA del file. Una citazione da immagine non è verificata da un secondo OCR: etichetta «Letto dall'immagine · da controllare», mai «dato verificato». Il riquadro indica dove controllare, non dimostra che il contenuto sia vero. Confidenza bassa: nessun suggerimento arbitrario. Nessuna inferenza di proprietà dal semplice caricamento.

Matching per singolo articolo: stessa marca+modello completi oppure nome completo esatto normalizzato, con motivazione e conferma. Non usare solo tipo, negozio, prezzo o documento collegato: una mail con due prodotti può già essere collegata a uno solo. Un collegamento confermato alla specifica riga/fingerprint è evidenza prioritaria. Nomi troncati non generano matching per solo nome. Nessuna ricerca su account altrui o fonti revocate; nessun catalogo della casa inviato al provider.

## Scritture e ripresa

### Inizio garanzia precompilato — decisione committente17ottobre

Quando è disponibile una data di acquisto esplicita e attribuibile al prodotto, precompilare «Inizio garanzia» con quella data. Mostrare accanto «Proposto dalla data di acquisto», lasciando modificare o svuotare il campo prima della conferma. È una proposta derivata autorizzata dal committente, non una clausola di garanzia letta nel documento: conservarne la provenienza distinta e il riferimento alla data di acquisto sorgente. Questa decisione prevale sul divieto generico di proporre una data di garanzia inferita, limitatamente a questo campo e a questa derivazione.

Se il documento specifica una diversa decorrenza della garanzia, mostrarla come proposta documentale prioritaria; in presenza di informazioni discordanti chiedere quale usare. Non derivare la data di acquisto dalla data di upload, dall'arrivo previsto o dalla sola spedizione. Una data d'ordine o di emissione ricevuta non identificata come acquisto richiede controllo, non diventa silenziosamente acquisto certo.

Un inizio garanzia già confermato non viene sovrascritto: mantenere il dato e presentare l'eventuale differenza. Una modifica manuale ha provenienza utente; la conferma della proposta mantiene traccia della derivazione dall'acquisto. Nessuna affermazione di copertura certificata o validità giuridica.

Prove da implementare: acquisto esplicito→precompilazione modificabile; mail solo consegna prevista→campo vuoto; decorrenza specifica diversa→confronto; garanzia già confermata→nessuna sovrascrittura; data corretta/svuotata→scelta conservata. Requisito approvato, non ancora campo implementato nel nucleo O1.

### Scadenza proposta a24mesi — aggiornamento committente17ottobre

Precompilare anche la scadenza con inizio proposto+24mesi di calendario, modificabile o eliminabile prima della conferma. Questo aggiornamento sostituisce la decisione precedente di lasciare sempre vuota la scadenza in assenza di durata documentata. Etichetta «Scadenza proposta · 24 mesi, da verificare», provenienza default proposto distinta da durata letta nel documento. Non presentarla come copertura giuridicamente verificata o termine universale.

Per la garanzia legale dei beni nuovi acquistati da un consumatore presso un professionista, i due anni decorrono dalla consegna: se è disponibile una data di consegna effettiva attribuibile al prodotto, preferirla alla data di acquisto per questa proposta e mostrarne la ragione. In assenza usare l'acquisto come approssimazione esplicita da confermare. Una consegna prevista non è effettiva. Data di partenza assente→nessuna scadenza inventata. Fine mese/29febbraio: aritmetica di calendario con giorno limitato all'ultimo del mese di destinazione, non730giorni.

Se risultano acquisto professionale, vendita da privato, bene usato o altre condizioni diverse, non affermare automaticamente il minimo legale24mesi: chiedere controllo dei termini e preferire quelli documentati. Per usato in Italia può essere concordata durata inferiore, non sotto un anno. La modifica manuale permette di indicare estensioni o termini differenti, conservando la fonte e senza cancellare la distinzione fra garanzia legale e commerciale. Non sovrascrivere date già confermate; una durata o data esplicita discordante richiede confronto. Non sommare automaticamente24mesi e un'estensione: potrebbe indicare durata complessiva, anziché aggiuntiva.

Prove ulteriori:24mesi proposti con acquisto noto; consegna effettiva successiva→base corretta; solo consegna prevista→non usata; estensione totale36mesi→nessun doppio conteggio; modifica manuale conservata; usato/professionale/privato→controllo termini;29febbraio e date di fine mese; dato già confermato invariato. Requisito di prodotto, ancora da implementare e collaudare.

Fonti verificate17ott2026: [Your Europe — decorrenza dalla ricezione e acquisti da privati](https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/faq/index_en.htm), [Commissione europea — garanzia minima e beni usati](https://commission.europa.eu/document/download/a169af63-90f9-44b5-80c5-24574ac4fa15_en?filename=EU+legal+notice.pdf). Il comportamento UI resta una proposta assistita da confermare.

Analisi produce soltanto proposte persistenti. Conferma atomica con snapshot fonte, versioni bozza/target, membership riletta, chiave stabile e ricevuta recuperabile. Riusare risorsa/collegamento già presenti. Non sovrascrivere marca/modello confermati: confronto e mantieni/rinvia come ricevuta assistita. Doppio click, risposta persa, rianalisi e copia identica non duplicano oggetti. Fonte revocata/cambiata blocca la conferma e redige dati dipendenti. Originale e privacy invariati.

Ogni unità creata deve avere identità distinta; due righe non possono selezionare implicitamente la stessa scheda. Se il documento ripete il prodotto nel titolo e nell'elenco, l'estrazione deve restituire una sola riga. I documenti casa (APE, SCIA, regolamento) restano validi anche senza alcun oggetto.

## Implementazione e gate

1. Contratto estrazione multiarticolo, evidenze testo/immagine, matching privato e pianificazione scelte: offline, senza DB/provider attivo.
2. Adattatore multimodale e collaudo con trasporto finto: hash, limiti, output malformato, istruzioni nel documento, nessuna rete durante i test.
3. Persistenza dedicata di job/bozze/righe/esiti e budget; non inserire JSON V2 nei ReceiptDraft V1. Migrazioni additive e collaudo DB/HTTP sintetico.
4. Ingresso unico da Documenti, componenti mobili, ripresa, creazione/collegamento e regressioni ricevuta V1. Nessun pulsante separato obbligatorio durante upload.
5. Browser con screenshot sintetico, più prodotti, duplicati e target ambigui; poi provider reale con consenso e budget distinti.

L'analisi automatica locale gratuita resta tale. Per l'immagine occorre consenso esplicito all'invio del file (anche dati personali), campagna e budget propri. Mai fallback esterno automatico quando il PDF locale non è leggibile. Count_tokens è anch'esso un trasferimento; nessuna chiamata prima del consenso. Campagne ricevute precedenti concluse non vengono riutilizzate. Lo screenshot personale allegato non va inviato finché il consenso specifico non arriva.

Prove obbligatorie: uno/due/nessun prodotto; due unità; testo troncato; consumabile; reso; documento illeggibile; stesso modello in due stanze; altro account/casa/archiviato; nome uguale ma modello discordante; fonte identica senza riuso improprio di tutte le righe; fonte cambiata/revocata; rollback/replay; zero spese da mail di consegna.


## Consolidamento del caso Echo — validazione del committente, 17 ottobre 2026

Il committente ha completato la conferma nell’app e dichiara di vedere la scheda Amazon Echo Dot Max con marca Amazon, modello Echo Dot Max e screenshot di consegna collegato. Questo chiude il caso reale singolo «mail di consegna → oggetto», comprensivo di revisione del nome e accettazione delle proposte marca/modello ricavate dal titolo. Non equivale alla validazione reale di multiarticolo, foto etichetta o fattura, tuttora distinta dai test sintetici.

Regole consolidate:
- L’analisi propone; la conferma dell’utente crea o collega la scheda. Il documento originale resta collegato e privato secondo la visibilità già scelta.
- Nome commerciale correggibile; marca/modello ricavati localmente solo da titoli riconoscibili, origine `derived_from_product_name` e conferma. Dati espliciti e campi già confermati protetti; nessuna nuova chiamata provider per la derivazione.
- La mail senza prezzo non crea una spesa e non inventa costo o data d’acquisto/garanzia. Oggetto, prova documentale e costo hanno conferme indipendenti.
- Una futura fattura/ricevuta dell’Echo deve permettere di scegliere l’oggetto già esistente, aggiungere l’originale e proporre la spesa attribuibile. Se il costo è già presente va riusato/confrontato, mai duplicato; nome o stesso modello non autorizzano un collegamento automatico in caso di ambiguità. Eventuali dati discordanti restano da decidere, senza sovrascrittura.
- Data documentata e garanzia proposta restano distinguibili; nessuna garanzia ricavata dalla sola consegna prevista.
- Riferimento preciso facoltativo, distinto da modello/numero ordine/seriale. Recupero online da marca/modello e disambiguazione delle varianti, insieme alla descrizione/help del campo, rimandati su richiesta del committente.

Implementazione e prove: `object-onboarding-api-contract-v2.md` e `object-onboarding-development-20261017.md`. Le note O1 sopra sono storiche: persistenza/UI/default garanzia sono ora implementati e collaudati con sintetici; questa accettazione reale riguarda esclusivamente il caso Echo descritto. Provider disabilitato dopo il collaudo, nessuna autorizzazione implicita per altri documenti o analisi.


## Direzione UX da integrare — proposta unica dopo caricamento (17 ottobre 2026)

Il committente richiede di evitare il passaggio separato «organizza il documento» → «organizza gli oggetti». Dopo la lettura, la stessa schermata deve proporre insieme classificazione del documento, creazione/collegamento degli articoli identificati e costo attribuibile, quando presente. Nessuna corrispondenza plausibile → proposta di nuova scheda; corrispondenze plausibili → scelta delle schede esistenti, senza associazione implicita o certezza di assenza basata sulla sola prima pagina. Il consenso al provider esterno può essere raccolto nel caricamento, specificando file/limiti, prima di qualunque trasferimento; non è implicito nell’upload locale. Nessuna creazione, spesa o sovrascrittura senza conferma. Copie, conflitti, più articoli e analisi non disponibile mantengono percorsi espliciti. Direzione registrata; integrazione UI e transazioni da definire/verificare dopo la prova della fattura in corso, non ancora implementata.


### Attuazione del flusso integrato

Il caricamento mostra direttamente un riquadro oggetti/spesa per ricevute, fatture, manuali, garanzie e foto; documenti della casa come APE mantengono il percorso documentale. Analisi esterna solo con consenso e configurazione abilitata; nessun nuovo upload o ingresso in un’altra pagina richiesto. Dopo proposte pronte la conferma coordina documento e articolo/spesa nei casi chiari. Copie, conflitti e tipo sconosciuto richiedono revisione individuale. Stato parziale esplicito: un documento già archiviato può avere ancora articoli da correggere o confermare, quindi il contatore documenti non certifica completamento di oggetti/spese. Dettagli di recupero e limiti nel contratto v2.
