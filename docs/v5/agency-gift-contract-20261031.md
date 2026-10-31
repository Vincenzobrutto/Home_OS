# Agency → Gift → Home — incremento31ottobre2026

## Stato iniziale e perimetro

Registrato prima del codice;base comune cbddcf0884cdc17cfeff41daf7ba6cbe4ccd999e. Ramo codex/agency-gift-contract-20261031, checkout dedicato. Piano autorizzato fino23Europe/Rome:contratto,dominio puro di preparazione e adapter,prove sintetiche,poi anteprima o persistenza solo se verificate e circoscritte. Nessuna Gift pubblicata o owner membership creata dalla preparazione. Push del ramo e PRdraft;nessun merge/deploy automatico.

## Evidenze già esistenti

ADR-V5-04 in implementation-decisions.md distingue account/casa/pratica,prevede60giorni post-vendita per download/Gift e Gift accettata indipendente. È principio di prodotto,non prova d'implementazione. Sharing C1a è un flusso autenticato,revocabile e legato agli originali della Home:non diventa Gift copiando un'etichetta o aggiungendo un link senza account. Il nucleo Agenzie integrato dalla PR71ha fonti/versioni/privacy e dati proposti/confermati;la vera generazione incarico resta bloccata senza modello approvato.

## Contratto da completare

- Selezione esplicita di documenti ricevuti o prodotti,versioni/SHA,stato bozza/finale/sottoscritto,autore e fonte. Nessuna nota interna o documento privato altrui ereditato automaticamente.
- Casa/unità di destinazione e tutti gli intestatari selezionati espliciti;due destinatari non devono creare due case. Persona in un vecchio atto non equivale a destinatario attuale verificato.
- Dati/metodi/limiti mantengono provenienza:superficie stimata resta stimata,conferma non certificazione,documento generato non diventa firmato.
- Gift accettata indipendente;nuovi documenti del proprietario rimangono suoi secondo le regole Home,non accessibili implicitamente all'agenzia. Aggiornamenti espliciti e idempotenti non sovrascrivono aggiunte del cliente.
- Accesso iniziale senza account e presa in carico da distinguere;nessuna pubblicazione degli originali o bypass dei controlli correnti in questo incremento.

## Prossimo passo

Definire manifest/versioni e confine di autorizzazione prima del primo modulo puro. Test contro manipolazioni di scope,prove scadute o ritirate,duplicati,replay,bozze e perdita di qualifiche/stime. Poi valutare adapter verso Home/Documenti senza cambiare semanticamente C1a. Le scelte ancora aperte vanno motivate e registrate,non trasformate in implementazione presunta.

## Operatività

Collaudo utente occupa DB55439/API3119;non riusarlo o fermarlo per i test. Eventuale collaudoDBsolo cluster nuovo posseduto con runner protetto;secondario55440solo con profilo nominale strettamente registrato,se disponibile. Se manca un requisito continuare unitari/spec senza indebolire guardie. Nessuna lettura di originali personali,provider reale,spesa,email,segreto o install in junction. Cache e generated privati.

Proroga del collaudo fino23è attività separata:preparata ma richiede conferma che le modifiche siano salvate prima del riavvio. Non dedurla dal tempo trascorso. Stato nel manifest degli outputs della chat.

## Primo incremento verificato — preparazione interna

Implementato `agency-practices/gift-packet.ts`: selezione di originali autorizzati attraverso exportManifest, scope/revisione/versione/SHA, produttore ricevuto/agenzia, esclusione bozze e descrittori stretti. Più destinatari selezionati hanno una sola destinazione richiesta; identità e accesso Home non sono certificati né autorizzati dal pacchetto. Metodi/caveat delle superfici stimati conservati. Un'etichetta signed non verifica una firma. Fingerprint canonico ordinato per chiavi, indipendente dall'istante di preparazione, ma sensibile a destinazione/destinatari/provenienza/versioni.

Il risultato è solo `internal_preview`: canDeliver/createsHome/grantsAccess/confirmsFacts/certification=false. Non esiste una route che accetta i descrittori. Questi devono arrivare da un futuro registro/produttore server: la funzione valida forma e corrispondenza alla fonte,non attesta che un metadato dichiarato sia vero. Questo limite è esplicito nel codice e impedisce di presentare l'incremento come consegna o Gift accettata.

Verifiche eseguite:13/13mirati,671/671backend ordinari(compresi i13),zero falliti/saltati;build del runner e lint mirato verdi. Ordinamento multiplo,limiti,selezioni duplicate,ruoli,revoca,fonti private/versioni mutate,metadati contraffatti e perdita caveat controllati con fixture sintetiche. Nessun DB/API/UIcollegato o collaudo utente usato. Comandi e log locali in work/agency-gift-evidence-20261031della chat. Due comandi iniziali hanno usato il contesto directory sbagliato(uno per i percorsi,uno per lint);corretti senza modificare asserzioni,guardie o codice del prodotto esistente.

