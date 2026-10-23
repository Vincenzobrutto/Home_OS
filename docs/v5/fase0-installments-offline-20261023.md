# Fase 0 — verifica offline acconto e saldo sugli stessi apparati

23 ottobre 2026. **Requisito complessivo NON SUPERATO. Nessuna correzione di prodotto introdotta da questo incarico di verifica.**

## Perimetro e provenienza

Il committente ha fornito due PDF anonimizzati e confermato che riguardano acconto e saldo degli stessi climatizzatori. L'analisi locale precedente ha rilevato documenti raster: il lettore testuale restituisce `pdf_text_unavailable`. Non è stata simulata un'estrazione AI riuscita. I file e i loro contenuti non sono stati inseriti nel repository.

Il collaudo usa i riferimenti SHA/byteSize letti dal manifest locale dei due file, senza copiarne i byte nello storage o nel DB. Le tre schede rappresentano tre soggetti dichiarati manualmente ai fini della prova; non certificano quantità, matricole o identità tecniche estratte. I valori inseriti manualmente riproducono i totali dei documenti. La somma osservata nel test non certifica il costo reale dell'acquisto: il rapporto contabile tra totale, acconto e saldo va riconciliato prima di consolidarlo.

## Percorsi verificati

Per entrambi gli ordini **acconto→saldo** e **saldo→acconto**:

- Primo documento: tre schede dichiarate manualmente e una spesa documento.
- Secondo documento: selezione esplicita delle stesse tre schede; zero nuovi oggetti, due documenti visibili per ogni scheda. Tenendo il costo successivo in sospeso resta una sola spesa e la bozza resta aperta. Questo non equivale a saldo riconciliato.
- Replay concorrente con la stessa chiave e replay da un altro client DB: nessuna risorsa aggiuntiva. Payload cambiato con la stessa chiave: conflitto.
- Ricaricamento degli stessi file con nuovi ID documento/bozza e chiavi nuove: il binding SHA/articolo blocca la ricreazione delle schede. Una fonte già registrata non può generare di nuovo la medesima spesa. Collegare le copie agli oggetti esistenti non aumenta il numero di schede.
- Dopo la registrazione dei due costi, ricaricare ciascun file non può creare ulteriori spese: rollback anche dei collegamenti tentati nella transazione fallita.
- Altro owner della casa privo dell'accesso alle fonti private: lettura/conferma negate. Revoca della fonte: replay negato. Regressioni Q48 per ruoli, SHA/versione, rollback e separazione delle fatture preservate.

## Limiti riprodotti: il requisito non passa

1. **Identità fra fatture diverse.** La creazione manuale dagli stessi dati dichiarati in due documenti con SHA diversi è consentita: la prova diagnostica arriva a sei schede. Il collegamento esplicito evita il duplicato, ma non è una garanzia generale. L'identità fra due apparati senza matricola/modello completo non può essere dedotta dal solo nome commerciale.
2. **Riconciliazione economica assente.** Registrando i due totali di 2.104,50 EUR come nuove spese, il sistema conserva due record e aggrega 4.209,00 EUR. Non identifica da solo quale parte sia acconto, saldo o totale richiamato. Il test osserva questo comportamento, senza approvare quella somma come costo reale.
3. **Una spesa canonica non può ricevere il secondo originale tramite questo percorso.** `link_existing` respinge un documento con SHA diverso con `expense_document_conflict`. Serve una gestione esplicita di più documenti/rate riferiti allo stesso acquisto, con revisione e provenienza; non va rimosso indiscriminatamente il controllo che protegge i collegamenti.

I test diagnostici sono verdi perché riproducono e rendono visibili questi limiti; **non dimostrano che la regola di assenza di duplicati fra acconto e saldo sia soddisfatta**.

## Riproduzione e isolamento

Nuovi file: `backend-v5/test/installment-linking.integration.test.cjs` e `backend-v5/test/installment-offline.ps1`.

```powershell
& backend-v5/test/installment-offline.ps1 -PgBin '<bin PostgreSQL locale>' -ScratchRoot '<cartella di lavoro>'
```

Il manifest locale opzionale `INSTALLMENT_SOURCE_MANIFEST` contiene esclusivamente i riferimenti dei file analizzati; senza manifest il test usa SHA di fixture dichiarate. Il runner inizializza sempre un cluster nuovo alla porta 55433, database `dimora_v5_quality_v3_test`, ruolo `quality_test`, con guard stretta nei test. Non riusa/ferma cluster preesistenti, non legge `.env`, non copia chiavi AI; disattiva M4 AI, rimuove la chiave Anthropic dal processo figlio e ripristina l'ambiente. I test bloccano `fetch`. Migrazioni solo sul DB temporaneo. Arresto del proprio cluster in `finally`; directory conservata. Nessun accesso al DB reale, nessun deploy/riavvio API dell'app.

L'avvio iniziale nella sandbox e due tentativi di preparazione Windows sono stati interrotti/corretti prima del collaudo: l'attesa di `pg_ctl` includeva il server discendente. Il runner finale usa `WaitForExit()` sul solo processo di controllo. I cluster temporanei avviati in quei tentativi sono stati fermati esplicitamente; nessuna loro directory è stata rimossa.

## Seguito

Progettare e implementare la relazione acquisto/intervento↔oggetti↔documenti↔rate, distinguendo costo complessivo e movimenti, con consenso/manual review e controllo delle fonti. Prima definire il costo effettivo e il significato dei due importi con il committente; non introdurre una somma o cancellazione automatica basata su importi uguali. Aggiungere poi test di accettazione che rifiutino le duplicazioni, in entrambi gli ordini e in concorrenza. Non ampliare consensi AI o modificare gold, corpus, scorer e ledger.

## Esito esecuzione finale

Build backend e lint mirato del nuovo test superati. **37/37 controlli eseguiti**: 26 della nuova suite (contenitori inclusi) e 11 regressioni Q48. Sono inclusi controlli diagnostici dei comportamenti non conformi sopra descritti: requisito complessivo ancora NON SUPERATO. SHA e dimensioni dei due originali ricontrollati dopo la prova: invariati. Cluster finale `installments-e231bbc83f40435eb318f2ef79afe07f`, log `tests.log`, `postgres.log` e `stop.log` conservati nella cartella locale di lavoro; arresto completato. Frontend e suite generali non ripetuti: nessun codice di prodotto modificato.
