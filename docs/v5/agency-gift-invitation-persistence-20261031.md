# Gift v1 — persistenza degli inviti

31 ottobre 2026. Secondo incremento del piano autorizzato. Implementato e verificato come porta interna; non collegato a controller, navigazione o invio di link reali. Claim resta distinto da accettazione/copia Home. Nessun servizio premium attivato.

## Ledger e schema

Nuova tabella AgencyGiftInvitation: scope agenzia/pratica/emittente, chiave e digest della creazione, tokenHash univoco, versione/stato/scadenza, account associato e snapshot. FK a entità esistenti, unique per pratica/emittente/creationKey e vincoli stato/versione/claim. Migrazione 20261031210500_agency_gift_invitations preparata nel ramo, applicata SOLO ai nuovi cluster sintetici di test. Client Prisma rigenerato nella cartella privata; nessuna installazione nelle junction o migrazione prodotto.

Snapshot e colonne SQL vengono controllati insieme: ID, scope, emittente, hash, chiave, versione/stato, date e claimant devono corrispondere. Il creationDigest viene ricostruito dal comando originario nel manifesto immutabile, non accettato sulla fiducia. Dichiarazioni di stipula/rilascio conservate con attore e istante; sono dichiarazioni dell'agente, non verifiche notarili.

## Porte interne

GiftInvitationsStore espone create, landing, claim e revoke. AgencyPracticesStore fornisce un contesto transazionale interno che riusa membership/grant e lock della pratica; nessuna route espone tale contesto o accetta prove account/fonte dal browser.

Create/revoke richiedono edit+export correnti. Il flusso di un invito già emesso rilegge export dell'emittente e autorizzazione delle singole fonti. Ordine lock: membership → grant → pratica → invito → account destinatario. Identità/emailVerifiedAt provengono dall'Account bloccato, anche per account legacy che non richiedevano verifica. Il destinatario non riceve membership Agency.

Landing e claim restituiscono dati minimi, mai record/documenti/email o riferimento Home. La fonte corrente è ricostruita sul server: sostituzione, metadati diversi o perdita dell'export impediscono ulteriore utilizzo. Permessi e scadenza ricontrollati con tempo corrente prima delle scritture. CAS protegge claim/revoca concorrenti; il replay conserva ID e date.

Il segreto casuale viene restituito soltanto dal primo create dopo il commit. Nel DB rimane solo l'hash. Replay della creazione: secret=null,requiresReissue=true; non si recupera un segreto in chiaro dal ledger. Riemissione/rotazione del link è ancora da collegare al futuro trasporto. Durata interna predefinita:7giorni,con limite dominio30;prima di UI pubblica rendere la scadenza visibile e validare la policy.

Il nuovo homeId è allocato dal server e non sovrascrive una casa del client. È solo un riferimento futuro: create/claim non creano Home, Document o benefit. Offerta commerciale reale intenzionalmente assente: richiedere il beneficio restituisce benefit_unavailable, senza downgrade silenzioso o addebito.

## Verifiche e revisione

- 47/47 test mirati Gift e 706/706 ordinari, zero falliti/saltati; build/lint verdi.
- 33/33 DB nel profilo nominale Gift:14 del registro/pacchetto e19 degli inviti (18sottocasi+contenitore). Nuovo cluster dimora-offline-s7JxTF, arrestato dal runner e stop-postgres.log verificato.
- Migrazione e JSONB reali; nuova istanza store, creazioni/claim concorrenti, corpo diverso sullo stesso key, secret non persistito, account normale verificato senza membership Agency, email errata/non verificata, revoca export/invito, fonte sostituita, snapshot/SQL incoerenti, digest creazione corrotto e claim/revoca concorrenti.
- Revisione tecnica parallela ha individuato digest creazione non vincolato allo snapshot e chiarito edit+export sulle mutazioni. Entrambi corretti e coperti dai nuovi negativi prima della pubblicazione. Non è un audit di sicurezza formale o collaudo di API pubblica.
- Prima regressione ha rilevato l'aspettativa della vecchia whitelist file del profilo Gift: aggiornata all'elenco esatto dei due file,senza allargare target o guardie;regressione ripetuta con successo.

Log locali:gift-invites-store-unit-2.log,gift-invites-store-regression-2.log,gift-invites-store-db-2.log. Primo cluster AOY2rp anch'esso arrestato;le verifiche finali includono i negativi aggiunti dopo la revisione. Nessun DB/servizio esistente o collaudo utente toccato.

## Prossimo incremento e gap concreti

Prima della copia reale servono dati espliciti per creare la Home (nome/indirizzo approvati),non inferiti da etichetta pratica o atto storico. Il manifesto attuale congela solo il riferimento di destinazione. Anche la provenienza Gift deve essere rappresentata nelle proiezioni Document,che oggi presentano source manual_upload. Riutilizzare lo storage Home verificato,non fare alias alla vault Agency.

Poi:ricevuta di accettazione/copia recuperabile,byte/SHA e provenienza indipendenti,nessun grant inverso,stesse date/ID al replay. Infine controller con sessione/Origin/CSRF e UI registrazione/accesso dal link. Nessuna accettazione,link pubblico,Home o anno premium disponibili da questo incremento. Il modello d'incarico resta non approvato.

La ricognizione del copier ha verificato anche il controllo file:LocalFileStorage.writeVerified usa scanner e receipt di ammissione,mentre AgencyVault verifica firma/hash ma non antivirus.Non riutilizzare un controllo inesistente.Le scansioni possono superare la transazione da15secondi:serve staging/job durevole prima del commit atomico Home/documenti/receipt.Il cleanup a24ore dei file non referenziati deve rispettare lo staging.Le proiezioni source manual_upload vanno aggiornate con provenienza Gift vera,non sovrascritte da un semplice nomefile.
