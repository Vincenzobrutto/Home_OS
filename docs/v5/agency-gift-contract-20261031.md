# Agency → Gift → Home — incremento31ottobre2026

## Quadro corrente per la revisione — Gift v1 a singolo account

Ramo dedicato `codex/agency-gift-contract-20261031`, PR draft72 verso la base comune cbddcf0;nessun merge o deploy. Implementati pacchetto interno,registro metadati,adapter transazionale e anteprima controllata isolata. Ultima correzione runtime:8fbc976,replay legato al record originario. Export sintetico autosufficiente riproducibile con gli script del frontend;non collegato all'app e non sostituisce il collaudo planimetrie scaduto.

Verificato:742/742ordinari backend (83Gift),39/39DBsu nuovo cluster arrestato,1773/1773frontend(174file);build/lint e typecheck mirati verdi. Export controllato in DOM sintetico senza rete. Non verificato:nuovo browser/375px,file://reale,crash recovery o trasferimento Home. Revisioni e controlli descritti sono self-review dell'autore,non audit indipendente.

Non disponibile:producer documentale collegato,route Gift,consegna,presa in carico,copia indipendente Home,nuovi accessi o aggiornatore documenti del proprietario. Nessun modello incarico approvato. Le funzioni interne non certificano identità,fonte/firma,conformità o completezza e non consentono invio. Non basta porre canDeliver=true.

Per proseguire:validare [copia e autorità](agency-gift-home-copy-contract-20261031.md),[minacce/recupero e ticket](agency-gift-threats-and-recovery-20261031.md),[selezione documenti proposta](agency-gift-document-policy-proposal-20261031.md). Nessuna di queste proposte è stata confermata da un'agenzia reale. L'aggiunta dei documenti del proprietario senza accesso Agency implicito è requisito fondamentale da provare quando la copia sarà realizzata,non un nuovo test end-to-end già eseguito.

La cronologia seguente conserva i conteggi storici per incremento;il quadro sopra è il riferimento corrente. Non sommare le suite mirate ai totali ordinari che già le includono,e tenere distinti i sottocasi DBdai loro contenitori.

## Decisione successiva confermata dal committente — Gift v1

Il [contratto corrente](agency-gift-home-copy-contract-20261031.md) è ora approvato come percorso prodotto:un solo account destinatario;dopo stipula l'agente sceglie documenti ed eventuale anno a pagamento,condivide link personale;cliente si registra/accede e accetta;la casa con i documenti diventa parte del normale account Dimora.L'anno opzionale decorre dall'accettazione;alla scadenza documenti/casa restano.Multiutenza e più intestatari rimandati,superando le ipotesi precedenti nella cronologia.

Implementato in questo aggiornamento:guard backend e anteprima per esattamente un destinatario,fixture canonica/HTMLoffline allineati,contratto/ADR/backlog aggiornati.Invito,registrazione dal link,copia Home,beneficio/pagamenti NON implementati.Costo,features avanzate,rinnovo e piano già esistente restano da definire,non si attiva nessun servizio reale.

Verifiche:690/690ordinari backend (inclusi31Giftmirati),14/14DB(13sottocasi+contenitore) su NUOVO cluster IY0FXt,arrestato e stoplog verificato;21/21UI,typecheck/lint/buildharness verdi.Log gift-v1-regression.log,gift-v1-db.log,gift-v1-ui.log,gift-v1-build.log.Una seconda persona è rifiutata e non viene ignorata silenziosamente.Nessun browser/mobile nuovo.

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

## Settimo incremento — ricevuta di replay legata al record

La revisione ha individuato un caso di stato persistito incoerente:il dominio restituiva replay=true per una ricevuta con digest corretto anche quando mancava il relativo record metadati. Non era una consegna Gift,ma un falso successo di registrazione. Riprodotto con test rosso prima della correzione.

Ora il replay verifica schema della ricevuta,unicità account/key,record presente e unico,versione/revisione coerenti,attore e descrittore canonico uguali alla registrazione originaria. La ricevuta non può avanzare oltre la revisione della pratica. Un replay legittimo della versione1dopo una successiva versione2rimane valido e non ripristina i vecchi metadati. Nessuna nuova autorità,route o certificazione:il digest resta non firmato e non difende da chi può riscrivere record e hash insieme.

Aggiunti casi per ricevuta orfana/duplicata/malformata e replay storico. La prova DBsimula incoerenza solo nel cluster sintetico posseduto,rifiuta il falso successo e verifica stesso receipt/IDdopo ripristino dello snapshot originale. Non è un test di crash di processo o copier Home. Il primo build della correzione ha rilevato un nome funzione in conflitto con una variabile locale;rinominato il parser,senza cambiare guardie o asserzioni.

