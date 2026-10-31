# Gift v1 — interfaccia collegata all’app

1 novembre 2026. Ramo `codex/agency-gift-contract-20261031`, PR draft72. UI collegata e verificata su fixture; browser separato ancora in collaudo. Il precedente checkpoint API è `e490231`. Nessun deploy, email reale o modifica della demo Alessio.

## Percorso implementato

Nella pratica `/agenzie/:agencyId/pratiche/:practiceId`, il pannello Gift usa lo stesso trasporto autenticato dell’app. È visibile solo con ingresso Gift configurato. L’agente verifica e rilascia gli originali caricati, seleziona esplicitamente i documenti finali, indica una sola email, conferma la stipula e decide se includere l’anno. Il link viene creato sul server e copiato manualmente: nessuna email risulta inviata da Dimora. Autori, firme, versioni e qualifiche delle superfici restano derivati dal registro server.

Il destinatario apre `/gift/:invitationId#token=...`. Il frammento viene rimosso con replace; il segreto rimane soltanto in memoria. Accesso e registrazione sono quelli normali di Dimora, con ritorno alla Gift senza segreti negli URL `next`. Il nuovo account deve confermare l’email tramite il normale servizio: nessuna verifica sintetica viene aggiunta al prodotto. La conferma mostra il ritorno alla Gift nella stessa app; da una nuova scheda indica di tornare alla consegna o riaprire il link dell’agenzia.

Il destinatario vede i soli metadati autorizzati, conferma nome e indirizzo della nuova casa e la ricezione. Il claim non crea nulla; l’accettazione avvia il lavoro durevole, ne legge lo stato e apre la normale Home soltanto dopo la ricevuta server. Nessuna fusione implicita con case esistenti. Il flag opzionale attiva12mesi di tutte le funzioni proprietario da quell’accettazione; il riepilogo della Home legge il diritto dell’account. Nessun limite free, addebito o rinnovo viene introdotto.

Documenti ricevuti e documenti caricati manualmente restano distinguibili nel normale archivio e dettaglio. Il pannello di provenienza conserva titolo alla consegna, origine/autore dichiarati, fonte/versioni/SHA e tutte le qualifiche delle superfici. Nessun totale m² viene inventato dai soli metadati e nessuna consultazione dell’Agency è necessaria. Il proprietario può continuare usando i normali strumenti della casa; l’agenzia non ottiene accessi alle sue aggiunte.

## Recupero e privacy

- Reload prima dell’avvio: riaprire il link originale; resta sempre un ingresso normale per accedere e riprendere un lavoro già avviato.
- Reload dopo l’avvio: `my-acceptance` ritrova soltanto il lavoro del proprio account, anche senza token. La ricevuta accettata viene letta prima del gate email locale.
- Cambio account o logout: segreti, ritorno Gift e contenuti precedenti vengono eliminati dalla memoria; il passaggio guest→primo accesso li conserva.
- Path codificati/case: il matching reale del router individua comunque la rotta Gift e ne rimuove i frammenti; solo la forma canonica ammessa può diventare un ritorno dopo login.
- Landing temporaneamente non raggiungibile: retry esplicito sul medesimo link, distinto da link non disponibile. Una nuova credenziale per lo stesso invito non riusa una vecchia verifica.
- POST con esito incerto: lettura del server prima dell’eventuale retry esplicito con identici corpo e chiave; nessun nuovo invio automatico o segreto nella cache Query/storage/log.

## Rigenerazione atomica

`POST /agencies/:agencyId/practices/:practiceId/gift-invitations/:id/reissue`, `Idempotency-Key`, corpo `{expectedRevision, expectedVersion}`. Nuovo invito e revoca del precedente nella stessa transazione, con controllo corrente di edit/export e fonti. Restano invariati destinatario, selezione, destinazione riservata e offerta dell’anno; la nuova scadenza è7giorni. Un’accettazione prenotata deve essere annullata dal proprietario prima di rigenerare; una Gift accettata non è modificabile.

Il segreto è restituito solo dopo il primo commit. Replay durevole senza nuova rotazione e senza segreto; una risposta persa può richiedere una nuova rigenerazione dell’ultimo invito. Lo stato storico della sostituzione viene rispettato anche se quella sostituzione è stata successivamente revocata. Ledger e inviti sono limitati a100per pratica; nessuna mutazione parziale quando il limite è raggiunto. I dati del ledger sono nel medesimo snapshot bloccato della pratica, nessuna nuova migrazione.

## Limiti di frequenza

Contatori atomici persistenti e con namespace Gift nella tabella throttle esistente, senza token, email o ID invito. IP e account derivano dal server; `X-Forwarded-For` del chiamante non determina il bucket. Le chiavi sono pseudonime, non anonime. Finestre fisse di15minuti: landing60/IP; mutazioni240/IP e120/account; letture1200/IP e600/account, compatibili con il polling singolo ogni1,5secondi. I tentativi negati restano contabilizzati, i contatori saturano senza overflow, pulizia soltanto dei record Gift scaduti. Errore SQL:503, superamento:429. Questi limiti tecnici non sono limiti del piano free.

## Verifiche dell’incremento

- Backend ordinario:863/863, inclusi204unit Gift. Prima esecuzione fallita solo per l’elenco esatto del nuovo file DB nel test del runner; asserzione aggiornata conservando allowlist e divieti.
- DB/HTTP:126/126 su nuovo cluster `okUXtn`, poi arrestato; poller6/6 sul nuovo cluster `K2PNgn`, arrestato. Primo8Ggfjj:124/126, un sottocaso e relativo contenitore falliti perché la fixture leggeva sourceFingerprint dalla colonna anziché dallo snapshot; corretto il test, nessuna guardia prodotto allentata. Cluster arrestato, nuova esecuzione distinta.
- Frontend completo1924/1924,184file, dopo l’allineamento del titolo del pannello documenti (prima1923/1924). Typecheck/lint e build app verdi; chunk principale513,48kB, gzip156,51kB, con warning Vite500kB non soppresso. I test DOM restano distinti dal browser.
- Browser desktop/375px: ancora da eseguire su un nuovo ambiente sintetico posseduto con un contesto browser isolato. Cambiare porta non isola i cookie.

Il successivo profilo browser nominale mantiene tutte le guardie:14/14test del runner dopo la sua registrazione. Prima partenza `MkZHb5` arrestata su errore del servizio SPA dalla cache nascosta; fallback limitato al solo index già letto, nessun cambiamento prodotto o di autenticazione. Seconda partenza nuova distinta, non ancora esito browser.

## Limiti residui

Scanner e email dei collaudi sono stub espliciti; non sono una prova antivirus, consegna email o uso da parte di un’agenzia reale. Nel prodotto restano i normali controlli scanner/email, senza bypass. Modello incarico approvato e generazione automatica dei PDF mancano: si possono rilasciare originali finali già caricati. Le superfici ricevute conservano metodo e caveat e richiedono controllo. Multiutenza Gift e piano free futuro rimandati. Attivazione nell’ambiente prodotto, merge e deploy restano esclusi da questo lotto.
