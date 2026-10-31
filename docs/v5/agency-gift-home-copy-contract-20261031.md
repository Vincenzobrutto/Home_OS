# Agency → Gift → Home: copia indipendente e continuità

31 ottobre2026. **Proposta tecnica da implementare e validare**, non comportamento disponibile. Integra ADR-V5-04 senza riscriverlo. Registro/pacchetto/adapter interni già verificati sono descritti nel report agency-gift-contract-20261031.md; questo documento non abilita consegne o accessi.

## Identità e autorità

Una pratica non è una Home. Una persona presente in un atto storico non è un acquirente attuale verificato. requestedHomeId e subjectRef del pacchetto interno sono riferimenti selezionati, non prove di identità né autorizzazioni. Prima di qualsiasi copia servono un abbinamento esplicito alla casa e un'autorità valida a prenderla in carico. Il mediatore non può concedersi accesso permanente alla Home.

Un solo deliveryId congela una sola destinazione Home per tutti gli intestatari selezionati. Ogni destinatario ha una propria associazione, credenziale e ricevuta;nessuna seconda casa generata dall'accettazione del secondo. Cambiare destinatari o destinazione prima della consegna richiede una nuova revisione approvata, non la mutazione silenziosa di quella accettata. Correzioni dopo accettazione devono essere operazioni esplicite e auditate.

L'indipendenza della Gift accettata è già requisito ADR-V5-04. La nuova autorità sulla Home deve provenire dal relativo contratto di presa in carico, non da grant Agency riutilizzati. Sharing C1a è revocabile e legato agli originali: non è il veicolo della copia indipendente e non va modificato per farlo sembrare tale.

## Cosa trasferire

Solo documenti selezionati e finali, ricevuti o prodotti dall'agenzia. Conservare origine dichiarata, autore dichiarato, riferimento/versione/SHA del documento, metadataVersion, relazione con pratica e metodo/qualifica/caveat delle superfici. Non trasferire intero snapshot della pratica, ledger AI, registri di accesso, note interne, documenti esclusi o fonti private altrui. Le righe di dati estratti non diventano valori Home canonici automaticamente.

La copia mantiene la qualifica della fonte: signed resta sottoscritto dichiarato se nessun verificatore è stato eseguito; stima A4 resta stima. Le misure nette/catastali/commerciali non si fondono. Una futura scheda proprietario può indicare la provenienza e cosa manca senza dichiarare conformità o completezza. Le annotazioni del cliente non sovrascrivono la fonte ricevuta.

## Confine dell'accettazione

Proposta di flusso, ancora non implementata:

1. Preparazione interna da snapshot corrente autorizzato, revisione esplicita dell'agente.
2. Congelamento del manifesto approvato e della destinazione autorizzata. Nuove fonti o versioni non entrano nella stessa consegna automaticamente.
3. Credenziali individuali per destinatario. L'eventuale anteprima senza account deve mostrare solo ciò che è esplicitamente rilasciato a quel destinatario e non concedere accesso agli originali Agency o agli altri intestatari. Non basta un URL pubblico o un nome/email per dimostrare identità.
4. Presa in carico autenticata/abbinata e ricevuta della copia nella stessa Home. Il completamento del primo destinatario non crea accessi per gli altri senza la loro associazione verificata.
5. Accesso ai documenti accettati dalla Home indipendente dagli originali Agency. Le aggiunte successive del proprietario seguono i permessi Home; nessun grant inverso all'agenzia.

Da decidere prima di un endpoint: dati precisi visibili senza account, meccanismo di abbinamento, chi può autorizzare l'associazione della casa e quando il secondo intestatario accede ai documenti già copiati. Non inventare ora credenziali o membership di prodotto. Si può continuare su contratto, dominio e anteprima senza risolvere questi punti per supposizione.

## Durevolezza e concorrenza

Il fingerprint corrente è un digest di coerenza, non una firma. La ricevuta del registro riguarda i metadati, non la consegna. Una futura ricevuta di copia deve vincolare deliveryId/revisione, manifesto approvato, Home e destinatario/attore autorizzato. Un replay identico restituisce gli stessi ID; stesso idempotency key con corpo diverso confligge. Concorrenza fra due accettazioni non duplica casa o documenti.

I byte vanno copiati in un ambito Home indipendente, con SHA e lunghezza verificati;un alias che dipende dai permessi o dalla retention Agency non soddisfa l'indipendenza. L'eventuale deduplicazione fisica è un dettaglio storage: non deve unire proprietà, autorizzazioni o cancellazioni dei due fascicoli. I documenti Home hanno ID propri e relazione immutabile alla provenienza;gli originali della pratica non vengono spostati o cancellati.

Servirà una sequenza recuperabile di staging byte, verifica, transazione Home/ledger e pubblicazione della copia: nessun successo dichiarato se mancano byte o ricevuta. Crash prima/dopo commit devono essere distinguibili e riprendibili senza un nuovo invio. Non si elimina un oggetto se non è provato non referenziato. Nuove copie richiedono autorizzazione corrente della fonte;quelle già accettate non diventano dipendenti da una futura revoca Agency.

Se cambiano fonte/versione/permessi prima dell'accettazione, bloccare la vecchia consegna e richiedere revisione;mai sostituire byte sotto un manifesto congelato. Se cambia l'originale dopo l'accettazione, la Home conserva la versione ricevuta: una nuova versione è un aggiornamento separato, non una sovrascrittura del cliente. Eventuali diritti di cancellazione/rettifica vanno trattati con un percorso dedicato e policy validate, non simulati come una revoca tecnica universale.

## Prove future richieste (non eseguite)

| Caso | Esito richiesto |
| --- | --- |
| Due intestatari accettano in parallelo | Una Home,una copia logica per item,associazioni individuali |
| Revoca permessi Agency prima di copia | Nessun nuovo accesso o documento copiato |
| Revoca Agency dopo copia accettata | Home mantiene i documenti accettati secondo ADR |
| Fonte nuova dopo Gift | Nuova versione proposta;vecchia ricevuta e dati proprietario intatti |
| Cliente aggiunge fattura o annotazione | Nessuna visibilità Agency implicita |
| Retry dopo timeout incerto | Recupero ricevuta,non seconda copia |
| Byte copiati ma commit fallito | Staging non esposto,recupero/cleanup con prove |
| Commit riuscito ma risposta persa | Stessi ID restituiti al replay |
| Vecchio proprietario in atto storico | Nessun invito o membership derivati automaticamente |
| Stima superficie nella scheda | Metodo,qualifica,caveat mantenuti;nessuna promozione a verificata |
| Documento firmato dichiarato | Nessuna indicazione di firma verificata senza verifica effettiva |
| Cliente già possiede documenti con stesso SHA | Nessuna fusione di proprietà/versioni o sovrascrittura automatica |

## Backlog ordinato

1. Validare autorità di presa in carico e visibilità iniziale senza account;definire DTO/ambiti e minacce.
2. Ledger persistente di delivery/recipient e test concorrenza/replay su cluster nuovo.
3. Copier storage e receipt atomica recuperabile,prove crash e indipendenza.
4. HTTP con sessione/Origin/CSRF,rate limit/expiry e nessuna fuga di documenti o destinatari.
5. UI agenzia/proprietario collegata e prova reale multi-account; poi valutazione di retention/cancellazione con policy effettive.

Nessuna di queste cinque voci è completata dal solo componente di anteprima. Nessuna email,link pubblico,nuova spesa AI o modifica alla demo Alessio è autorizzata da questo contratto.