Prossimo incremento:registro/adapter dei metadati documentali server,distinguendo provenienza prodotta realmente da documento caricato e finalità di consegna. Poi preparazione dalla pratica senza descrittori provenienti dal client. Le scritture Home,la copia indipendente dopo accettazione e l'idempotenza durevole di consegna restano da progettare/implementare e testare;il digest deterministico non le sostituisce.

## Secondo incremento — registro di metadati, dominio offline

Implementato gift-registry.ts: storico append-only per fonte con metadataVersion, autore della registrazione, fingerprint canonico e ricevuta idempotente per attore. Versione/SHA della fonte e autorizzazioni edit/export sono ricontrollate anche sui replay. L'adapter prepareGiftFromRegistry risolve i descrittori dal registro, non dal DTO client; una fonte sostituita rende obsoleti i metadati precedenti e blocca la preparazione. La vista filtra prima le fonti private/ritirate, senza contatori o descrizioni storiche esposte. I documenti in bozza possono avere metadati, ma non entrare nel pacchetto.

È dominio puro serializzabile: nessun adapter DB, endpoint o producer connesso ancora. La ricevuta è durevole solo quando lo stato viene persistito; qui il round-trip JSON è verificato ma non equivale a un test DB. Il fingerprint rileva incoerenze accidentali e non è una firma crittografica: chi può riscrivere stato e digest può ricalcolarlo. recordedBy identifica il chiamante server autorizzato, non attesta autore materiale, sottoscrizione o veridicità delle dichiarazioni. Nessuna nuova fiducia attribuita a metadati inviati dal browser.

Verifiche mirate:27/27 (13pacchetto +14registro), build runner e lint dei due moduli/test verdi. Inclusi round-trip e riordino chiavi JSONB, history/CAS/replay, revoca e fonte modificata, assenza/bozze, manipolazione DTO e record. Nessun DB o collaudo utente toccato. Prossimo task: adapter transazionale interno in AgencyPracticesStore e test nominale su cluster nuovo secondario protetto; solo dopo valutare anteprima. Nessuna scrittura Home o Gift accettata implementata.

Regressione ordinaria dopo il registro:685/685verdi,zero falliti/saltati,runner offline senza DB;log backend-registry-regression.log. Il totale include i27casi Gift.

## Terzo incremento — persistenza interna verificata

AgencyPracticesStore ora espone tre porte interne: registerGiftMetadata, readGiftMetadata, prepareGiftPacket. I descrittori restano parametri del producer server, non campi di una route pubblica. Riusa context con lock su membership/grant e pratica, CAS revisione e transazione unica per snapshot/storico/ricevuta; controlla nuovamente edit/export prima del commit. Nessuna migrazione: attributi opzionali nel medesimo snapshotVersion1 già usato dal fascicolo. Vecchie pratiche senza registro danno metadati missing; non vengono migrate né dichiarate pronte.

Collaudo su cluster nuovo e posseduto dimora-offline-kJJ1aM,loopback55440:12/12test DB (11sottocasi +contenitore),zero falliti/saltati. Dati/sorgenti sintetici,round-trip reale PostgreSQL JSONB,seconda istanza store,replay concorrenti,conflitto fra comandi,CAS metadata/history,privacy admin/viewer,fonte sostituita/ritirata,revoca export e rollback. La preparazione non cambia snapshot né numero Home/grant. Cluster arrestato dal runner,stop-postgres.log confermato. Il conteggio non rappresenta un riavvio completo del processo/PostgreSQL:verifica una nuova istanza dello store e ricevuta persistita,non un test di crash recovery.

Nuovo profilo nominale test:agency-gift-db incluso nella suite DB completa. Runner secondario autorizza solo questo e il preesistente test:agency-http-db,con identici target rigidi,ownership token,URL e network guard. Una prova negativa rifiuta gli altri profili prima della creazione di un cluster. Nessun servizio/DB/collaudo utente è stato usato o fermato. Build e lint mirato verdi.

Comando: node backend-v5/test/offline-secondary.cjs --suite test:agency-gift-db --pg-bin <binari PostgreSQL locali> --scratch-root <work/agency-gift-db-20261031>. Log launcher in work/agency-gift-evidence-20261031/gift-db-1.log della chat. Esecuzione diretta dall'app ancora assente:nessun controller/route,niente trasferimento o copia di originali nella Home,consegna/accettazione indipendente e gestione degli intestatari ancora da collegare. Prossimo incremento:anteprima controllata sintetica sul contratto verificato e contratto della copia indipendente compatibile con ADR-V5-04;non chiamare sharing C1a Gift.

Prima regressione ordinaria:685/686,unico errore guardia per alias npm mancante del nuovo profilo. Corretto package.json con alias standard node test/offline.cjs --suite test:agency-gift-db;asserzione e protezioni invariate. Riesecuzione registrata separatamente.

Riesecuzione finale:686/686ordinari verdi,zero falliti/saltati;include nuova guardia nominale,nessuna protezione indebolita. Log backend-store-regression-2.log. Non ripetuto DBdopo solo aggiunta alias npm/documentazione/testguardia;12/12DBprecedenti restano riferiti al medesimo adapter.

