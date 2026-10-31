# Gift → Home: confini, rischi e piano di collaudo

31 ottobre2026. Proposta tecnica del lotto serale. Nessun endpoint o copier viene attivato da questo documento. Stato implementato/verificato nel [report](agency-gift-contract-20261031.md); continuità prevista nel [contratto](agency-gift-home-copy-contract-20261031.md).

## Confini di fiducia da mantenere distinti

- Il browser seleziona riferimenti; non certifica produttore, sottoscrizione, destinatario o diritti sulla casa.
- Il producer server registra metadati attribuiti; la registrazione non prova che il contenuto sia vero o distribuibile.
- L'autorizzazione export della pratica abilita l'esportazione interna corrente. Non equivale da sola a un'autorizzazione di rilascio a terzi o pubblicazione senza account.
- Il manifesto approvato congela versioni e scelte. Non concede accesso a una Home né accerta l'intestatario.
- La futura ricevuta di accettazione deve vincolare copia e autorità proprie. Non è la ricevuta corrente di registrazione metadati.
- Il proprietario aggiunge alla Home: queste nuove informazioni non ereditano grant Agency. Gli accessi C1a eventualmente esistenti restano un flusso distinto.

Essere finale non basta a essere consegnabile. Il pacchetto attuale esclude bozze e mantiene canDeliver=false proprio perché rilascio, identità, destinazione e copia non sono stati autorizzati/implementati. Non eliminare questo blocco solo perché tutti i metadati sono current.

## Matrice abusi e controlli

| Caso | Controllo | Stato/evidenza |
| --- | --- | --- |
| Agente sostituisce agencyId/practiceId | Scope fonte e grant corrente sul server | Implementato;test packet/registry/DB |
| Admin assegnato cerca originali privati altrui | sourceReadable,nessun privilegio implicito admin | Implementato;vista e preparazione filtrate,test DB |
| Export revocato dopo registrazione | Riautorizzare anche il replay | Implementato;test DBrevoca export |
| Versione originale mutata | SHA/versione corrente,metadata stale | Implementato;test sostituzione |
| Due comandi scrivono la stessa revisione | Lock e CAS,receipt per attore | Implementato;test DBconcorrenti |
| Client scrive origin/signed nel DTO | Descrittori fuori dal comando di selezione | Implementato nel dominio interno;nessuna route |
| UI mostra dati vecchi dopo cambio account | Scope/account/revisione/accesso del contenitore | Test componente;sessione/rete reale NON collegate |
| Link inoltrato a persona diversa | Credenziale e abbinamento per destinatario,esposizione minima | Da definire/implementare |
| Nome/email nell'atto scambiati per identità | Nessun abbinamento automatico storico→attuale | Vincolo;presa in carico da definire |
| Agente usa export per distribuire dati non rilasciati | Approvazione esplicita dei documenti e ambito destinatari | Requisito futuro;canDeliverfalseoggi |
| Accettazione con altro homeId nel body | Destinazione congelata e autorità verificata sul server | Da implementare |
| Due intestatari creano due case | Un deliveryId/una destinazione,associazioni separate | Contratto proposto;nessun Home writer oggi |
| Nuovo caricamento owner visibile all'agenzia | Nessun grant inverso né copia nella pratica | Requisito futuro;non testato end-to-end |
| Revoca/cancellazione Agency rompe una copia accettata | Storage e riferimenti Home indipendenti | Da implementare e testare |
| SHA uguale usato per fondere proprietà | Provenienza/ID/versioni distinti,dedup fisica non autorizzazione | Requisito futuro |
| Firma/stima promosse a certezza | Qualifica e caveat persistenti,nessuna certificazione implicita | Packet/UIverificati;copier futuro da provare |
| Retry incerto duplica documenti o invita due volte | Ledger di consegna distinto,ricevuta/recupero | Da implementare;nessun invito reale oggi |
| Titolo fonte diventa HTML eseguibile | Rendering testuale React,nessun HTML da documento | Test UI;nessun contenuto eseguibile introdotto |

## Gate proposti prima di qualunque rilascio

Questi gate non sono nuovi endpoint né codici errore implementati. Servono a evitare che una schermata sembri pronta perché il pacchetto è stato preparato.

1. Selezione corrente e interamente autorizzata: nessun risultato parziale se una fonte non è esportabile.
2. Metadati correnti,documenti finali,ambito di rilascio esplicitamente approvato per quella versione/destinatari. Bozza/signed sono attributi distinti dai diritti di rilascio.
3. Destinazione unica congelata e autorità sulla Home verificata;nessuna scelta libera del client all'accettazione.
4. Destinatario abbinato individualmente senza rivelare altri destinatari o documenti non rilasciati.
5. Bytes e ricevuta indipendente disponibili;fallimento o esito incerto non produce successo UI.
6. Nuova lettura autorizzata per ciascuna operazione;la preview non è una capability riutilizzabile.

