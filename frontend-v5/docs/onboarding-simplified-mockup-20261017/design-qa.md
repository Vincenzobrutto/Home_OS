# Mockup navigabile onboarding documenti e oggetti — 17 ottobre 2026

final result: passed

Esito riferito al prototipo locale e alle verifiche elencate, non a una release dell'app o a una conformità WCAG completa.

## Ambito e riferimento

File standalone `public/mockup-onboarding-semplificato.html`, separato dalle route e dalle API del prodotto. Estende la famiglia dei mockup HTML esistenti. Nessuna dipendenza o servizio aggiunto. Dati interamente sintetici; nessun caricamento personale o dispatch AI. Stato persistente soltanto nella chiave locale `dimora-mockup-onboarding-v3`, azzerabile dal comando del prototipo.

Riferimento del flusso: audit del 17 ottobre, screenshot `outputs/audit-onboarding-ux-20261017/02-revisione-articolo.png`; confronto visivo aperto insieme alla nuova revisione desktop. Riferimento cromatico: variante selezionata «Luce indaco» del mockup esistente `dimora-v5-direzioni.html` (fondo #f5f6fc, accento #4f46d9, testo #202341). Il cambiamento di struttura è intenzionale: non è una riproduzione pixel per pixel della pagina precedente e non cambia il tema dell'app reale.

## Revisione applicata

- Elenco di articoli compatto e pannello di modifica dedicato; nessuna scheda dentro una scheda dentro una scheda.
- Campi marca/modello diretti; dettagli facoltativi richiudibili.
- Una conferma individuale o multipla diretta, senza passaggio «salva scelta».
- Stato documento distinto da quello degli articoli; esclusi e confermati conservano una riga di esito.
- Scelta esplicita per collegamento, esclusione, duplicati e sostituzioni.
- Pannello a schermo intero su mobile, contenuto scorrevole e conferma sempre raggiungibile.

## Verifiche browser eseguite

1. Amazon tre articoli: esclusione HOMYBABY, conferma del router dall'elenco, mantenimento dell'altro articolo pendente.
2. Fattura 99,99 euro: una conferma produce un oggetto e una spesa nel riepilogo simulato.
3. Oggetto esistente: collegamento senza incremento del numero di nuovi oggetti.
4. Spesa già presente: conferma bloccata senza decisione; collegamento della spesa, zero nuove spese.
5. Conflitto sul modello: sostituzione bloccata senza consenso; accettata con consenso.
6. Copia documento: aggiornamento titolo con consenso, un solo originale dichiarato nell'esito.
7. Scansione: indicazione manuale SCIA e destinazione Pratiche edilizie.
8. Multiplo: conferma diretta di due documenti su cinque, altri pendenti; rinvio e riapertura dopo reload.
9. Ordine con solo totale: nessuna attribuzione automatica; importo manuale e data richiesti solo scegliendo di registrare il costo.
10. Pannello mobile 390 px e 320 px; larghezza DOM 320/320, nessun overflow orizzontale osservato. Focus iniziale, gestione Esc e isolamento del dialogo affidati a dialog nativo. Nessun errore console rilevato durante le prove.

Disponibili anche scenari dedicati APE e foto etichetta, con gli stessi componenti; non dichiarati test indipendenti di lettura AI.

## Iterazione di qualità

Rilevati e corretti durante la prova: campo importo mostrato anche quando non si registra un costo; consenso copia e destinazione da aggiornare; possibilità di modificare liberamente il modello già in conflitto; rinvio documento non etichettato; titolo iniziale che anticipava il completamento; barra mobile inattiva troppo alta. Nuovo controllo dopo le correzioni e screenshot finali conservati in `outputs/mockup-onboarding-semplificato-20261017/` del workspace esterno al repository.

## Limiti e prossima decisione

L'originale nel mockup è una ricostruzione testuale dichiarata. Non simula l'effettiva estrazione, matching o transazione backend, né i fallimenti di rete. Un totale multiarticolo non viene ripartito automaticamente. Ricerca manuali solo descritta, nessun accesso esterno. Persistenza locale dimostrativa, non salvataggio nel progetto.

Validazione del committente: lista più chiara; provati nuovo router, accessorio collegato e pulitori esclusi; confermati oggetto e spesa da 99,99 euro con una sola azione. L'accessibilità mobile su telefono reale resta da verificare. Nessuna modifica al modulo operativo in questa attività.

## Verifica autonoma successiva richiesta dal committente

Gli 11 scenari sono stati esercitati nel browser con dati sintetici. Prove ulteriori rispetto alla prima consegna:

| Scenario | Risultato osservato |
|---|---|
| Amazon tre articoli | Un nuovo router, cavo collegato alla sua scheda reale del mockup, pulitori esclusi; un oggetto, un collegamento, zero spese. |
| Acquisto | Conferma unica già validata dall'utente. Verificato anche togliendo il costo: un oggetto, zero spese, nessun importo presentato come registrato. |
| Oggetto esistente | Senza scelta la conferma è bloccata; con collegamento nessun nuovo oggetto. |
| Spesa esistente | Senza decisione sul costo la conferma è bloccata; collegamento alla spesa preesistente, zero nuove spese. |
| Conflitto | Sostituzione senza consenso bloccata. Con consenso e conferma dall'elenco compare Classica 40, non Classica 30. |
| APE | Energia, nessun oggetto e nessuna spesa. |
| Copia | Scelta obbligatoria; mantenimento invariato o aggiornamento con consenso. Correzione successiva dal medesimo archivio: un documento con il nuovo titolo. |
| Scansione | Blocco senza tipo, originale sintetico apribile, scelta SCIA e archiviazione in Pratiche edilizie. |
| Multiplo | Due documenti su cinque confermati; rinvio documento e articolo conservato al reload; ripresa dell'articolo e creazione della sola spesa da 99,99 euro prevista. |
| Solo totale | Nessuna ripartizione automatica. Importo e data necessari per quota manuale. Singola quota superiore al totale bloccata; 79,90 euro e altro articolo escluso producono solo 79,90 euro. Selezione di 79,90 + 60 euro su totale 129,90 bloccata prima di qualsiasi conferma; correggendo la seconda quota a 50 euro si registrano esattamente 129,90 euro. |
| Etichetta | Marca Moulinex e codice AL4018F0 disponibili, modello non inventato; un oggetto senza spese. |

### Difetti effettivi corretti

1. Il selettore di collegamento aveva due router fittizi fissi: ora deriva le opzioni dalle schede confermate nel caso corrente e dai candidati esistenti dell'esempio, usando identificatori stabili. La nuova scheda del router è selezionabile dopo la conferma; destinazione esplicita obbligatoria quando non esiste un candidato già indicato.
2. La conferma multipla non applicava la sostituzione del modello come quella individuale: ora entrambe usano lo stesso punto di applicazione.
3. Una spesa rifiutata poteva mantenere un'etichetta «nuova spesa proposta» e l'importo: ora testo e importo seguono la scelta e lo stato effettivi.
4. I rinvii degli articoli non erano distinti nel conteggio principale e quelli dei documenti potevano mantenere la selezione: ora sono segnalati come da riprendere e deselezionati.
5. Dopo aver risolto una copia, Modifica riapriva la scelta sulla copia: ora apre la normale correzione del documento archiviato con consenso e senza creare una nuova copia.
6. Totali manuali controllati in centesimi, importi positivi con massimo due decimali e data richiesti; controllo della somma delle proposte selezionate prima delle scritture simulate. Messaggio di blocco visibile come avviso.

Evidenze aggiuntive: `06-collegamento-prima.png` (difetto), `07-ordine-misto-corretto.png` e `08-quota-solo-casa.png` negli output dedicati. Nessun collaudo reale di AI, rete, API o database è stato eseguito o è implicato da questi esiti. Il prototipo resta una proposta UX; la futura integrazione deve mantenere autorizzazioni, controlli di versione, idempotenza e recupero degli esiti incerti del backend.
