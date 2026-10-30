# Pacchetto dati per futuro incarico — incremento interno

30 ottobre 2026, specifica di riferimento negli output della chat: `Dimora-incarico-readiness-v01.md`. Ipotesi da validare con un’agenzia reale. Nessun modello contrattuale validato è disponibile.

## Implementato

`prepareMandateDataPacket` è una funzione pura in `backend-v5/src/agency-practices/mandate-packet.ts`. Selezione esplicita di una unità e un soggetto, binding campo/fatto/versione, campi richiesti espliciti. Non sceglie persone dall’atto, non decide chi siano gli eredi, non unisce unità o tipi di superficie.

Riutilizza i fatti confermati e le correzioni motivate, conservando autore/data, origine e fonte/versione/SHA/pagina/estratto. Richiede assegnazione e permesso export, anche per admin. Una selezione inaccessibile nega l’intero pacchetto. Controlla revisione della pratica e del fatto; dati proposti/rifiutati/superati esclusi con motivo. Campo assente distinto da false o zero. Input esatto, niente template approvato dichiarabile dal client.

Fingerprint canonico sui campi selezionati, indipendente dall’ordine proprietà JSONB e dal momento della lettura. Include la revisione pratica: modifiche non pertinenti possono invalidarlo conservativamente. Nessuna mutazione.

## Limiti e decisioni

È un **pacchetto di revisione interno**, non un valutatore completo di prontezza per un incarico. `canGenerateDraft`, `certification`, `completenessAssessed`, `findingsAssessed` sono sempre false; `templateState` è sempre missing. Anche una lista problemi vuota non significa pronto o conforme. Il chiamante sceglie i campi richiesti e non rappresenta un modello approvato.

Nessuna API, persistenza del pacchetto, UI, download o DOCX aggiunti. Nessuna AI di estrazione atti. Nessuna verifica che una citazione sia realmente presente nel PDF. Il contesto Actor/Practice deve provenire dallo store autorizzato aggiornato; una futura route deve rivalidarlo transazionalmente, non accettarlo dal client.

Il catalogo attuale manca di identità completa, contatti e date incarico; durata non ha ancora unità definita e provvigione è testo. Non vengono normalizzate, né prodotte clausole per riempire le lacune. Finding successione/difformità non valutati da questo modulo: un prossimo readiness completo deve applicare regole esplicite del modello approvato, con privacy e riaperture.

## Collaudo e continuità

Tredici nuovi test nel profilo findings già protetto: proposta non promossa, valore confermato/corretto con prove, fonte sostituita, privati/admin/export, CAS pratica/fatti, binding incompatibili, mancanti/duplicati/schema e fingerprint JSONB/tempo. Build e lint mirato verdi; profilo findings finale 26/26. Regressione ordinaria 519/519 con i primi dieci nuovi casi; dopo sono stati aggiunti soltanto tre test ulteriori, verdi nel profilo mirato. Nessun nuovo codice dopo la regressione.

Lavoro eseguito nel worktree di verifica separato per non alterare i file del cablaggio navigazione concorrente. Nessun cambio servizi, deploy, merge, dati personali, spesa AI o demo Alessio. Nuovi test in cluster non necessari: funzione pura senza nuovo contratto DB/HTTP.

Prossimo passo: modello reale dell’agenzia e contratto dei campi mancanti; poi readiness completo, persistenza e UI. Non presentare questo incremento come generazione incarico completata.
