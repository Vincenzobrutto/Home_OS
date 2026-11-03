# Gift v1 — prenotazione durevole dell'accettazione

31 ottobre 2026. Ramo breve `codex/agency-gift-contract-20261031`, PR draft72. Prosecuzione oltre le23 autorizzata da Vincenzo. Questo incremento è interno: **non copia ancora documenti, non crea Home, non attiva l'anno e non ha route o UI pubbliche**.

## Implementato

- `GiftAcceptanceStore.begin`: accetta solo un invito già associato all'account corrente verificato e la conferma esplicita del nome/indirizzo della nuova casa. Rilegge dal DB identità, claim, permessi di esportazione dell'issuer e fonti correnti. Ricontrolla scadenza/export vicino al commit.
- Una pratica ha una sola prenotazione attiva, garantita da lock della pratica e indice univoco parziale SQL. La stessa richiesta normalizzata restituisce lo stesso lavoro; cambi di corpo/chiave confliggono. Altri account/inviti non vedono il lavoro riservato.
- Job e item riservano ID server per Home, documenti/versioni/file senza creare quei record. Il segreto non viene persistito nel job. Manifesto, fonte/versione/SHA e comando sono congelati e controllati anche dopo riavvio/JSONB.
- `get`: proprietà dell'account verificata prima di validare i dati. Mostra solo stato/progresso, senza nome/indirizzo, email, titoli, token o storage. Può mostrare questo stato minimo anche se l'export Agency cambia; non consegna contenuti e non autorizza il worker.
- Payload di staging cancellabili dopo la futura pubblicazione; nessuna FK a Home/Document/StoredFile che impedisca il purge del proprietario. Stato accepted attualmente fail-closed, finché non esiste il vero servizio di pubblicazione/ricevuta.
- `makeGiftBenefit`/`activeGiftBenefit`: offerta approvata `dimora-full-access-v1`,12mesi di calendario UTC dall'accettazione;29febbraio→28febbraio allo stesso orario. Intervallo `[inizio,fine)`. Non persiste o attiva ancora un diritto,non addebita e non modifica altri abbonamenti.

## Verificato

-97/97unit Gift,compresi14nuovi sull'anno completo.
-57/57DBGift (39precedenti+18prenotazione:17sottocasi e contenitore),su cluster nuovo posseduto `dimora-offline-XFaTSz`,arresto verificato nel suo `stop-postgres.log`.
-Validazione schema,client Prisma privato,typecheck e lint mirato verdi.
-Log: `work/agency-gift-evidence-20261031/gift-reservation-unit.log`, `gift-reservation-db.log`. Regressione ordinaria756/756verde (97Gift inclusi),zero fail/skip;log gift-reservation-regression.log.

Le prove DB coprono concorrenza/replay,chiave e conferma casa cambiate,account errato,claim mancante,scadenza/revoca,fonte sostituita,export ritirato,payload/item alterati e stato minimo dopo cambio email/revoca. Nessun database o servizio esistente usato.

Frontend invariato:1773test/typecheck/build precedenti restano storici del commit49e1c4b,non ripetuti per questo incremento backend. Nessun nuovo browser/375px o controllo AV reale. La demo pubblica di Alessio è invariata.

## Prossimo incremento

Worker con lease/fencing e staging indipendente;prenotazioni StoredFile per proteggere il cleanup;IO/scanner fuori dalle transazioni brevi. Pubblicazione atomica Home/documenti/ricevuta/anno opzionale,senza grant Agency. Il replay della ricevuta accettata dovrà precedere ogni controllo di invito/token/Agency e funzionare per lo stesso account anche dopo cambio email. Poi controller sessione/Origin/CSRF e flusso UI di registrazione/accesso normali.

Il design tecnico completo è conservato negli outputs locali della chat,`Dimora-Gift-v1-acceptance-job-design-20261031.txt`:è una proposta,non un modulo applicativo. I vincoli principali sono riportati qui per continuità del repository.