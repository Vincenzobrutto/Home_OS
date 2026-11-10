# Collegamento dell’analisi atti al fascicolo — contratto di implementazione

30 ottobre 2026. Specifica del prossimo incremento del percorso scelto da Vincenzo: documenti → analisi → verifica → bozza. **Questo documento non descrive funzionalità già attive.** Il modello d’incarico non è ancora disponibile; la generazione resta bloccata. Nessun nuovo invio AI o budget viene autorizzato dalla specifica.

## Punto di arrivo

L’agente sceglie un atto già nel fascicolo, vede che cosa verrà inviato e il limite economico, autorizza quell’analisi, riceve proposte con citazioni e le associa esplicitamente. Le viste di revisione già implementate gestiscono poi conferma, correzione o rifiuto. Dati storici, persone decedute ed eredi dichiarati non diventano automaticamente conferenti attuali.

Il risultato salvato deve essere un record dello stage interno già disponibile, non un insieme di fatti confermati e non testo attestato dal browser. Anche un job riuscito può contenere proposte escluse o informazioni mancanti.

## Componenti esistenti da riusare

| Confine | Codice esistente | Regola |
| --- | --- | --- |
| Originale e permessi | agency-practices/files.ts e store.readFile | Byte dal vault, fonte/versione/SHA correnti; nessun URL o percorso del client |
| Testo PDF | agency-practices/deed-text.ts | loadAuthorizedDeedText prima/dopo decoding, parser locale; PDF senza testo richiede percorso OCR distinto |
| Contratto candidati | agency-practices/deed-extraction.ts | Citazione e valore letterali verificati sul testo fisico; nessuna verifica semantica o giuridica |
| Record e persistenza | deed-records.ts e stageDeedProposals | Ricalcolo server, privacy, dipendenza, CAS e receipt; niente stage HTTP autoattestato |
| Associazione e revisione | read/bind API, ReviewWorkspace | Destinazione/ruolo espliciti, fatto ancora proposto, decisione distinta |
| Preparazione incarico | MandateSelectionWorkspace e mandate-packet.ts | Vista interna e pacchetto export sono confini diversi; nessun modello o bozza pronti |

Il ledger delle planimetrie non va riusato fingendo che l’autorizzazione per una planimetria copra un atto. L’attuale budget sperimentale e i journal privati non autorizzano altri dispatch.

## Contratto HTTP proposto, non registrato

Prefisso: /api/v5/agencies/:agencyId/practices/:practiceId.

GET /deed-analysis-options riceve solo una selezione di fonte già autorizzata. Restituisce disponibilità effettiva, tipi supportati e un’offerta server opaca legata a fonte/versione/SHA, pagine, finalità, provider, tariffa, cap, valuta e scadenza. Nessuna credenziale o percorso interno. Se il servizio è spento, dichiararlo: nessun mock fallback.

POST /deed-analysis-jobs con sessione, Origin/CSRF e Idempotency-Key. Body esatto proposto: expectedRevision, sourceId, expectedSourceVersion, pages, offerId, approved:true. Il server ricava identità, agency, SHA e prezzi; il client non può fornire risultato AI, testo fidato, costo effettivo, stato o authorizationId arbitrario. Page selection deve corrispondere esattamente all’offerta.

GET /deed-analysis-jobs e GET /deed-analysis-jobs/:jobId restituiscono soltanto job leggibili e stati/costi autorizzati. Originali o citazioni private non devono comparire in liste o errori di altri utenti. Le risposte sensibili sono no-store/nosniff. Nessuna route di generazione incarico viene aggiunta da questo lotto.

## Persistenza proposta

Nuovo job documentale con finalità distinta DEED_EXTRACT, non una planimetria mascherata. Proposta di campi minimi: agency/practice/account, fonte/versione/SHA, pagine canoniche, offerta e versione prezzo, cap/valuta, receipt consenso, idempotency digest, stato, revisione attesa, lease owner/scadenza/fence, tentativi, dispatch marker durevole, costo contabilizzato, provider receipt, recordId finale e motivo di scarto generico. Contenuti sensibili non nei log.

Prenotazione di budget e creazione del job avvengono insieme sotto lock e CAS. Idempotenza actor-scoped durevole; stessa key e body identico restituiscono lo stesso job, body diverso conflitto. Il test deve sopravvivere a processo riavviato. Nessun dedupe soltanto in memoria o flag locale di UI.

Stati minimi: queued, leased_before_dispatch, dispatched, completed_with_proposals, completed_unusable, discarded_source_changed, denied_after_revocation, uncertain_no_retry, failed_before_dispatch. Accounting può avere una propria chiusura durevole senza rendere nuovamente leggibili le fonti dopo revoca.

