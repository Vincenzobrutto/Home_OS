# Planimetria Agenzie — una mappa, tre attività — 9 novembre 2026

Autore: Claude, sul checkout `work/agency-quick-surfaces-20261105`, ramo `codex/agency-quick-surfaces-20261105`. Il lavoro parte dalle modifiche locali non committate già presenti (numerazione stabile delle verifiche, perimetro esterno proposto dall'analisi, copertura dei balconi) e le conserva. Committato sul ramo `claude/agency-plan-page-20261109`, creato dal checkout (comprende i 6 commit locali di Codex non ancora pubblicati sulla PR #83 e le sue modifiche non committate) e proposto con una PR verso `codex/agency-quick-surfaces-20261105`. Nessun merge: decide il committente.

## Richiesta

Ridurre passaggi e informazioni nella pagina Planimetria di Dimora Agenzie, partendo da due compiti dell'agente: calcolare le superfici e preparare la pianta per l'annuncio.

## Collaudo iniziale (prima)

Su una pratica sintetica locale (harness `agency-plan-page-preview.html`, API in memoria persistita in `sessionStorage`, nessuna AI), viewport 1280 px.

| Caso | Osservato nel browser | Ricavato dal codice |
| --- | --- | --- |
| Planimetria appena caricata | Mappa sotto a «Definisci scala» e a un pannello chiuso «Controlla le verifiche aperte · 2». Calcola superfici e Prepara pianta per annuncio sono in fondo alla pagina, dopo la mappa e «Note e modifiche». | Le verifiche erano pannelli chiusi annidati, ognuno con una mini-mappa propria, scollegata dalla mappa principale. |
| Bozza dei vani da correggere | Per vedere dove sta una verifica si apre il pannello, poi il pannello della singola verifica; la correzione si fa su un'altra mappa. Motivo obbligatorio per chiudere una verifica. | Un solo contorno in modifica alla volta; cambio vista bloccato solo in parte. |
| Pronta per calcolare/esportare | Entrando in Calcola superfici la mappa sparisce. Il perimetro proposto si vede solo dopo «Controlla perimetro proposto», che apre una seconda mappa con un secondo livello di schede (Singoli vani / Perimetro commerciale) e un prospetto commerciale vuoto («Da calcolare»). | «Salva scelte balconi» separato da «Salva perimetro lordo»; la scala scelta (formato foglio, due punti) non era salvata e si perdeva alla riapertura. «Prepara pianta per annuncio» portava a un'altra area della pratica. |

Screenshot prima/dopo: consegnati nella chat del committente (dati sintetici), non aggiunti a Git.

## Proposta implementata

- **Una sola mappa di lavoro** con tre attività in un unico gruppo di pulsanti: **Modifica pianta**, **Calcola superfici**, **Pianta per annuncio**. Su desktop la mappa resta a sinistra (fissa allo scorrimento) e il pannello contestuale a destra; a 375 px il pannello segue la mappa. Una riga «prossimo passo» dice cosa fare nel caso corrente. Niente secondo livello di schede.
- **Apertura**: la pagina apre su Modifica pianta se ci sono verifiche aperte o manca il perimetro, altrimenti direttamente su Calcola superfici.
- **Modifica pianta**: toolbar della mappa con Seleziona, Aggiungi vano, Elimina, zoom (rotellina fino al 600%, + / − / 1:1), Salva modifiche e Scarta modifiche. Vertici piccoli; aggiungi/elimina punto e annulla compaiono solo con un vano selezionato. I vertici sono raggiungibili con Tab e si spostano con le frecce (Maiusc per passi ampi), Canc elimina il punto.
- **Verifiche aperte** nel pannello accanto alla mappa: nome del vano, numero stabile, descrizione e «Mostra sulla mappa», che seleziona il vano e marca il punto del simbolo quando è noto. L'esito si sceglie in un menu; la nota è facoltativa (se vuota si registra l'esito stesso). Una verifica chiusa sparisce dall'elenco.
- **Calcola superfici** sulla stessa mappa: perimetro lordo (salvato, proposto o in modifica) e balconi/pertinenze sono interattivi; i vani interni restano visibili tratteggiati come contesto. Il riepilogo mostra insieme scala usata, lordo dell'appartamento, pertinenze ponderate e totale stimato, con **Salva stima** accanto.
  - Scala: barra metrica riconosciuta se disponibile; altrimenti scala dichiarata + formato del foglio; correzione con due punti sulla mappa in ogni caso. Se manca del tutto, il pannello lo dice e offre entrambe le strade.
  - Perimetro: la proposta di Dimora si corregge sulla mappa e si conferma con Salva stima; senza proposta, «Disegna perimetro» è sia nella toolbar sia nel pannello, e intanto la stima usa vani + maggiorazione muri. Con un perimetro lordo la maggiorazione muri non viene aggiunta.
  - Balconi: per ognuno Coperto/Scoperto, superficie, coefficiente applicato (35% / 25%, ipotesi modificabili) e contributo; «Aggiungi balcone» per i contorni mancanti. Un balcone che si sovrappone al lordo per più del 5% è evidenziato in arancione sulla mappa e segnalato come rischio di doppio conteggio.
  - Una sola tabella «Superfici dei vani»; nessun prospetto vuoto.
  - Un'unica sezione «Impostazioni avanzate · facoltative»: riferimento della scala, maggiorazione muri, coefficienti e il computo dettagliato (modulo esistente, montato solo all'apertura).
