# Ricevuta → oggetto e spesa: flusso da valutare

16 ottobre 2026. Proposta UX navigabile richiesta dal committente prima di sviluppare il prodotto. Non è un contratto API congelato né una nuova capacità attiva dell'applicazione.

Mockup: frontend-v5/public/mockup-ricevuta-assistita.html, servito da http://127.0.0.1:5174/mockup-ricevuta-assistita.html. File autonomo con CSS/JS inline, nessun asset esterno, API o provider. CSP connect-src none, nessun fetch e nessuna persistenza in localStorage. Stato solo in memoria; ricaricamento e cambio scenario azzerano la prova. La casa reale e i suoi documenti non vengono letti o modificati.

## Obiettivo

Dopo il caricamento, una ricevuta diventa il punto di partenza per proporre un oggetto nuovo oppure l'associazione a uno esistente e, separatamente, una spesa nuova oppure il riuso di quella già presente. Il percorso manuale rimane disponibile. Niente duplicazioni o sovrascritture silenziose quando l'utente ha già organizzato il documento a mano.

La prova della macchina del caffè ha chiarito questa aspettativa. Le estensioni di estrazione e matching sono da specificare prima dell'implementazione; non si applica semplicemente il contratto delle caldaie a qualunque oggetto. Inquadramento nella direzione BL-10b; nessuna mini-rubrica o riordino generale di release inclusi nel mockup.

## Percorso proposto

1. **Documento.** L'originale è già caricato; analizzarlo è un'azione distinta. Nome del file, casa e visibilità sono riconoscibili. Se esistono collegamenti espliciti, il sistema li segnala prima dell'analisi. Trasferimento al provider e costo richiedono informazione e consenso specifici nell'app reale. Nel mockup la casella simula questa scelta, non autorizza alcuna chiamata o l'uso di documenti personali.
2. **Proposte.** Due sezioni nella stessa revisione: «A quale oggetto appartiene?» e «Che cosa facciamo con la spesa?». Dati precompilati correggibili; fonte con pagina ed estratto consultabile per ciascun dato. La modifica dell'utente è etichettata separatamente. È possibile escludere oggetto o spesa senza perdere le altre scelte.
3. **Riepilogo e conferma.** Azioni esatte, oggetto scelto con ambiente per distinguere omonimi, importo/data e numero di nuovi elementi. L'utente può tornare indietro mantenendo le modifiche o confermare una volta le azioni selezionate. Escludere un elemento significa non intervenire, non eliminare o scollegare ciò che esiste già.
4. **Esito e ritrovamento.** Accesso alla scheda dell'oggetto e a Spese. La scheda conserva aree distinte per caratteristiche, documenti e costi; l'importo non sostituisce il documento. Un costo resta un solo elemento visibile da più contesti.

## Scenari del selettore demo

| Scenario | Comportamento proposto |
|---|---|
| Oggetto e spesa già presenti (iniziale) | Riconosce i collegamenti espliciti, riusa scheda e costo. Propone solo marca/modello mancanti; nessun nuovo oggetto o costo. Importo già registrato invariato |
| Primo acquisto, nulla creato | Proposta di scheda con nome, marca/modello leggibili e costo precompilato. Le scelte sono indipendenti. Conferma completa: un oggetto, un costo e collegamenti allo stesso documento |
| Due oggetti compatibili | Nessuna associazione predefinita. La sola somiglianza del nome non decide: mostra ambiente e scheda, richiede scelta tra esistenti, nuovo o nessuna associazione. È possibile non registrare il costo |
| Documento non leggibile | Nessuna proposta inventata. Originale conservato, rimedio tramite PDF testuale o passaggio manuale. Il mockup manuale lascia i campi vuoti e non attribuisce i valori digitati all'AI |

Fixture: marca Lume, modello Mini90, totale179,90EUR,15settembre2026, Emporio Casa Demo. Sono dati di fantasia, non estratti dalla ricevuta reale del committente. Il facsimile è testo HTML, non un vero PDF o test dell'estrattore. La data massima della demo è fissata al16ottobre2026.

## Regole da trasferire al contratto reale