## Esecuzione e denaro

1. Claim esclusivo del job e verifica del fence. Rileggere membership/grant/fonte e offerta corrente.
2. Leggere e decodificare byte autorizzati con i limiti del decoder attuale. Non eseguire il parser sotto un lock DB lungo. PDF senza testo non diventa un’estrazione riuscita o una richiesta OCR implicita.
3. Prima di qualunque count o dispatch esterno, ricontrollare consenso, finalità, prova, pagine, prezzo, disponibilità e cap. Anche il count può trasferire dati e richiede consenso.
4. Registrare il dispatch marker durevole prima del trasporto. Provider a destinazione consentita, timeout e limiti output, nessun redirect/retry automatico o corpo grezzo negli errori.
5. Risposta come candidati non fidati; testo e hash pagina restano quelli del decoder server. Limitare dimensione e validare il contratto esistente, senza associare riferimenti AI a persone/unità.
6. Contabilizzare anche output inutilizzabile o scartato. Se fonte/permessi cambiano, non salvare proposte leggibili: preservare soltanto l’accounting dovuto e il motivo generico.
7. Commit unico di record stage, receipt e stato finale quando ancora autorizzati. Lease/fence errato non può registrare un secondo risultato.

Dopo timeout/disconnessione/crash successivo al dispatch non si presume costo zero: stato uncertain_no_retry e riserva conservata fino a riconciliazione esplicita. Nessun reinvio automatico per ottenere una risposta più gradevole. Un job chiaramente mai inviato può essere recuperato soltanto provando dal ledger l’assenza di dispatch; non dedurlo dal tempo trascorso.

Non applicare conversioni EUR/USD o prezzi presunti. Catalogo e valuta dell’offerta sono server-side; eventuale tetto in altra valuta richiede una regola esplicita e verificata prima di autorizzare spesa.

## Casi di accettazione da implementare

| Caso | Esito atteso |
| --- | --- |
| Atto con testo, citazione presente | Record proposte, nessun fatto confermato |
| Pagina senza testo o scansione | Esito esplicito non leggibile; nessun OCR/invio extra implicito |
| Fonte sostituita prima del count | Nessun trasferimento o nuova spesa |
| Fonte sostituita dopo risposta | Accounting preservato, risultato scartato |
| Grant revocato durante parsing | Nessun dispatch |
| Grant revocato durante trasporto | Nessuna proposta esposta; accounting del solo run |
| Documento/record privato e admin assegnato | Nessun accesso implicito al privato altrui |
| Key identica dopo riavvio | Stesso job/receipt, nessun doppio invio |
| Key identica con pagine diverse | Conflitto, nessun nuovo invio |
| Due worker o lease scaduta | Un solo dispatch provato, fence obsoleto rifiutato |
| Timeout dopo dispatch | Incerto e nessun retry, cap non liberato automaticamente |
| Output malformato o citazione inventata | Costo registrato, candidato escluso/risultato inutilizzabile |
| Venditore storico e persona deceduta | Ruolo documentale distinto, nessun current_owner |
| Due eredi e due unità | Nessuna fusione di soggetti o associazione per nome |
| Quote/diritti non supportati | Mancanti espliciti, nessuna normalizzazione inventata |
| Modello incarico assente | Preparazione consultabile, bozza sempre bloccata |
| Tutti i finding risolti | Nessuna certificazione o dichiarazione di completezza |
| Provider disabilitato | UI esplicita, nessun risultato sintetico nel runtime |

Sono casi pianificati, non18test già eseguiti. I test precedenti del decoder/contratto/stage non dimostrano il job/ledger proposto.

## Ordine di implementazione

A. Schema e adapter job/consenso/budget documentale con test su cluster nuovo posseduto, riavvio e concorrenza. Nessuna migrazione su servizi esistenti.
B. Coordinatore decoder→dispatch→stage con provider finto nei test, scenari di revoca/fonte e incerto; poi DTO/API reali.
C. UI selezione atto/pagine/offerta e avanzamento, usando le viste di associazione/revisione già collaudate.
D. Solo con incarico specifico, consenso e budget attuali: prova AI reale circoscritta. Non è autorizzata da questo documento.
E. Modello agenzia effettivo e mapping approvato, validazione export server, generazione/versionamento bozza. Firma e adempimenti restano separati.

Criterio di chiusura del lotto: percorso sintetico browser/API/DB, desktop/375, cluster/server fermati, esiti e limiti separati, nessuna promessa di correttezza giuridica. Consegna del modello da parte dell’agenzia è un input per E, non una ragione per bloccare A–C.