- **Salva stima** esegue in sequenza la conferma del perimetro (se proposto o corretto) e il nuovo comando `save_quick_estimate` con coperture e scala in uso. La stima salvata è dichiarata come tale («Stima salvata il …, si ricalcola dai contorni attuali; non computo dettagliato né misura certificata»).
- **Pianta per annuncio** dentro la pagina: anteprima generata subito dai soli contorni e nomi dei vani salvati, senza intestazione, dati catastali o personali del PDF; conferma «pianta completa» e download PNG. L'area Annuncio della pratica mantiene la propria esportazione. La Gift non compare in questa pagina.
- **Modifiche da salvare**: con un contorno in modifica le altre attività sono disabilitate, la riga del prossimo passo lo dice, compaiono Salva/Scarta e la chiusura della scheda chiede conferma (`beforeunload`).

Rimosso dal flusso principale: «Definisci scala sulla mappa» nella vista di disegno (la scala vive in Calcola superfici), il pannello «Note e modifiche» con motivo libero, le mini-mappe per singola verifica, il toggle «Controlla/Chiudi mappa del perimetro», la seconda mappa con schede e il rinvio all'area Annuncio.

## API

Nuovo comando di modifica `save_quick_estimate` (sostituisce `save_balcony_covers`, mai rilasciato: era solo nelle modifiche locali). Corpo: `covers` (0–100 balconi, `covered|uncovered|unset`) e `scale` facoltativa: `{mode:'paper',format:'A4'|'A3'|'A2'|'A1',denominator:1..10000}` oppure `{mode:'manual'|'bar',start,end,metres}`. Il piano conserva `balconyCovers` e `quickEstimate={scale?,savedAt,geometryRevision}`; le aree non sono salvate e si ricalcolano dalla geometria corrente. DTO a chiavi esatte; balconi verificati sul tipo/nome del vano. Nessuno schema o migrazione: i dati stanno nel JSON della pratica come le altre analisi.

## Correzione al riconoscimento della barra

Quando l'OCR unisce l'ultima etichetta e l'unità («4m»), il centro dell'etichetta si spostava e la tacca finale non veniva trovata. Ora il centro è calcolato sulla sola parte numerica. Test dedicato in `scaleDetection.test.ts`.

## Verifiche eseguite

- Backend: `npm run test:agency-plans` 133/133 (nuovi casi: stima con copertura e scala A3 persistita e riletta, rifiuto di copertura su un vano non balcone, DTO della stima con scale valide e non valide, vecchio comando rifiutato).
- Frontend: suite agenzie (`vite.agency-plans.config.ts`) 99/99; `scaleDetection.test.ts` 10/10; typecheck, ESLint sulla cartella agenzie e build verdi.
- Browser, harness sintetico, desktop 1100–1280 px e 375 px:
  - pianta con balcone riconosciuto e perimetro proposto con un vertice errato: rischio di doppio conteggio segnalato; vertice corretto da tastiera (Tab + frecce) fino a (900,640), segnalazione sparita, lordo 63,8 m²; Coperto → 2,6 m² di pertinenze, totale 66,4 m²; Salva stima → due modifiche in sequenza;
  - riapertura (ricarica): copertura, perimetro e scala ritrovati, totale ricalcolato subito e marcato «Stima salvata» (provato con scala a due punti 4 m + Scoperto → 65,6 m², e con 1:50 + A4 → 66,2 m²);
  - scala solo dichiarata: richiesta del formato; scala mancante: messaggio e due alternative; nessuna proposta di perimetro: disegno manuale da toolbar/pannello, poi stato «in modifica»;
  - verifica del Bagno: «Mostra sulla mappa» seleziona il vano e marca il simbolo; chiusa, sparisce e l'altra mantiene il n. 2;
  - modifiche da salvare: attività bloccate, Scarta ripristina il contorno;
  - Aggiungi balcone: dialogo precompilato, nuovo balcone nell'elenco con Coperto/Scoperto e selezionato sulla mappa;
  - Pianta per annuncio: anteprima dai contorni, 7 vani;
  - 375 px: nessuno scroll orizzontale (scrollWidth 375), toolbar e riepilogo leggibili; console senza errori su caricamento pulito.
