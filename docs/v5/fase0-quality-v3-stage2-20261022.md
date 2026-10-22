# Fase 0 qualità AI v3 — secondo checkpoint offline, 22 ottobre 2026

Questo checkpoint prepara la valutazione dell’onboarding attuale. Non contiene risultati di accuratezza AI: nessuna richiesta Anthropic è stata inviata e nessun budget è stato consumato.

## Corpus e calibrazione

Completati i 52 originali sintetici previsti (bollette, tecnici, acquisti, conformità, documenti casa, etichette, documenti lunghi e casi difficili). Gold e manifest sono `corpus-v3.1`; 52/52 controlli aritmetici, testuali, hash e modalità fonte passano. Le cinque tavole di prime pagine e tutte le pagine dei quattro PDF lunghi sono state esaminate visivamente. Le foto di targhette sono simulazioni procedurali, non fotografie reali.

Con autorizzazione esplicita del committente, la taratura locale ha letto 34 originali dall’archivio in sola lettura. Nessun testo, nome, percorso o identificativo reale è stato stampato o conservato. Mancanti/illeggibili: 0/0. Confronto degli intervalli aggregati reali e sintetici:

| Misura | Reali | Sintetici |
|---|---:|---:|
| Pagine, min–mediana–p75–max | 1–2–8–20 | 1–2–2–20 |
| Caratteri/pagina, min–mediana–p75–max | 0–1.253,5–2.238–2.762 | 0–1.156–2.059–2.254 |
| Cifre, min–max | 0–1.678 | 0–1.359 |
| Date, min–max | 0–19 | 0–7 |
| Originali con immagini | 34/34 | 52/52 |

La prima generazione delle bollette lunghe ripeteva troppe letture datate; la densità di cifre/date eccedeva quella osservata. Le righe di dettaglio ripetute sono state ridotte e gli hash/audit rigenerati. Le statistiche strutturali ora rientrano negli intervalli osservati; non dimostrano equivalenza semantica né qualità del modello.

## Modifiche offline

- Onboarding v22: ogni item può avere una tipologia del catalogo e certezza, con evidenza obbligatoria. La certezza viene accettata solo se l’estratto testuale verificato lega esplicitamente nome/modello e categoria. L’automatismo richiede tipo certo; immagini o tipologia assente/incerta vanno in revisione. La UI mostra la proposta senza un valore predefinito.
- Cache Anthropic effimera (5 minuti) applicata solo alle istruzioni fisse. La rendicontazione distingue input non cache, creazione cache con margine prudenziale e lettura cache alla tariffa del modello; il limite di token continua a comprendere tutte le categorie.
- Lettura PDF: modalità completa resta il comportamento predefinito. La selezione locale è sperimentale e conserva ogni pagina che non sia riconoscibile come dettaglio consumi o condizioni, con citazioni dei numeri fisici originali. Per scansioni si può preparare/renderizzare un prefisso di pagine e mantenerne la numerazione fisica.
- Scorer puro per le osservazioni già validate: tipo, item/tipologia, spese, professionisti, prove citate, decisione automatica, errori critici, costo e stabilità quando sono disponibili due esecuzioni.

## Verifiche e limiti

Audit fonte/gold 52/52; parser di produzione 2/2. `npm run test:quality-v3` 16/16; backend `npm test` 213/213, onboarding 148/148 e lint verdi. Frontend typecheck e lint verdi; suite mock completa 100/100 file e 822/822 test, exit 0, durata 641,59 s.

Harness offline con provider simulato e ledger in memoria verificato: tetti chiamate/costo, resume senza duplicati, esito incerto senza retry; preparatore progressivo verificato con reader simulato e arresto conservativo. Non è ancora collegato end-to-end al ledger durevole né a un ciclo reale di richieste successive. Nessun confronto AI/costo eseguito; lettura completa resta default conservativo. Nessuna chiamata AI o email a pagamento.

Prima di una campagna sintetica a pagamento occorrono il collegamento e la verifica del ledger durevole, quindi l’autorizzazione esplicita del tetto proposto (12 USD / 150 chiamate). Consenso all’invio di documenti reali e relativo tetto restano separati.

## Aggiornamento successivo: ledger durevole

Il limite del ledger in memoria descritto sopra è superato dal checkpoint successivo: runner collegato al ledger onboarding esistente e provato su PostgreSQL temporaneo isolato, 12/12 test più 1/1 dopo riavvio DB; suite offline corpus/lettura/scorer/runner 17/17, build e lint verdi. I 52 casi simulati persistono e la ripresa non reinvia richieste. Restano da verificare l’adattatore al modello e il ciclo progressivo reale prima di qualunque campagna autorizzata. [Report completo del collegamento e limiti](fase0-quality-v3-ledger-20261022.md).
