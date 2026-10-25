# Compilazione dall’archivio: recupero dei collegamenti incompleti

## Incarico e perimetro

Lotto `codex/compilazione-archivio-20261025`, dal consolidamento `730b93d` (PR #33 integrata). Registrazione `9ff4aff` prima del codice; correzione e test `6333962`. Solo `DocumentEditorWorkspace.tsx`, due nuovi file di test e documentazione: nessun parser, backend, schema, fakeBackend condiviso o file del cestino Claude modificato.

## Causa e correzione

Un collegamento dell’archivio conservava `oggetti-documento`, `oggetti-bozza` e `compila`, ma aveva perso `lotto`. Il workspace leggeva correttamente il documento, mentre `IntakeContent` interpretava l’assenza del lotto come ingresso per un nuovo caricamento e mostrava il selettore dei file. Il problema non dipendeva dal contenuto della bolletta TIM.

Il workspace ora riconosce questa condizione e presenta **Riprendi compilazione**, senza mostrare il caricamento e senza eseguire scritture all’apertura. Solo il pulsante esplicito prepara il contesto mediante la stessa API già usata per scegliere un documento della coda. Riaprendo il documento corrente conserva bozza, analisi già esistente, modalità, vista, filtri e coda; passando a un altro documento mantiene il precedente isolamento del percorso. Un errore conserva URL e chiave di idempotenza per il recupero esplicito.

Il pulsante non conferma oggetti o spese e non avvia AI. Le verifiche di accesso al documento precedono il recupero. Se il collegamento contiene già un lotto valido, il percorso resta invariato.

## Tipo e uscita dai documenti da completare

Il percorso completo dell’archivio mantiene l’ordine esistente: allineamento della bozza, organizzazione canonica del documento con tipo `utility_bill`, salvataggio della revisione e conferma delle scelte. Il test esercita entrambe le viste e verifica il payload della spesa con importo, fornitore, categoria, emissione, periodo e scadenza.

La conferma riuscita invalida le query della casa e ritorna all’archivio filtrato sui documenti da completare. Nel simulatore il documento confermato sparisce da quel filtro e resta consultabile nei completati con l’etichetta **Bolletta**. Il test simula la risposta del server: non è una prova sul database reale. Il contratto backend esistente calcola `completed` sulle bozze confermate e sull’assenza di altre bozze o analisi ancora aperte dello stesso originale; il filtro dell’archivio continua a usare lo stato del server.

**Salva bozza ed esci** conserva invece il lavoro da completare. Il solo avanzamento tra le schede non completa il documento. Nessuna riclassificazione retroattiva viene eseguita su documenti già salvati attraverso altri percorsi.

## Verifiche

- Prima della correzione: i due nuovi casi del flusso archivio falliscono sul pulsante di recupero assente; le 14 verifiche preesistenti del gruppo passano.
- Sei nuovi casi: due flussi completi (schede/pagina unica), conservazione dei parametri manuali e dell’analisi esistente, stessa chiave dopo errore e rifiuto di una fonte privata altrui. Il simulatore locale del nuovo test estende le risposte senza cambiare il fakeBackend condiviso.
- Gruppo mirato: **20/20**. Typecheck, lint e build superati, anche dopo l’ultima correzione del test. Prima suite completa: 1007/1008; il nuovo test privacy interrogava il pannello prima del commit del rendering. Sostituita la ricerca immediata con l’attesa dello stesso pannello, senza cambiare timeout, diniego o asserzioni sull’assenza di metadati. Seconda suite completa: **1008/1008 in 118 file**, nessun test saltato, un worker, retry 0 (816,16 secondi).

Durante lo sviluppo dei nuovi test sono state corrette le fixture: selezione dell’avviso nel pannello appropriato (il diniego appare anche nell’anteprima), URL relative e supporto del parametro di vista dell’archivio nel solo adattatore di test. Nessuna asserzione preesistente, timeout o validazione di prodotto modificati.

## Consegna e limiti

Prova manuale dopo l’integrazione: aprire la compilazione dall’archivio; se il collegamento è incompleto, usare **Riprendi compilazione** senza caricare un altro PDF. Controllare tipo e campi nelle schede Documento/Spese, poi effettuare la conferma finale. Verificare l’assenza dal filtro dei documenti da completare e la presenza nei completati con tipo **Bolletta**. Con **Salva bozza ed esci**, verificare invece che il documento resti da completare. Sono azioni del committente, non eseguite automaticamente da questo lotto.

Nessuna AI, migrazione, accesso a DB/API/storage reale, modifica a `.env`, salvataggio automatico o riavvio dell’app. Main, consolidamento e branch/worktree Claude preservati. La correzione richiede PR verso il consolidamento e approvazione del committente prima di merge e aggiornamento dell’app; la versione già avviata non viene sostituita da questo lotto. Prova browser non eseguita; verifica nel harness mock.
