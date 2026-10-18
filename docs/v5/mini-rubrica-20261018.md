# Mini rubrica della casa — 18 ottobre 2026

## Disponibile nell'app

Ingresso Casa → Rubrica, route /home/:homeId/rubrica, dettaglio /rubrica/:contactId. Contatti personali per account e casa: nome/ragione sociale, mestiere/ruolo, persona/impresa, telefono, email, note e identificativo fiscale facoltativo. Cerca nome/mestiere; attivi/archiviati; liste paginate. Chiama o apri un'email solo con azione esplicita sui recapiti inseriti.

Le schede di documento, oggetto/impianto, spesa, lavoro e attività permettono di collegare un contatto esistente o crearne uno inline. Creazione contatto e collegamento sono una transazione; il modulo della risorsa non viene riscritto. I collegamenti partono da risorse già salvate, non dalla bozza di una nuova spesa/lavoro. Il dettaglio del contatto mostra i collegamenti autorizzati e permette di rimuoverli.

Archiviazione reversibile: conserva il contatto e i collegamenti, vieta nuovi collegamenti finché non viene ripristinato. Nessuna cancellazione definitiva esposta. Versioni e ricevute d'idempotenza impediscono retry duplicati e aggiornamenti concorrenti silenziosi. Controllo duplicati nell'ambito privato: email/telefono/identificativo fiscale normalizzati; nome e mestiere identici soltanto quando entrambe le voci sono prive di recapiti/identificativo. Non si uniscono persone diverse sulla sola somiglianza del nome.

## Conformità e proposta installatore

Il dettaglio di una conformità può offrire Aggiungi l'installatore. Usa esclusivamente issuer già validato in una bozza estratta dell'account, stessa casa/documento/versione/SHA. Nessuna chiamata AI o ricerca esterna. Nome e ruolo modificabili, telefono/email vuoti. Il contatto viene creato e collegato all'originale solo con Salva contatto. Nessun contatto dai fornitori testuali di bollette/negozi, nessun backfill automatico. Verificata nel browser la proposta dall'originale reale, poi annullata senza scrittura.

## Dati e permessi

Migrazione additiva 20261018130000_home_contacts: HomeContact, ContactResourceLink e ContactRequest, solo DB V5 dedicato. Account/casa come confine di privacy, membership e versione rilette nella transazione; sessione/contesto/CSRF sulle API. Collegamenti ad altre case/account o fonti illeggibili rifiutati; accesso riesaminato a ogni lettura e titoli/referenze revocati omessi. Recapiti non inseriti in timeline o consegne condivise. Export personale include soltanto contatti propri e riferimenti esportabili; nessun nuovo export della rubrica altrui. Non usa Google Contacts né invia messaggi.

## API contacts-v1

Base /api/v5/homes/:homeId:

- GET contacts: q, state=active|archived|all, resourceKind/resourceId facoltativi, limit1–50, cursor vincolato a account/casa/filtri.
- GET contacts/:id e contacts/:id/links: dettaglio e risorse leggibili paginate.
- POST contacts: {values,resource?}; ritorna {contact}, status201.
- POST contacts/:id/updates: {expectedVersion,values}; archive/restore: {expectedVersion}; links/unlink: {expectedVersion,resource}. Status200.
- GET contact-suggestion?documentId: {suggestion:{name,profession,documentId}|null}.

values: name obbligatorio max120, profession80, phone40, email254 validata, fiscalId32, note1000; facoltativi nullable, kind person|company. resource={kind:document|object|boiler|expense|work|activity,id:UUID}. Tutte le mutazioni richiedono Idempotency-Key16–100caratteri; errori422 validazione,403 ambito/accesso,409 version_conflict/contact_duplicate/contact_archived/idempotency_conflict. Nessuna quota AI usata.

## Prove

- 10 test HTTP/DB reali su account/casa sintetici: autenticazione/CSRF/contesto, privacy tra membri, CRUD, aggiornamento concorrente, rollback inline, collegamenti canonici a cinque risorse, revoca fonte, archivio/ripristino/rimozione, gara doppioni, cursore scoped, proposta issuer/staleSHA, export e viewer.
- 1 test unitario con più input ostili/non validi, inclusi email/telefono e query duplicate.
- 9 test HTTP/DB dell'export personale già esistente, tutti verdi.
- 89 test frontend distinti fra rubrica, oggetti, spese, documenti e attività. Quattro nuovi casi rubrica: CRUD/archivio, installatore inline, risposta persa e chiave di retry stabile, duplicato con dati del form conservati. Allineata una vecchia asserzione dell'elenco documenti che pretendeva ancora il badge Caricamento manuale già rimosso su richiesta del committente: nessuna nuova modifica del badge.
- Prisma validate, build/lint backend, typecheck/lint/build frontend verdi.
- Browser reale: creazione, dettaglio, modifica aperta e annullata, archivio e ripristino del solo contatto sintetico in casa temporanea; desktop/mobile390/320 senza overflow. Casa QA e contatto rimossi integralmente. Screenshot privato outputs/mini-rubrica-mobile-20261018.png.

## Conservazione e confini

Appartamento Roma invariato: 9 documenti, 5 oggetti, 5 spese3012.17EUR, 1 ambiente, zero contatti creati dalle prove; noveSHAoriginali invariati. Budget5USD, residuo2.416046USD,39/50analisi: nessuna nuova chiamata. Nessun deploy/push, cambio firewall, condivisione o importazione rubrica telefono. Runtime API locale aggiornato; automazione precedente resta PAUSED.

Restano fuori da questa prima versione: riuso fra case, contatti condivisi, importazione telefono, estrazione automatica di recapiti, conferma AI combinata contatto+nuova spesa/lavoro (BL-10b). Il collaudo della completezza dell'estrazione su nuovi originali rimane distinto dalla mini rubrica.
