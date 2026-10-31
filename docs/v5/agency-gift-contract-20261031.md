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
