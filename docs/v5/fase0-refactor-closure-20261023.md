# Chiusura della tranche di refactoring V5 — 23 ottobre 2026

Branch codex/fase0-ai-quality-v3. La tranche autonoma conclude i lotti selezionati dall'audit, con criteri e comportamento invariati. Rimangono opportunità di manutenzione e gate di prodotto esplicitamente separati: non si dichiara assenza di debito tecnico o produzione pronta.

## Risultato pratico

- Conferma backend leggibile per fasi nella stessa transazione, validatori separati e stessi errori/controlli.
- Candidati: 317 → 170 statement SQL su 50 oggetti sintetici (−46,37%); 77 → 50 su 10, 23 invariato su 1. Nessun benchmark di latenza; tutti i quattro lock FOR SHARE e le verifiche di fonte restano.
- Protocollo provider separato, prompt/schema byte-identici e future autorizzazioni vincolate ai nuovi moduli; zero AI.
- Client per otto domini con un solo trasporto/sessione/CSRF. Costo entry R10 +7.214 byte (+1,50%), gzip +999 rispetto al lotto precedente: beneficio di manutenzione, non riduzione di peso.
- Editor con ciclo di scrittura separato e presentazione intake in moduli distinti; chiavi, consensi, recuperi e corpi operativi preservati.
- Test backend protetti, ingressi documentali correnti e archivi fedeli. Quattro componenti storici senza ingresso produttivo conservati per compatibilità/test, nessuna UX rimossa.

## Ultime verifiche effettive

| Ambito | Esito |
| --- | --- |
| Backend build/lint | Superati |
| Onboarding unit | 303/303 |
| Ordinari backend | 224/224 |
| Qualità offline | 24/24 |
| Guardie qualità | 17/17 |
| HTTP/DB sintetici | 496/496: 54 esterni, 440 diretti, 2 dopo riavvio PG |
| Frontend typecheck/lint/build | Superati |
| Mock finale | 860/860, 105 file, 509.88 secondi; maxWorkers 2, retry 1 |
| Grafo runtime V5 | Nessun ciclo rilevato |

I conteggi dei diversi profili non si sommano: alcuni test sono condivisi. Trasporti AI simulati nelle suite, nessuna chiamata pagata. Il primo tentativo della fixture query mancava del type obbligatorio della stanza e il primo ordinario aveva il vecchio numero di file night-plan; entrambi corretti e rieseguiti senza ridurre privacy/idempotenza. Nessuna anomalia finale aperta in queste verifiche.

Equivalenze complementari: 20.672 casi quantità/prezzi nel lotto precedente; 1.458 profili (batch e singolo), 15 schemi/507 risposte/12 richieste provider, 581 casi della facciata API e confronti dei corpi/markup spostati. Non sono una prova formale o una nuova campagna qualità AI.

Cinque cluster temporanei di questa tranche fermati, porte proprie 55439/3119 libere e log conservati. Ambiente di collaudo dell'utente e DB/API/storage reali non modificati; niente .env, migrazioni di prodotto, gold, quote, reset/clean, force push o rimozione worktree. Legacy sporco e untracked estranei esclusi dai commit.

## Confini residui e branch futuro

R03/R04: altri passaggi di modularizzazione possono essere utili; container e operazioni per esemplare restano ampi. R05: project/safeReview/automatic non sono ottimizzati o misurati come il percorso candidati; nessuna cache generica da aggiungere senza prova. R06: eventuale ritiro dei componenti conservati è una decisione distinta. Queste opportunità non giustificano una riscrittura in massa per ridurre righe.

Restano aperti gate qualità AI generale, verifica del committente sul caffè, telefono BL-04/accesso concordato, HEIC rinviato, eliminazione dati e DB di test permanente. Il refactoring non li promuove o autorizza.

Per il prossimo confronto: un branch di consolidamento può partire dalla punta verificata Fase 0, con i commit documentati e senza includere i file sporchi locali. Un branch nuovo mantiene comunque i file legacy già tracciati e la storia Git: un progetto contenente soltanto V5 o una riscrittura della storia sarebbe un incarico diverso. Nessun branch nuovo, main, merge o deploy eseguito ora.

## Commit di questa tranche

- 05718176f95c49e1c47e81ebc31a53198ad1fcc7 — conferma transazionale.
- ac192062b8553599ebb59667394cbe8680aea0ef — protocollo provider.
- d412c1cf685475173bffc0cef97b4f9575209e2d — ingressi documentali e archivi.
- 5ad3d8133859b70abf2f143a760351ccd2e89b0e — client per dominio.
- 5ac477b43fc66e6e2a11cc0541b530456c206858 — letture batch candidati.
- Il commit che contiene questo report conclude editor/presentazione e riepilogo. Hash finale/push verificati nella consegna; non inserire l'hash autoreferenziale nel proprio commit.

Report dettagliati: [conferma](fase0-confirmation-orchestration-refactor-20261023.md), [protocollo](fase0-provider-protocol-refactor-20261023.md), [confini/archivi](fase0-maintenance-boundaries-20261023.md), [client](fase0-api-client-domains-refactor-20261023.md), [query](fase0-candidate-query-batching-20261023.md), [editor/intake](fase0-editor-write-presentation-refactor-20261023.md). L'audit iniziale conserva le sue misure storiche.

Build finale: entry 486727 byte, gzip 148627; 55 source map esaminate e quattro componenti storici ancora assenti. La entry è inferiore ai 507.951 byte dell’audit iniziale (−4,18%), senza dedurre latenza, memoria o peso dell’intera applicazione.
