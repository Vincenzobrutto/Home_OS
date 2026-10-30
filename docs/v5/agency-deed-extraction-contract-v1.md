# Atti: contratto offline delle proposte e delle citazioni

30 ottobre 2026, ciclo diurno fino alle 18:00 Europe/Rome. Ipotesi da validare con un’agenzia reale. Nessuna AI reale o nuovo documento personale.

## Funzione implementata

`reviewDeedExtraction` in `backend-v5/src/agency-practices/deed-extraction.ts` controlla una risposta strutturata rispetto a pagine testuali fornite da un decoder fidato del server. Non è un OCR, un decoder PDF o un client AI. Non crea fatti, non conferma dati e non sceglie l’identità dei conferenti.

Input distinti:

- Contesto Actor/Practice autorizzato corrente, mai fornito dal browser come attestazione.
- `TrustedDeedText`: ID/versione/SHA della fonte, versione parser e pagine testuali. Deve essere prodotto dal server dopo accesso allo storage e decodifica; questa porta non è ancora collegata a un parser atti operativo.
- Risposta non fidata: envelope della fonte e massimo 100 candidati con campo, valore, riferimenti soggetto/unità interni al documento, ruolo proposto, pagina e citazione. Schema esatto: nessun `confirmed`, istruzione, autore, permesso o ID fatto esistente accettato.

Solo fonti classificate deed/succession e leggibili; fonte privata resta privata anche per admin assegnato diverso dal caricatore. Una sostituzione versione/SHA blocca il risultato. Non si usa una fonte non più corrente per generare nuovi dati.

## Cosa significa “citazione verificata”

Verifica **lessicale**, non semantica: la citazione normalizzata deve comparire nella pagina del parser, il valore deve comparire nella citazione come sequenza letterale delimitata, non come sottostringa di un altro numero/nome. Normalizzazione limitata a NFC e spazi: non corregge OCR, non espande abbreviazioni e non deduce sinonimi.

Anche se la citazione contiene “foglio 31, particella 312, subalterno 12”, il controllo lessicale non dimostra che 12 sia la particella. L’output espone sempre `semanticEvidenceVerified:false`, `requiresHumanBinding:true`, `status:unbound_proposal`, `canApplyAutomatically:false`. Occorre verifica umana campo/valore e successiva associazione a soggetti/unità della pratica.

I riferimenti del modello non sono le chiavi di persone/unità della pratica. Non collegare automaticamente due documenti perché hanno lo stesso `subjectRef`, lo stesso nome o lo stesso `unitRef`.

## Campi e ruoli del primo contratto

Campi ammessi: nome parte; comune/foglio/particella/subalterno; data atto letterale ISO valida. Date italiane scritte, quote, diritti, superfici, prezzo, provvigioni e clausole non vengono convertiti o estratti da questo adapter. Servono converter e casi specifici prima di ampliare il contratto.

Ruoli ammessi come proposte: proprietario storico, acquirente nell’atto, persona deceduta, erede dichiarato, irrisolto. Non esiste il ruolo `current_owner`: un acquirente in un vecchio atto o una persona nominata in successione non diventa proprietario attuale confermato. Ruoli diversi da irrisolto sono ammessi solo sui nomi delle parti, non sui campi catastali/date.

## Output e limiti

- Proposte ammesse con prova fonte/versione/SHA/pagina/citazione e hash del testo pagina.
- Candidati esclusi con motivo: pagina o testo indisponibili, citazione non trovata, valore non presente, data non supportata. Nessun riempimento inventato.
- Fingerprint su fonte, parser, hash pagine e candidati ordinati, indipendente dall’ordine dei candidati. Una variazione del testo fidato cambia il fingerprint.
- `certification:false` e `completenessAssessed:false` sempre: nessun candidato o nessun errore non significa documento completo o dati corretti.
- Limiti 50 pagine, 200.000 caratteri/pagina e 2 milioni complessivi, 4.000 caratteri/citazione. Schema/ID duplicati o payload eccessivi rifiutati; nessuna pubblicazione parziale se manca accesso alla fonte.

L’hash pagina identifica il testo passato dal decoder, non certifica il contenuto dell’originale. I PDF senza testo o con OCR incerto richiedono un percorso separato, non una risposta AI usata come testo fidato.

## Verifiche e continuità

Tredici nuovi casi sintetici nel profilo findings esistente: storico/eredi distinti e senza binding, ruolo attuale vietato, quote/pagine/valori inventati, numero dentro altro numero, date impossibili, normalizzazione spazi, privacy, fonte cambiata, testo vuoto, schema/duplicati/limiti e fingerprint. Il primo test di sostituzione ha rivelato che la riclassificazione unclassified oscurava l’errore di versione: controllo versione anticipato, senza allentare l’assert.

Verifiche finali: regressione ordinaria 535/535, build e lint mirato verdi. Il primo run 534/534 precede il controllo aggiuntivo delle pagine fidate malformate; la regressione finale include tale caso. Nessuna API o persistenza nuova: non sono stati avviati cluster DB per questo adapter puro.

Base di sviluppo aggiornata in detached sul commit già pubblicato `f2495854221a6fb3bb71ed34d92867be3a091a6b`, discendente del checkpoint notturno. È il cablaggio concorrente, con propri limiti e regressione frontend non conclusa nel [suo handoff](agency-navigation-handoff-20261030.md). Questo incremento non ne cambia i file e non ne dichiara conclusa la validazione. Nessun merge/rebase del lavoro concorrente.

Prossimo passo: decoder atti fidato e test di citazioni con testo realmente derivato da fixture PDF; poi binding umano esplicito verso il dominio review. API/UI e trasporto provider degli atti restano da progettare/collegare, con consenso e budget dedicati prima di qualsiasi invio reale.