## Quarto incremento — anteprima controllata e contratto Home

Aggiunti GiftPacketPreview e harness separato agency-gift-preview.html,solo fixture sintetiche sotto __preview__. Il componente riceve il pacchetto interno e scope/sessione/revisione dal chiamante:non è un client HTTP e non attribuisce autorità a un DTO arbitrario. Cambio agenzia/pratica/account/revisione,loading o diniego nascondono il pacchetto immediatamente. Il contenitore futuro dovrà ricontrollare permessi e azzerare i props su logout/revoca;nessuna gestione sessione autonoma inventata nel componente.

Mostra documenti ricevuti/prodotti,versioni/SHA,autori dichiarati,qualifiche/metodi/limiti delle superfici,destinatari selezionati e una sola destinazione. Signed non è firma verificata. Eventuale azione Rivedi originale restituisce solo il descrittore della fonte al chiamante;nel harness non apre byte reali. Non esistono pulsanti di invio/accettazione/export o link pubblici. Nessun collegamento alla navigazione reale,alla Home o alla demo Alessio.

Verifiche:19/19test componenti sintetici,frontend typecheck con buildinfo privata,lint della nuova cartella e build Vite del solo harness verdi. Cache/output privati in .agency-cache,nessuna installazione o scrittura intenzionale nella junction. Un primo comando test aveva un percorso config duplicato e non ha avviato test;corretto il comando,senza modificare le asserzioni. Il CSS ha regole per schermi stretti e overflow dei riferimenti,ma non è stato eseguito un nuovo collaudo browser a375px:non presentare questo come QA mobile completata. Non rieseguito backend/DBdopo sole aggiunte UI/documentazione:restano le verifiche dell'incremento precedente.

Il [contratto della copia indipendente](agency-gift-home-copy-contract-20261031.md) è proposta,non implementazione. Definisce separazione da C1a,una Home/più destinatari,assenza di accesso inverso Agency,versioni immutabili,staging/receipt e concorrenza. Prima di endpoint/copier vanno definiti autorità di presa in carico e visibilità senza account. Matrice di prove future e backlog sono esplicitamente non eseguiti. Prossimo lavoro indipendente possibile:dominio di congelamento/revisione della selezione o casi di trasferimento simulato,senza creare accessi reali o inventare un abbinamento identità.

## Quinto incremento — compatibilità del payload backend/anteprima

Aggiunte fixture sintetiche:input in fixtures/agency-gift/input-v1.json e pacchetto canonico in frontend-v5/tests/fixtures/agency-gift/packet-v1.json. Il backend riproduce esattamente il pacchetto dai dati di ingresso e confronta l'intero output;un test UI rende proprio quel JSON e il harness usa lo stesso file,anziché ricostruire una copia manuale. Controlla che stato Actor/registro/storage/credenziali non entrino nel payload. La fixture è esplicitamente sintetica,non un PDF o risultato AI reale;il cast nel harness è solo per quella fixture,non un parser HTTP.

Verifiche dopo questo incremento:28/28backend mirati,20/20UI,typecheck e lint mirati,build harness verdi. Nessun codice runtime backend modificato e nessun test DB/ordinario completo ripetuto:686/686ordinari e12/12DBrestano gli esiti storici del terzo incremento,non dichiarare687test ordinari eseguiti. Primo import fixture fuori dal root frontend è stato rifiutato da Vite:spostato il payload dentro tests/fixtures,senza estendere filesystem allowlist o disabilitare guardie. Lint ha segnalato un escape superfluo nella regex del test,corretto a pari significato. Nessun collaudo browser o trasferimento Home nuovo.

Prossimo:lavoro indipendente sulla revisione/congelamento della selezione o sulle minacce/casi di copia. Non creare endpoint di accettazione,link pubblici o nuovi grant finché identità e autorità della presa in carico non sono definite. Conservare il checkpoint e non ripetere suite già verdi senza modifiche.

## Sesto incremento — confini di rilascio e recupero

Aggiunto [modello delle minacce e piano di recupero](agency-gift-threats-and-recovery-20261031.md):distingue export interno da rilascio a destinatari,metadato finale da diritto di distribuzione e ricevuta di registro da ricevuta di copia.18casi di abuso con stato/evidenza,12punti di guasto da collaudare e6ticket ordinati con dipendenze/criteri d'uscita. Identità/autorità/visibilità senza account restano decisioni aperte;raccomandazioni non attivate.

Solo specifica/documentazione,nessun comportamento nuovo o test eseguito per la copia. Nessuna suite verde ripetuta per documentazione;controllati link locali/diff. Non confondere i casi futuri con i28backend/20UIeseguiti sul pacchetto interno. Prossimo indipendente:review dei punti del registro e del contenitore ancora non coperti o lettura critica del contratto;non sviluppare una presa in carico arbitraria mentre manca la decisione di autorità.