- **Oggetti:** prima riutilizzare collegamenti esistenti autorizzati nello stesso account/casa; poi suggerire candidati con elementi discriminanti e motivazione. Un nome generico da solo non basta. Nessun matching o conteggio su dati privati altrui. Oggetti archiviati/non disponibili richiedono un esito esplicito.
- **Dati:** solo campi supportati e leggibili; non inventare marca, modello, scadenza garanzia o data di pagamento. Nome/descrizione possono essere proposte riformulate, distinguendole dalla citazione letterale. Marca/modello dei generici oggetti richiedono un'estensione del modello e delle API, oggi non già disponibile. La correzione manuale mantiene tale origine.
- **Spese:** un costo già collegato non viene ricreato o modificato alla seconda analisi. Se i valori estratti differiscono da quelli salvati, mostrare il confronto e mantenere il confermato finché non viene autorizzata una modifica dedicata. Il mockup mostra il caso concordante, non ancora il confronto dei conflitti.
- **Importi:** lordo dell'acquisto separato da imponibile/IVA/acconti/rate. Il mockup contiene un solo totale chiaro. Più importi o articoli richiedono una revisione specifica; non dedurre dal mockup che il prodotto supporti già ripartizioni o più oggetti per documento.
- **Conferma:** operazione idempotente con versioni dei target e snapshot/hash/versione della fonte; controlli di autorizzazione e disponibilità freschi. Congelare la transazione tra creazione/riuso oggetto, collegamento documento e creazione/riuso costo. Non lasciare stati parziali nascosti: errore certo diverso da esito incerto, retry sulla stessa operazione. Il flag in memoria della demo evita una seconda applicazione locale, non prova l'idempotenza del futuro backend.
- **Rinvio/scarto:** distinguere proposte da confermare, proposte accantonate e già risolte. «Da rivedere» conserva soltanto verifiche aperte. Nessuna nuova verifica ripetuta per la stessa conferma. La persistenza della bozza non è simulata qui.
- **Privacy:** documento e oggetto personali, costi privati; nessun cambio automatico di visibilità. Un negozio non diventa un professionista della rubrica. APE, licenza e abitabilità sono altri flussi da definire, non compresi in questo primo acquisto.

## Copione per la valutazione del committente

Iniziare dal caso già sistemato: Documento → scelta simulata di analisi → verificare l'esistente e le integrazioni → Vedi fonte → Riepilogo → Conferma nella demo → Oggetto/Spese. Il conteggio deve rimanere zero nuovi oggetti e zero nuove spese.

Poi scegliere «Primo acquisto»: valutare se le due sezioni sono comprensibili senza istruzioni. Modificare un valore, escludere a scelta una delle operazioni e controllare il riepilogo. Infine provare ambiguità ed errore di lettura. Il giudizio richiesto è sul flusso e sulla leggibilità, non sull'esattezza di un'AI che qui non viene invocata.

## Verifiche svolte

Browser integrato reale, scheda separata dalla casa del committente: caso esistente completo, fonte modale, riepilogo0/0 e scheda con documento/costo; primo acquisto con correzione manuale, riepilogo1/1, conferma e scheda con provenienza manuale/documentale distinta; due candidati senza scelta bloccati, poi selezione Studio ed esclusione spesa; documento non leggibile e passaggio manuale senza valori estratti.

Responsive390 e320px: nessun overflow orizzontale nelle proposte e nell'esito misurati; a320 viewport clientWidth e scrollWidth305, con scrollbar classica. Conferma nel caso esistente riuscita anche a320. Non un test su smartphone fisico. Override del viewport ripristinato. Evidenze locali in outputs/ricevuta-assistita-mockup-20261016/. Sintassi dello script verificata senza eseguirlo fuori dal browser. Nessuna build/suite generale ripetuta per questo file statico separato; nessuna dichiarazione WCAG o di qualità AI.

Nessun codice del prodotto o contratto modificato. Nessun dato personale, DB, .env, email, impostazione di sicurezza o servizio modificato; nessun push. Nessun nuovo incarico Claude o attività automatica dopo il turno. Prima di implementare: feedback sul mockup, contratto aggiornato e criteri/campagna AI con budget/consenso nuovi, separati da questa navigazione.
