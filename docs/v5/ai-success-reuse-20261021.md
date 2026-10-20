# Analisi AI riuscita: riuso dei risultati — 21 ottobre 2026

## Regola confermata

Un documento già analizzato con successo non viene inviato di nuovo all’AI, anche quando le proposte sono ancora da confermare. Si riaprono i risultati esistenti per controllo, correzione manuale e conferma. Completato e analisi riuscita sono condizioni distinte. Nessun autosalvataggio delle bozze introdotto.

## Implementazione

- Lista canonica: `aiAnalysisSucceeded` calcolato per account, casa, documento, versione e SHA correnti. È vero quando esiste un job prodotti riuscito oppure una proposta `extraction`. La selezione multipla esclude questi documenti, i completati e le righe Da rivedere; un aggiornamento esclude anche selezioni divenute non ammissibili. Le richieste dall’esito incerto conservano il gruppo/chiave originali per il recupero idempotente.
- Capabilities: `analysisSucceeded` e `successfulDraftId`; i due ingressi per nuovo avvio e retry incerto risultano disabilitati dopo un successo, indipendentemente dalla campagna/budget attuali o da un tentativo successivo fallito. Modifica manuale e lettura delle proposte restano disponibili.
- Server: dopo accesso alla fonte e controllo della chiave già usata, lock della coda e ricerca di successi per lo stesso snapshot/scopo. Un nuovo avvio restituisce il job riuscito esistente, senza nuovo job, riserva o invio. Proposta estratta senza job storico: 409 `onboarding_analysis_already_succeeded`, con invito a riaprire le proposte. Replay di una chiave esistente restituisce sempre il risultato originario. Le analisi planimetria hanno scopo separato: non sono confuse con l’estrazione di spese/oggetti.
- Interfaccia: ingresso AI diretto riapre la proposta riuscita; niente consenso o pulsante di nuovo avvio. Messaggio esplicito sul riuso dei dati. Una scheda manuale esplicitamente aperta mantiene priorità e può rimandare ai dati estratti. Nessun valore già salvato sovrascritto.

## Verifica

71 test frontend superati (50 workflow/compilazione e 21 azioni/selezione/recupero); copertura aggiunta di proposta non confermata, successo storico anche in Attenzione, aggiornamento durante selezione e URL diretto AI senza nuovo POST. 18 test backend superati senza DB/provider (5 nuovi casi e 13 regressioni dei profili): riuso con chiavi nuove, capacità bloccate, proposta storica senza job, fonte mai analizzata e replay idempotente.

Browser reale desktop e mobile 390/320: bolletta già confermata, messaggio di analisi riuscita, risultati/spesa esistenti consultabili, nessun avvio AI. Proposta ancora aperta e archivio misto provati nel browser con componenti reali e API in memoria: casella disponibile solo per il documento mai analizzato; accesso diretto AI riapre la bolletta estratta, campo fornitore correggibile senza salvataggio. Nessun overflow nelle viste provate. Evidenze locali: `outputs/no-reanalysis-20261021/` nella chat di lavoro.

Build frontend/backend, TypeScript e lint mirati verificati. Avviso Vite preesistente sul bundle principale di circa 503 kB. Non eseguita nuova analisi Anthropic o prova di invio sul backend reale. Nessun upload, nuova bozza, salvataggio o modifica di dati reali; niente schema/migrazione. Legacy locale preservato. API locale riavviata per caricare il codice aggiornato; server isolato di collaudo arrestato al termine.
