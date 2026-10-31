# Gift v1 — invito personale, primo incremento di dominio

31 ottobre2026. Piano autorizzato:invito → persistenza → copia Home → beneficio annuale opzionale → UI. Primo modulo puro implementato;nessuna route,link inviato,Home o servizio premium creati. Il [contratto prodotto](agency-gift-home-copy-contract-20261031.md) a singolo account resta vincolante.

## Implementato

- createGiftInvitation ricalcola il pacchetto da fonti/metadata correnti tramite prepareGiftFromRegistry e richiede dichiarazione esplicita di stipula completata e rilascio approvato. Non è una verifica notarile o certificazione dei documenti.
- Segreto server da32byte casuali,base64url;nel record entra solo SHA-256. La funzione restituisce un candidato interno con canSend/canAccept/createsHome/activatesBenefit=false. Il segreto deve restare nel processo chiamante fino a una futura persistenza riuscita:nessun link viene generato o restituito da un endpoint attuale.
- Manifesto sigillato con digest canonico,compatibile con riordino JSONB;destinatario singolo/email normalizzata,destinazione,fonte/versioni e scelta del beneficio vincolati. Digest non è una firma né protezione da chi può riscrivere record e hash.
- sourceFingerprint esclude la revisione generale della pratica e preparedAt,così la futura scrittura dell'invito non rende obsoleti i propri documenti;incluse fonti,versioni,metadata,destinazione e destinatario. Il resolver server dovrà ricostruirlo con autorizzazione corrente.
- Scadenza server obbligatoria,maggiore del momento corrente e al massimo30giorni nel dominio. La durata predefinita del trasporto resta da fissare;token errato/scaduto/revocato non restituisce dati.
- Landing anonima minima:solo id,requiresAccount e canAccept=false,senza documenti,email,claimant o riferimento Home.
- claim associa soltanto l'account autenticato con email verificata corrispondente. Il contesto account e la prova di fonte corrente sono PORTE INTERNE SERVER,non campi accettabili in un DTO HTTP. Associazione claimed distinta da accettazione/copia. Replay dello stesso account conserva versione/data;altro account rifiutato anche con la stessa email.
- Revoca richiede permesso export corrente sulla pratica;versione attesa e replay protetti. Non revoca documenti Home accettati:non esiste ancora quella copia.
- Beneficio richiesto senza offerta server disponibile:rifiuto benefit_unavailable,mai downgrade silenzioso. Offerta sintetica nei test può essere congelata come activated=false;nessuna data di attivazione,feature premium o addebito reali.

## Confini da completare

Registro e ricevute della CREAZIONE invito non ancora persistiti. creationKey è conservata,ma questo modulo puro non implementa idempotenza durevole o recupero del link dopo risposta persa. Serviranno ledger,lock e gestione esplicita della riemissione/rotazione;non conservare il segreto in chiaro per semplificare il replay.

Nessun abbinamento a dati auto-dichiarati del browser:il futuro adapter auth deve leggere Account/emailVerifiedAt corrente,il resolver fonti deve ricontrollare permessi/versioni e il controller deve applicare sessione/Origin/CSRF. Nuovi campi server devono restare fuori dal DTO. Una validazione di email o il link non provano da soli proprietà della casa.

L'invito non crea membership né trasferisce originali. Prima di accettazione reale:staging e copia indipendente byte/SHA,ledger,ricevuta e transazione Home,con test di concorrenza/guasti. C1a non è il copier. Beneficio annuale disattivato finché manca catalogo/offerta validata e policy per account già premium.

## Prove

16nuovi casi sintetici,47/47mirati totali (31precedenti+16),build e lint verdi. Coprono token/privacy,fonte corrente,manifesto/email/beneficio alterati,scadenza,revoca,account non verificato o diverso,replay e versioni. Nessun DB usato per questo incremento;la precedente suite14DBriguarda pacchetto/registro metadata,non questi inviti. Nessuna prova browser o end-to-end nuova.

Prossimo task:persistenza degli inviti e prova di creazione/claim/revoca su nuovo cluster posseduto,senza accesso a servizi esistenti. Modulo corrente agency-practices/gift-invitations.ts;test agency-gift-invitations.test.cjs incluso nel runner offline standard.

Regressione ordinaria dopo integrazione nel runner:706/706verdi,zero falliti/saltati (include47Giftmirati).Log gift-invitations-regression.log. Primo tentativo build ha richiesto dichiarazione funzione never per il narrowing TypeScript;lint regex controlli corretto con charCodeAt,senza indebolire le verifiche.