Il proprietario non deve vedere dettagli di errori sulle fonti private escluse. Risposta negata e conteggi non devono permettere enumerazione. I dati mostrati dal componente attuale sono già filtrati dal chiamante server:non sostituire quel confine con controlli esclusivamente client.

## Recupero da guasti — prove ancora da eseguire

| Punto di interruzione | Invariante richiesta | Prova futura |
| --- | --- | --- |
| Prima della copia byte | Nessuna Home/documento/receipt creati | Errore storage prima della prima write |
| Dopo un oggetto in staging | Staging non leggibile dal proprietario | Interrompere prima della verifica SHA |
| SHA/lunghezza diversi | Nessuna adozione di byte diversi dal manifesto | Alterare fixture byte mantenendo selezione |
| Dopo staging,prima del commit | Nessun successo pubblicato | Errore transazione,riavvio worker |
| Dopo commit,prima della risposta | Stessi ID recuperati dal ledger | Timeout client e replay identico |
| Due accettazioni simultanee | Una sola copia per item/target | Promise concorrenti e verifica DB/storage |
| Nuova versione durante copia | La copia non cambia fonte in corsa | Barriera test fra lettura e commit |
| Revoca prima del commit | Nessuna nuova adozione non autorizzata | Barriera e revoca concorrente |
| Revoca dopo copia accettata | Copia Home indipendente resta leggibile | Ritirare fonte Agency,leggere da owner |
| Cleanup concorrente | Non eliminare oggetti referenziati | Lock/barriera su reference e cleanup |
| Worker riparte dopo esito incerto | Recupero ledger,nessun nuovo invito | Arresto processo e nuova istanza |
| Owner modifica la sua scheda | Nuova versione Gift non sovrascrive | Aggiunta owner,poi update esplicito Gift |

Ogni prova DB richiederà un nuovo cluster posseduto,token e arresto verificato. Non riusare il collaudo utente,non inviare email/provider reali. I test attuali JSONB/CASnon sono una prova di questi guasti o dell'indipendenza dei byte.

## Ticket implementabili e condizioni di uscita

| Ticket | Dipende da | Risultato verificabile prima di considerarlo fatto |
| --- | --- | --- |
| GIFT-01:presa in carico e rilascio | Scelta prodotto su autorità e anteprima senza account | DTO,minacce e matrice di ciò che ogni ruolo può vedere;nessun percorso implicito da nome/email |
| GIFT-02:ledger consegne/destinatari | GIFT-01 | Schema/versioni/CAS/idempotenza;una destinazione;test concorrenza su cluster nuovo |
| GIFT-03:copier indipendente | GIFT-01/02 e storage Home esistente | Byte verificati,staging,receipt,recupero guasti;assenza di grant inversi;prove tabella sopra |
| GIFT-04:trasporto HTTP | GIFT-02/03 | Sessione,Origin/CSRF,autorizzazioni,scadenze,limiti e sanitizzazione;nessun fallback mock |
| GIFT-05:collegamento UI | GIFT-04 | Revisione agenzia,presa in carico owner,multi-account e375pxsu dati sintetici |
| GIFT-06:continuità e policy | GIFT-03/05 e policy validate | Aggiunte owner indipendenti,update non distruttivi,retention/rettifica esplicite |

Le colonne dipendenze impediscono di chiamare implementata la Gift soltanto aggiungendo un link al componente. Questo piano non stima tempi di consegna né abilita servizi o pubblicazioni.

## Decisioni da riportare a Vincenzo

- Anteprima senza account: proporrei una vista minima di presentazione e contenuti esplicitamente rilasciati;download originali e presa in carico richiedono abbinamento. Occorre decidere i dati visibili,non solo scegliere un link.
- Autorità sulla Home: proporrei di separarla dalla conferma dell'agente e dall'identità di login. Va definito come verificare l'associazione dell'acquirente alla casa senza usare automaticamente l'atto storico.
- Più intestatari: proporrei una destinazione condivisa e credenziali/accettazioni individuali;nessuna rivelazione automatica di dati personali dell'altro destinatario e nessuna seconda casa.

Sono raccomandazioni per la prossima decisione,non impostazioni attivate. Si può proseguire su revisione interna,contratti e prove delle parti già autorizzate senza dedurre una risposta dall'assenza dell'utente.
