# Dimora Partner Amministratori — UX consolidata v0.1
Data: 13 ottobre 2026. Stato: decisioni di concept approvate; non software implementato.
Riferimenti: DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md; MASTER_FUNCTIONAL_CATALOG_v0.2_20261012.md e questionario amministratori.

## Proposta di valore C (approvata)
Memoria tecnica e gestione attenzioni dello studio, con pubblicazione selettiva verso le Home dei proprietari. Benefici ipotizzati: riduzione ricerca informazioni, continuità documentale, servizio ai condomini; **non risultati misurati**. Non duplicare gestionale o contabilità condominiale.

## Dashboard C
Dashboard ibrida: attenzioni trasversali al portafoglio + lista ricercabile/filtrabile degli edifici. Stati documenti/importazioni/proposte non vanno confusi con conformità o urgenza legale.

## Nuovo edificio C
Creazione con pochi dati identificativi essenziali; poi ingresso alternativo **importazione massiva document-first consigliata** oppure **censimento manuale impianti comuni**. Elaborazioni AI soggette a review e quote; documenti originari conservati.

## Memoria tecnica C
Vista **Impianti** e vista **Documenti**, incrociate e non duplicanti; dettaglio impianto con fonte, stato, storico, scadenze determinabili e verifiche. Inbox **«Da rivedere»** per edificio e aggregata a livello di portafoglio.

## Pubblicazione selettiva e versionata C
- Archivio interno distinto dalla vista pubblicata; nessuna pubblicazione implicita con il caricamento.
- Amministratore seleziona contenuti/pacchetti, destinatari per edificio/unità, verifica autorizzazioni e conferma.
- Conservare origine/versione/manifesto degli aggiornamenti; nuovi documenti non sovrascrivono archivi personali Home.
- **Aggiornamento differenziato C**: nuove versioni comuni informative si mostrano automaticamente nella sezione condominiale degli utenti autorizzati; modifiche a dati personali, scadenze e responsabilità vengono soltanto **proposte in «Da rivedere»**.
- Documenti privati dell'unità non si inviano indistintamente a tutte le unità; la diffusione rispetta permessi specifici e verifiche legali.

## Collegamento Home/unità C
Email o link/codice a durata limitata; destinatario accetta, sistema evita enumerazione account e verifica il titolo/autorizzazione ove necessario. Il collegamento riguarda **unità + diritti**, non solo edificio/indirizzo.
Cambio titolarità **procedura C con storico e controlli**: verifica data di efficacia/titolo, revoca accessi applicabili dell'ex proprietario, invito al nuovo e gestione documenti storici secondo diritti e retention. Nessun passaggio automatico dei documenti personali del precedente.

## Home — sezione Condominio C
- **Progressiva/indipendente**: se l'amministratore non usa Dimora, il proprietario conserva documenti, spese e promemoria condominiali manualmente.
- In caso di collegamento, si aggiunge la fonte amministratore senza sovrascrivere la memoria personale.
- Sezione «Condominio» dentro Casa e contenuti pertinenti anche nelle tab Attività, Documenti e Spese senza duplicazione fisica di file. Evidenza provenienza, versione e permessi.
- Spesa comunicata dall'amministratore non equivale a pagamento avvenuto/incasso confermato.

## Integrazioni C (approvata)
V1 utilizzabile in modalità **standalone con caricamento massivo** e, dove realmente compatibili, import di file/export di gestionali esistenti. Architettura progettata per API/connettori futuri, ma **nessun connettore specifico promesso** prima di aver verificato domanda, permessi, accesso API, fattibilità e unit economics. Non richiedere re-inserimento obbligatorio dei dati gestionali.

## Stati di esame e fiducia
Documento disponibile ≠ dato confermato ≠ regola normativa applicabile ≠ conformità accertata. Le proposte AI non vanno pubblicate come verificate. Attività differenziate: tecnico, amministratore, proprietario e terzi abilitati, secondo rispettive competenze e autorizzazioni.

## Wireframe e test successivi
Dashboard portafoglio; onboarding edificio doc-first/manuale; vista tecnica Impianti/Documenti; inbox; pubblicazione contenuti/destinatari/anteprima/versioni; invito collegamento; cambio proprietario; Home Condominio personale/collegato; nuova versione pubblicata. Testare scalabilità su 10/50/100+ edifici (volumi di test, non assunzione di performance).

**Restano aperti:** pricing amministratori, contratto e titolarità/portabilità della memoria comune, permessi reali e GDPR, integrazioni specifiche, criteri di pubblicazione, regole normative documentate, effort e roadmap di rilascio.

## Segnalazioni intelligenti — workflow V1 APPROVATO successivamente
In prima release, il proprietario segnala un problema reale da Home, dopo proposta non bloccante di comunicazioni/casi già noti. L'amministratore vede la segnalazione in una **inbox dedicata** (separata dall'inbox AI/documentale), con ambito edificio/scala/impianto e dati di contatto autorizzati. Può raggruppare segnalazioni su un evento comune preservando gli originali, chiedere dettagli, segnare presa in carico e pubblicare comunicazioni mirate ai soli destinatari interessati. Il segnalante vede lo stato della propria richiesta; altri proprietari vedono solo comunicazioni approvate e pubblicate, non segnalazioni private. Stati di presa in carico/risoluzione mai attribuiti automaticamente dall'AI. Chiusura con conferma dell'amministratore e storico. Il suggerimento di duplicato non blocca l'invio; urgenze gestite via canali di emergenza appropriati. In V1 non costruire gestionale ticket con SLA, fornitori, ordini, contabilità o gestione lavori.
**Criteri UX minimi:** anteprima recipienti prima di pubblicare; conferma esplicita; stato reale di consegna separato dalla pubblicazione; possibilità di correzione e revoca dove applicabile; feedback verificabile. Obiettivo di riduzione chiamate da misurare, non dato acquisito. Connettori e automazioni notifica esterna dipendono da sviluppo tecnico.
