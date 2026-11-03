# Gift v1 — dall'agenzia all'account del proprietario

Decisione di prodotto confermata da Vincenzo il 31 ottobre 2026. Questo è il contratto della prima versione;invito,accettazione,copia Home e piano annuale non sono ancora implementati. Supera le precedenti ipotesi multi-destinatario di questo lotto. ADR-V5-04 resta valido:la Gift accettata è indipendente dagli accessi dell'agenzia.

## Percorso concordato

1. Dopo la stipula,l'agente seleziona i documenti finali ricevuti o prodotti dall'agenzia da lasciare al cliente. Conferma il destinatario e sceglie se includere un anno del piano a pagamento.
2. Dimora prepara un link personale per un solo destinatario. L'agente lo condivide con il nuovo proprietario;non sono previsti inviti automatici ad altri intestatari.
3. Il cliente apre il link e completa la registrazione oppure accede al proprio account esistente. Il link accompagna il percorso,non crea un account speciale separato da Dimora.
4. Il cliente accetta la Gift. La propria casa compare dentro Dimora con i documenti selezionati dall'agenzia,le versioni e la provenienza. Una persona letta nell'atto storico non viene identificata automaticamente come destinatario.
5. Il cliente usa Dimora come un normale utente e può scaricare l'app e aggiungere contenuti alla casa. Queste aggiunte non diventano visibili all'agenzia.
6. Se l'agenzia ha incluso il beneficio,il piano a pagamento dura un anno dall'accettazione. Casa e documenti restano all'utente alla scadenza;le funzionalità disponibili dipendono dal piano allora attivo.

Prima versione:un invito,un account destinatario,una casa di destinazione. L'array recipients del pacchetto tecnico resta per compatibilità interna,ma deve contenere esattamente un elemento. Non contiene ancora un account verificato. Multiutenza,cointestatari,inviti aggiuntivi e ripartizione dei permessi restano fuori scope.

## Invito e presa in carico — requisiti per il prossimo incremento

La stipula completata è un passaggio dichiarato dall'agente nel prodotto,non una verifica notarile automatica. Non inviare Gift alla sola accettazione di una proposta. Il manifesto congela documenti/versioni/SHA,destinatario,destinazione e scelta del beneficio prima dell'invito. Una modifica richiede revisione esplicita;nessuna sostituzione silenziosa di byte o destinatario.

Il link personale dovrà avere un segreto casuale,hash persistito,scadenza,revoca e abbinamento all'account autenticato. Il link non è di per sé una sessione né una prova di proprietà. La pagina iniziale può presentare il mittente e il percorso di registrazione;accesso ai documenti e presa in carico richiedono associazione e autorizzazione server. I dati esatti da esporre prima del login,scadenza del link e verifica del destinatario sono dettagli tecnici da definire nel contratto HTTP.

Account già esistente:accesso allo stesso account,nessun duplicato. Account errato in sessione:consentire cambio account prima dell'accettazione,senza associare automaticamente la casa. Invito scaduto/revocato:nessuna nuova copia o beneficio. Due richieste simultanee o retry della stessa accettazione devono produrre la medesima Home/documenti/ricevuta,non duplicati. Le copie accettate mantengono l'indipendenza prevista da ADR-V5-04.

## Beneficio annuale opzionale — accesso completo

Vincenzo ha confermato che per la prima versione l'anno offerto abilita tutte le funzionalità Dimora dell'account proprietario. Non serve definire prima eventuali limitazioni del piano free. Il controllo dell'agenzia resta un solo flag:

- Flag spento:consegna della casa/documenti senza aggiungere il beneficio annuale. Un eventuale piano già posseduto dal cliente non viene modificato.
- Flag acceso:un anno di accesso completo incluso nella Gift,con decorrenza dall'accettazione. Scelta congelata nel manifesto,non aggiungibile dal browser del destinatario.

L'offerta interna è dimora-full-access-v1,versione1:12mesi di accesso completo,da attivare soltanto quando la Gift è accettata. L'invito e il claim conservano activated=false. Il retry non riavvia l'anno e non genera un secondo diritto. Il server registra account beneficiario,origine Gift/agenzia,offerta/versione,inizio/scadenza e ricevuta.

Alla scadenza casa e documenti restano all'utente;le funzionalità seguiranno le regole allora definite. Eventuali limiti del free si decideranno successivamente senza cambiare il significato del flag o applicare una riduzione anticipata all'anno incluso.

Costo per l'agenzia,rinnovo,regole per un account già abbonato e calcolo di calendario della scadenza restano da definire prima del relativo modulo commerciale. Non bloccano la registrazione della scelta full-access nell'invito e non autorizzano pagamenti o proroghe automatiche di un piano esistente. Non si attiva alcun servizio a pagamento durante lo sviluppo.

## Documenti e continuità

Solo documenti esplicitamente selezionati e rilasciabili,anche prodotti dall'agenzia. Conservare fonte/versione/SHA,autore e origine dichiarati,qualifica/metodo/caveat delle superfici. Finale o agency_generated non equivalgono ad autorizzazione al rilascio. Una scheda non può aggirare l'esclusione di una fonte ricopiandone dati.

La copia deve avere byte/riferimenti Home indipendenti dall'archivio Agency,con verifica hash/lunghezza e ricevuta. Non trasferire l'intero snapshot,ledger AI,note interne o grant della pratica. Non confermare dati Home automaticamente o sovrascrivere quelli già aggiunti dal proprietario. La qualifica stima resta stima;un'etichetta signed non verifica una firma. Sharing C1a non è il veicolo della Gift indipendente.

## Criteri di accettazione futuri (non eseguiti)

| Caso | Esito richiesto |
| --- | --- |
| Nuovo cliente dal link | Registra account normale,accetta,vede una casa con documenti scelti |
| Cliente già registrato | Accede al suo account,nessun account duplicato |
| Secondo destinatario nel comando v1 | Rifiuto esplicito,non selezione silenziosa del primo |
| Gift senza piano annuale | Casa/documenti consegnati,nessun diritto premium creato |
| Gift con piano annuale | Un diritto per l'account,decorrenza dall'accettazione |
| Retry o doppio clic | Stessi ID e date,nessuna seconda casa o proroga del beneficio |
| Account errato/invito revocato | Nessuna adozione o beneficio |
| Fonte cambiata prima dell'accettazione | Blocco e revisione esplicita del manifesto |
| Fine anno o perdita accesso Agency | Casa/documenti conservati;features secondo piano attivo |
| Cliente aggiunge una fattura | Nessun accesso Agency implicito o sovrascrittura da Gift |
| Piano a pagamento già presente | Applicare policy ancora da decidere,mai sovrascriverlo automaticamente |

Stato corrente e verifiche nel [report del lotto](agency-gift-contract-20261031.md). I test già esistenti del pacchetto/registro non provano invito,copia,registrazione o beneficio annuale reali.
