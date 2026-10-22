# Fase 0 qualità AI v3 — ledger durevole, 22 ottobre 2026

Collegamento implementato e verificato offline sul branch `codex/fase0-ai-quality-v3`, successivo a `62b17c0`. Nessuna chiamata AI o email, nessuna spesa e nessun documento personale utilizzato.

## Collegamento

`backend-v5/test/quality-v3-ledger.cjs` usa Prisma e le tabelle già esistenti `ObjectOnboardingCampaign`, `ObjectOnboardingJob`, `ObjectOnboardingAttempt`. Prenota tramite la stessa implementazione `OnboardingAiBudget.reserve` del prodotto: lock transazionale per campagna, riserva standard **250.000 micro-USD (0,25 USD)**, somma degli importi effettivi e delle riserve incerte, minimo fra tetti persistiti e configurazione corrente. Una configurazione successiva non aumenta il tetto persistito.

Il runner richiede un ledger esplicito. Le `Map` sono ammesse esplicitamente nei piccoli unit test; non esiste più un fallback implicito in memoria. Le opzioni del ledger sono l’unica configurazione dei tetti durevoli. La campagna sintetica ha namespace `fase0-quality-v3-…` e massimi tecnici di 12 USD/150 richieste, senza attivare alcun provider o autorizzare spesa. La configurazione del prodotto, compreso il suo tetto di 10 USD/50 richieste, resta invariata.

Chiave logica distinta per campagna, caso, ripetizione (1/2), modalità e prefisso progressivo. Digest vincolato a documento/versione/SHA, gold, modello, prompt e preparazione delle pagine. Corpus e gold devono corrispondere al manifest sintetico versionato. Membership valida, owner sintetico `@example.test`, casa sintetica dedicata e originale privato della stessa coppia account/casa vengono verificati prima di ogni claim, anche in ripresa. Modifiche a fonte, gold o protocollo bloccano la richiesta.

Creazione del job, prenotazione e passaggio a `sending` sono atomici; il provider iniettato viene chiamato soltanto dopo il commit. Su richiesta già presente non si reinvia: `reserved`/`sending` diventano `uncertain` e conservano la riserva intera. Una risposta valida liquida il costo entro la riserva. Risposta invalida, timeout o errore dopo l’invio conservano lo stato incerto. Un ack perso dopo il commit di settlement non annulla il costo già scritto. In concorrenza una sola invocazione può ottenere il diritto di invio.

Nel JSON del ledger vengono salvati soltanto score e contatori della prova; nessuna risposta grezza, testo originale o prompt. I report vengono ricostruiti dalle righe persistite, non dallo stato temporaneo del processo.

## Prova riproducibile e risultati

Da `backend-v5`, con i binari PostgreSQL locali già disponibili:

```powershell
npm run lint
npm run test:quality-v3
npm run test:quality-v3-db -- -PgBin '<directory locale contenente initdb.exe, pg_ctl.exe e createdb.exe>' -ScratchRoot '<directory di lavoro esterna al repository>'
```

Lo script crea un cluster **nuovo** sulla porta **55433**, applica le migrazioni esistenti al database vuoto `dimora_v5_quality_v3_test`, esegue la suite, arresta e riavvia quel cluster, verifica la ripresa e lo spegne nel `finally`. Conserva la directory temporanea; nessuna cancellazione. Non carica la configurazione dell’app per il runner, non cambia `.env`, non ferma API o DB della porta 55432. Le URL del DB dell’app, remote o implicite sono rifiutate prima di connettersi. Non è richiesta alcuna migrazione nuova del prodotto.

| Verifica finale | Esito |
|---|---:|
| Build e lint backend | verdi |
| Corpus, parser, lettura, scorer e runner in memoria esplicito | 17/17 |
| Ledger reale isolato, incluse sotto-prove | 12/12 |
| Ripresa dopo arresto/riavvio effettivo PostgreSQL | 1/1 |
| Corpus simulato persistito | 52/52 |
| Richieste al provider simulato alla ripresa dei 52 casi | 0 |

La suite include morte di un processo dopo `sending` committato, due client concorrenti sulla stessa richiesta, richieste distinte concorrenti al limite di una chiamata, tetti monetari e di chiamate persistiti non aumentabili, rollback senza job/attempt residui, settlement invalido e ack perso, cambio di modello/gold/SHA/preparazione, versione/visibilità fonte e revoca membership. Le due ripetizioni, le modalità e due prefissi progressivi hanno prenotazioni distinte e replay senza duplicati. Anche gli incerti conservano il costo prenotato dopo il riavvio del DB. Nessun oggetto, spesa o contatto viene creato dai 52 risultati simulati.

Il primo tentativo di setup in sandbox è stato interrotto durante `initdb`; un tentativo successivo è stato fermato dal trattamento dello stderr informativo di Prisma in Windows PowerShell. Avvio/migrazioni sono stati corretti e la verifica finale completa è stata eseguita da zero, con permessi per i soli processi locali e cluster isolato. Questi tentativi non costituiscono esiti dei test.

Le suite generali backend (213/213), onboarding (148/148) e frontend (typecheck/lint, 822/822 mock) erano verdi nel checkpoint `62b17c0`; non sono state ripetute qui. Non sono cambiati codice prodotto, prompt o frontend.

## Limiti e prossimo passo

Il provider simulato dei 52 casi restituisce intenzionalmente osservazioni conservative `unsupported`/revisione; costi e output sono fittizi. Il risultato prova la catena runner → prenotazione → provider simulato → settlement/score → ripresa durevole. Non misura accuratezza, stabilità AI o convenienza delle modalità e non soddisfa da solo i criteri qualità del pilota.

Il ledger separa e limita anche i passaggi progressivi; il ciclo reale di preparazione/invio al modello resta da integrare/verificare nel runner prima della campagna. Il trasporto AI resta assente da questo adattatore offline. Prima di spendere servono verifica finale del percorso al modello e autorizzazione esplicita del tetto sintetico proposto di 12 USD/150 richieste. Scelta, gold e invio dei 10–15 reali richiedono un consenso e un tetto ulteriori separati. Nessun budget è stato autorizzato in questo incarico.
