# Riepilogo Spese — riparazioni visibili, 26 ottobre 2026

Segnalazione del committente durante il confronto delle proposte Codex/Claude per Spese: il componente Summary continuava a escludere repairs_works dalla tabella, spiegando ancora il raggruppamento condizionato a workId precedente alla PR #64. Diagnosi confermata sul consolidamento 7478f3f. Lotto registrato a d4e055d prima del codice, branch/worktree dedicati; nessun file Claude aperto modificato.

## Correzione

Rimossa l’esclusione speciale e la nota obsoleta. La categoria Riparazioni e lavori è ora una normale riga del proprio gruppo, secondo le capabilities già restituite dal backend della PR #64. Sono riutilizzati importo e conteggio di byCategory: nessun ricalcolo locale, nuovo payload, filtro, API/backend, schema o somma modificati. Il totale di gruppo era già corretto: il difetto nascondeva il dettaglio e dava una spiegazione errata, senza perdere denaro dal totale generale.

## Verifiche offline

Nuova regressione sul percorso reale del router con backend simulato: due riparazioni, con/senza lavoro, sommano 50 EUR e appaiono una sola volta tra gli interventi; manutenzione 10 EUR, acquisti 40 EUR, gruppo interventi 60 EUR e totale 100 EUR. Verificata posizione della riga tra le intestazioni del gruppo, conteggi, rimozione della vecchia nota e assenza di POST durante la consultazione.

Prima della correzione il caso è rosso per riga Riparazioni e lavori assente; dopo passa invariato. Nel comando mirato gli altri 24 casi sono esclusi dal solo filtro -t, non rimossi. Gruppo Spese/economy/lib: 47/47 in 4 file, senza salti; typecheck/lint/build verdi; nessuna asserzione di privacy/idempotenza o timeout modificati. Runner con ambiente ripulito, envDir vuota, un worker/retry0 e dipendenze esistenti; nessuna suite DB o AI.

## Confronto delle proposte: proposta, non implementazione

L’artifact Claude indicato dal committente non è accessibile tramite il lettore web disponibile: il confronto riguarda la descrizione ricevuta, non un audit visivo dell’artifact. Non sono stati misurati autonomamente i conteggi di clic riportati da Claude.

Direzione consigliata: una pagina, periodo prima dei contenuti, riepilogo e anello filtranti, analisi richiudibile nello stesso contesto. Dalla proposta Codex mantenere filtri progressivi con chip rimovibili, inserimento manuale essenziale, collegamenti opzionali, date delle bollette distinte, stato del pagamento non dedotto. Il grafico deve avere anche comandi testuali equivalenti e una chiara rimozione del filtro, per non dipendere soltanto da colore o clic sugli archi. Su mobile privilegiare elenco e totale, senza occupare il primo schermo con pannelli analitici.

Backend: summary con family mantiene già lo stesso filtro anche sul periodo precedente; Acquisti e interventi possono quindi essere confrontati con due richieste filtrate esistenti. Restituirli insieme in un’unica risposta è un’evoluzione distinta, non un blocco alla prima preview. Anche il totale di un singolo oggetto è disponibile tramite summary filtrato; un aggregato massivo per tutti gli oggetti richiede ulteriore supporto. Subtotali mensili completi, filtro per mese fattura mancante e ricerca libera estesa richiedono dati/contratti adeguati: non ricavarli dalle sole righe paginate. Confronti sempre sullo stesso periodo; storico assente distinto da zero e da risparmio.

Questo lotto non implementa il redesign né modifica la preview; la convergenza visiva resta da concordare prima di cambiare i percorsi.

## Consegna e limiti

Solo frontend e documentazione, PR verso consolidamento. Nessuna AI/email, DB/API/storage reale, .env, migrazione o aggiornamento app. Nessun collaudo visivo nuovo dichiarato. Stato/roadmap/changelog aggiornati; merge e attivazione al committente.

Attività del committente: approvare la correzione del riepilogo; concordare successivamente la preview convergente a pagina unica. Nessuna correzione dei dati registrati necessaria.