- Nessuna chiamata AI o servizio a pagamento; nessun dato reale.

## Limiti e lavoro residuo

- Nel pannello browser dell'agente, quando era nascosto, l'OCR locale è andato più volte in timeout (45 s): la barra sintetica è stata riconosciuta in una sessione, non in altre. Per questo la barra riconosciuta viene ora salvata con la stima (`mode:'bar'`) e la riapertura non rilegge il documento. Da riprovare in un browser visibile sulla pratica reale.
- La barra della fixture è stata ridisegnata (cifre più grandi) perché Tesseract non leggeva le etichette piccole: limite della fixture, non garanzia di riconoscimento su scansioni reali.
- Il collaudo è su dati sintetici e harness locale, non sul runtime agenzie reale né su un database: il comando `save_quick_estimate` è coperto da test di dominio/DTO, non da test HTTP/DB dedicati.
- I coefficienti dei balconi (35% / 25%) restano quelli già presenti nel codice: ipotesi di lavoro da confermare con il committente, non regola normativa.
- Su 375 px «Salva stima» è subito sotto la mappa, non fisso a schermo: dopo una correzione sulla mappa serve uno scorrimento breve.
- Il ramo legacy non embedded del workspace (anteprima interna `__preview__/workspace.tsx`) non è stato ridisegnato.


## Revisione Codex della PR 84

Il rapporto letto tramite OCR è una proposta da confermare o correggere prima di calcolare. La stima rapida salva in un unico comando scala, coperture, maggiorazione, coefficienti personalizzati ed eventuale correzione del contorno. La stima si ricalcola dopo la riapertura con gli stessi parametri.

Il test HTTP/DB verifica una scrittura unica, la rilettura con un nuovo client, l'idempotenza e la mancata scrittura del contorno se la scala è respinta. Collaudo nel browser su una copia isolata della stessa planimetria e dei contorni già analizzati, con AI disabilitata: dopo salvataggio e ricarica, misura manuale di prova, balcone coperto e totale coincidono. La misura di prova non rappresenta un rilievo reale.

## Modifica diretta durante le verifiche

Per un vano già presente, Modifica contorno esce dal confronto in sola lettura, seleziona il vano e rende visibili i vertici sulla stessa mappa. La modifica si salva esplicitamente prima di registrare l’esito. Verificati 45 test mirati, typecheck e build; sulla copia della pratica è stato spostato un vertice e poi scartata la modifica, senza scritture.

I vertici hanno un bersaglio di dimensione costante sullo schermo. Quando i bersagli si sovrappongono, il clic seleziona il punto più vicino. Il trascinamento preserva la posizione relativa alla presa e il clic semplice abilita l’eliminazione senza spostare il punto. Ogni trascinamento registra un solo passaggio annullabile.
Nel collaudo sulla stessa pratica, un clic ha selezionato il vertice senza alterare il contorno, il trascinamento ha spostato il punto scelto e l’eliminazione ha ridotto il vuoto del Soggiorno da quattro a tre vertici. La prova è stata scartata. Typecheck, lint, build e 45 test mirati passati.

La barra sopra la mappa include i comandi dei vertici quando si seleziona un contorno modificabile. Verificata sulla pratica di collaudo con la verifica Disimpegno n. 3, a zoom 500% su desktop e a 390 px. Build e 34 test del workspace passati.

In modalità Aggiungi punto, il clic inserisce il vertice nel punto corrispondente sul lato. Il mouse può scorrere la planimetria, mentre Ctrl + rotellina ingrandisce o riduce attorno al cursore anche nel dialogo di disegno. Ai limiti dello zoom il gesto modificato resta sulla mappa.

Le future evoluzioni dell’export seguono lo [standard di prodotto per la planimetria da annuncio](agency-listing-floor-plan-standard.md).

La resa illustrativa semplifica i contorni entro una tolleranza proporzionata, protegge i confini tra vani e disegna una volta sola i tratti coincidenti. Balconi e terrazzi riconosciuti hanno un riempimento dedicato. Il bordo è più marcato sui lati esterni identificabili agli estremi del disegno. Verificati 37 test mirati, typecheck, lint e build. Sulla copia della stessa pratica con 11 vani, il PNG scaricato in Chrome coincide byte per byte con l’anteprima. Il cambio di zoom dell’editor produce lo stesso PNG.