Verifiche finali dopo correzione:30/30mirati,689/689backend ordinari,13/13DB(12sottocasi+contenitore) su nuovo cluster posseduto dimora-offline-L2EI74,arrestato e verificato stop-postgres.log. Build/lint verdi,zero falliti/saltati. Log gift-receipt-green-2.log,backend-receipt-regression.log,gift-receipt-db.log. UI20/20e buildharness restano le precedenti verifiche,non ripetute perché payload e codice frontend invariati.

## Ottavo incremento — export sintetico locale senza server

Aggiunti config Vite dedicata scripts/agency-gift-preview.config.ts e script scripts/export-agency-gift-preview.mjs nel frontend. Compilano/esportano solo agency-gift-preview.html e la fixture sintetica già verificata,non l'app o la demo Alessio. Cache/output fissi privati .agency-cache,nessuna installazione. Lo script incorpora JS/CSS del build,nega risorse residue e produce gift-preview-standalone.html. CSP locale include connect-src none;nessuna API,link pubblico,server o credenziale creati. envDir del build punta alla cache privata,non al file ambiente dell'app.

Comandi dalla cartella frontend-v5:node node_modules/vite/bin/vite.js build --config scripts/agency-gift-preview.config.ts --configLoader runner;poi node scripts/export-agency-gift-preview.mjs. Build non svuota output arbitrari:cartelle cache/output derivate dal checkout,symlink/junction rifiutati prima del build. Export legge solo file dentro il build verificato.

Verifiche eseguite:build harness,frontend node-typecheck e lint script/config verdi. Smoke manuale del bundle in DOM sintetico con rete negata:render,accesso negato e revisione superata corretti. Non è un collaudo browser reale,file://o375px;non dichiararlo. Un file HTML autosufficiente è stato copiato negli outputs della chat per ispezione locale,con SHA nel log gift-standalone-export.json. Non sostituisce o proroga il collaudo planimetrie scaduto. Non ripetuti backend/DB/UIgià verdi perché codice runtime/payload invariati.

## Nono incremento — selezione documentale per la casa

Aggiunta [proposta di policy documenti](agency-gift-document-policy-proposal-20261031.md):17tipi con origine,suggerimento di revisione e controllo concreto,distinguendo documenti casa,negoziali e interni. Include documenti prodotti dall'agenzia,prospetti/schede con fonti,documenti tecnici e caso successione/difformità. Nessun nuovo enum/default/automatismo o modello contrattuale attivato.

Gap esplicitato:una scheda prodotta dall'agenzia non deve aggirare l'esclusione di una fonte copiandone indirettamente i dati. Dipendenze/ambito di rilascio devono essere definiti nella futura policy producer/GIFT-01,non dedotti dal solo flag agency_generated o dalla conferma di un dato. Valore nella scheda Home e documento ricevuto restano adozioni distinte,senza sovrascritture del proprietario.

Cinque domande pratiche pronte per l'agenzia;risposte ancora da raccogliere,non confermate. Solo documentazione:link/diffcontrollati,nessuna suite o collaudo nuovo necessario. Prossimo consolidare consegna/decisioni aperte e rivedere i contratti senza introdurre nuove funzioni non definite.

## Avvio implementazione autorizzata inviti

Primo [dominio inviti](agency-gift-invitations-v1-20261031.md) implementato:47mirati/706ordinari,build/lint verdi. Candidato interno e claim senza Home/beneficio,persistenza e route ancora assenti. Il piano operativo corrente è negli outputs della chat,Dimora-Gift-v1-piano-implementazione-20261031.txt. Prossimo:registro inviti durevole e adapter auth/fonti con testDBnuovi.

## Ledger inviti persistente

Completato il secondo incremento:modello/migrazione Gift dedicati,create/landing/claim/revoke interni,identità DB,edit+export sulle mutazioni e source currentness;47mirati/706ordinari/33DBverdi.Nessuna APIo copia.[Report](agency-gift-invitation-persistence-20261031.md).

## Decisione full-access annuale

Flag dell'agenzia true:offerta dimora-full-access-v1/versione1,un anno con tutte le funzioni Dimora dell'account proprietario dall'accettazione;false:nessun nuovo beneficio,documenti/casa comunque consegnabili.La futura definizione del free non blocca Gift o flag.Questo aggiornamento supera le note storiche sul catalogo/offerta non disponibile.Il ledger registra la promessa;claim non la attiva e copier/entitlement restano da collegare.Non estende permessi su dati/ruoli altrui né attiva invii o pagamenti automaticamente.

## Prerequisiti copier verificati

Conferma esplicita nome/indirizzo,ammissione del nuovo originale con scan/readback e provenienza Gift Document/client implementati.Purge cancella la provenienza e gli errori non espongono dettagli privati.742backend/39DB/1773frontend e build app verdi;nessun copier/receipt/entitlement o API dal link ancora collegati.Vincenzo autorizza proseguire oltre le23.[Report](agency-gift-copy-prerequisites-20261031.md).