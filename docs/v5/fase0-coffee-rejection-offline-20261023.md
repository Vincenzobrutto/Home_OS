# Fase 0: diagnosi offline del rifiuto del PDF della macchina da caffè

23 ottobre 2026, Codex. Branch `codex/fase0-ai-quality-v3`.

## Evidenza disponibile e limite della diagnosi

Nella precedente prova, autorizzata separatamente dal committente, il solo PDF reale anonimizzato della macchina da caffè è stato inviato ad Anthropic. Una richiesta Messages, preceduta da verifica del modello e conteggio token; risposta HTTP 200, `end_turn`. Costo contabilizzato nel ledger del DB temporaneo: **0,038409 USD**, entro 0,25 USD. Il decoder ha respinto la risposta alla fase `evidence` con `analysis_invalid_output`. Nessuna proposta AI accettata; conteggi invariati: un documento, zero oggetti, zero spese.

La risposta grezza non è stata conservata. Il percorso di prodotto salva il costo prima della validazione e soltanto l’output validato dopo di essa. Non è possibile ricostruire offline il campo o la citazione responsabile di questo specifico rifiuto. Non viene attribuita una causa ipotetica al documento, al modello o al suo nome commerciale. La disponibilità a un extra budget non è stata utilizzata.

Questa sessione è interamente offline: nessuna nuova chiamata AI, nessun retry, aumento budget, accesso al DB reale o mutazione del ledger. I log tecnici già disponibili sono sufficienti per identificare la carenza di diagnostica; non è stato necessario accedere al DB durante questa sessione.

## Problema dimostrato e correzione

Gli errori strutturali di `productExtraction`, inclusi valori troppo lunghi o coordinate non valide, venivano convertiti nello stesso `analysis_invalid_output`, senza localizzazione. La diagnostica preesistente distingueva soltanto le fasi response/wire/evidence e alcuni errori già tipizzati.

Aggiunta una localizzazione interna con vocabolario chiuso: sezione della validazione e, quando disponibile, nome di un campo prodotto ammesso. Coordinate non valide indicano `source_region`; un nome oltre il limite indica `item_field` / `name`. Una WeakMap associa il dettaglio all’errore senza aggiungerlo a output, API, bozze o ledger. Le informazioni più interne prevalgono su quelle generiche esterne. Le eccezioni provider esistenti conservano identità e codice; gli altri errori mantengono il precedente codice generico.

Il logger del decoder include soltanto questi metadati ammessi. Non include messaggi delle eccezioni, valori, testo originale, estratti, identificativi del documento, SHA o risposte grezze. Anche un nome di campo sconosciuto viene escluso dai log. Nessuna regola specifica per cliente o venditore, nessun troncamento, aumento dei limiti, inferenza o allentamento della validazione. Prompt, schema wire, API, DB e logica di budget/conferma invariati.

## Verifiche

- Backend build e lint superati.
- Suite onboarding completa **278/278**, incluse due nuove regressioni con più controesempi: nome di 120 caratteri ammesso e 121 respinto; regione assente, fuori pagina, vuota, negativa, infinita o con proprietà estranee respinta; pagina inesistente e campo sconosciuto respinti. Controllo esatto del log e assenza di payload privato, ID e SHA. Codici e identità delle eccezioni preservati.
- Suite ordinaria backend **214/214**.
- Runner/adattatore/autorizzazioni qualità **16/16**; trasporti offline, nessun invio live.
- Frontend invariato: suite mock non ripetuta in questa sessione; ultimo risultato storico 842/842 nel checkpoint UI.
- Nessuna suite HTTP/DB eseguita: modifica limitata alla diagnostica del decoder puro; nessun cambiamento di conferme, permessi, idempotenza o persistenza. Le regressioni esistenti di evidenze, totali, Q15/Q22/Q48 e privacy rimangono attive nella suite onboarding/ordinaria.

## Stato e seguito

**Implementato e verificato offline**: localizzazione sicura dei futuri rifiuti delle evidenze, senza dati privati nei log e senza cambiare ciò che viene accettato.

**Non determinato / non dichiarato risolto**: causa esatta e correttezza delle proposte della prima risposta reale; successo della precompilazione di questo PDF. I controesempi offline provano la diagnostica, non ricostruiscono il risultato perso. Un eventuale nuovo invio resta fuori da questo incarico e deve avere consenso e limiti espliciti; nessun retry automatico.

Nessuna modifica a `.env`, main, documenti originali, dati reali, file sporchi estranei, 104 StoredFile orfani o gold/scorer/soglie/ledger delle campagne sintetiche. Nessun deploy. Le bozze e l’esito del precedente ambiente di collaudo rimangono preservati.