L’illustrazione semplifica anche gruppi di segmenti corti su un unico allineamento. Il limite di deviazione si riduce nei vani stretti e nei vuoti. Rientranze profonde, tratti condivisi e cambi di direzione già netti mantengono i loro confini. Il nuovo PNG della stessa pratica elimina la sequenza di scalini sul lato lungo del terrazzo e coincide con l’anteprima. Verificati 39 test mirati, typecheck, lint e build.

L’export attenua anche rientri brevi del ricalco e rende parallele le facce interne vicine quando la correzione è lieve e supera i controlli di intersezione. Pareti più scure, colori per funzione e un bordo leggero per le pertinenze distinguono i vani. Verificati 42 test mirati, typecheck, lint e build. Confronto visivo sulla stessa pratica e PNG scaricato identico all’anteprima.

La revisione dei dettagli propone porte e finestre dalla rasterizzazione locale e riusa eventuali soglie rilevate. L’agente può confermare, correggere, scartare o disegnare un’apertura e allineare una parete alla direzione di un altro lato. Il comando `save_listing_details` salva aperture confermate e riferimenti delle pareti con la revisione geometrica, senza modificare vani o computi. Sulla copia della stessa pratica la ricerca ha proposto 8 porte e 12 finestre da verificare. Verificati nel browser conferma e correzione di una finestra, aggiunta manuale di una porta, allineamento, salvataggio con ricarica e PNG scaricato uguale all’anteprima. La rilevazione è assistita e può proporre falsi positivi o omettere aperture.

La revisione mette a fuoco una sola apertura sulla mappa e tiene conferma, modifica e scarto sopra la pianta. Conferma e scarto passano alla proposta successiva. Per i muri, la selezione di un lato mostra la migliore correzione compatibile, con confronto visivo prima di applicare. Riferimenti equivalenti sono raggruppati. Verificati sulla stessa pratica il passaggio fra le aperture su desktop e mobile e l’applicazione della proposta per una parete del bagno. Le modifiche di prova sono state chiuse senza salvare.

## Editor grafico dell’annuncio

Il comando guidato di allineamento è sostituito dall’[editor grafico](agency-listing-graphic-editor-20261109.md): vertici e aperture si modificano sulla proposta. Il salvataggio è separato dal computo.

Nei tramezzi che si incontrano ad angolo, la pianta per annuncio può regolare lo stesso vertice sui due assi. Le distanze dei tratti vicini contribuiscono allo spessore di riferimento anche quando il tratto non può essere spostato in sicurezza.

La pianta per annuncio raddrizza automaticamente i lati quasi orizzontali o verticali e rende uniforme il distacco tra tramezzi comparabili. Mantiene le separazioni reali, le diagonali evidenti e i dettagli già confermati. La resa si applica all’illustrazione e al PNG.

Quando un contorno è in bozza in Calcola superfici, Salva modifiche nella barra della mappa registra il contorno e la stima insieme. Dopo la conferma, chiude la selezione e riabilita il cambio di attività.

Sotto Balconi e pertinenze, Misure dell’appartamento mostra il lordo e la sua origine, la somma netta dei vani rilevati e il dettaglio per vano.

Quando il nuovo contorno si sovrappone a un vano esistente, Aggiungi area al calcolo lo indica per nome. Se il vano è una pertinenza, si può tornare al suo contorno già presente. Un rifiuto generico del server indica come rivedere il disegno.

In Calcola superfici, Aggiungi area al calcolo permette di scegliere Balcone o Cantina e tracciare un contorno separato. Una cantina nuova contribuisce al 25%; per un balcone si sceglie coperto (35%) o scoperto (25%). Il riepilogo si aggiorna sulla geometria salvata e chiede di confermare la stima aggiornata.

Gli avvisi di sovrapposizione in Calcola superfici portano alla pertinenza sulla mappa. Il comando Correggi perimetro apre i vertici del lordo nella stessa zona anche mentre quel perimetro è in modifica.

Calcola superfici inquadra prima l’appartamento e distingue i vani interni e il perimetro lordo dalle pertinenze. Il riepilogo esplicita la base di calcolo dell’appartamento, poi mostra pertinenze ponderate e totale. La scala usata è visibile e i controlli sono sotto Modifica scala.

La barra della planimetria resta visibile durante lo scorrimento in Modifica pianta, Calcola superfici e Pianta per annuncio. Nella vista Annuncio include modifica, conferma di completezza e download PNG. Nella finestra dell’editor grafico gli strumenti restano in alto e il salvataggio in basso.

Le conferme di salvataggio della pratica e della planimetria si chiudono con ×. Scorrono insieme alla pagina e lasciano visibili i comandi della mappa.
