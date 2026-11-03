# Gift dalla pratica: selezione e link — 3 novembre 2026

## Comportamento concordato

L'agente prepara la Gift dopo la stipula: i documenti della pratica sono già quelli conclusivi. Dalla pratica apre **Consegna al proprietario**, seleziona i file con i flag, include eventualmente la mappa digitale, inserisce l'email e sceglie se regalare un anno di tutte le funzioni proprietario. **Crea link Gift** conclude l'operazione. Non deve preparare nuovamente ciascun documento, riscriverne titolo/provenienza o compilare conferme tecniche.

Il destinatario apre il link personale, usa il normale accesso o la registrazione e riceve la propria casa indipendente con i contenuti selezionati. Un account, nessun pagamento, anno opzionale dall'accettazione. Il documento finale non cambia: la consegna ne fissa la copia e la provenienza. Controlli su fonti/versioni rimangono una protezione interna contro errori e concorrenza, non una tappa ordinaria del lavoro dell'agente.

## Implementazione

- `SimpleAgencyGiftPanel` sostituisce il precedente pannello nel percorso pratica; CTA in testa alla pagina e sezione raggiungibile con ancora. Il vecchio componente resta solo per regressioni storiche, non come secondo percorso nell'app.
- Checkbox documenti, mappa canonica opzionale, email, anno e unico comando. Dettagli e gestione link secondari richiudibili. Bozze, metadati effettivamente superati e proposte geometriche pendenti rimangono eccezioni non consegnabili; la UI non adotta proposte AI.
- `simple-delivery` orchestra le API esistenti. Riusa i descrittori finali; per i soli file selezionati ancora senza descrittore completa il rilascio autorizzato dalla consegna, poi crea l'invito una volta sola. Conserva origine e qualifiche del producer già presenti. Nessuna nuova route/schema/backend di prodotto, nessuna certificazione inventata dal client.
- Il giornale delle richieste vive in memoria, limitato ad account/agenzia/pratica. Dopo una risposta persa conserva esattamente corpo e chiave; una lettura precede l'eventuale ripresa manuale. Nessun POST automatico in retry, nessuna nuova chiave per aggirare un conflitto. Cambio scope/permessi interrompe la mutazione e non espone un link tardivo.
- Le scritture di preparazione dei metadati sono sequenziali, non una nuova transazione batch. Se una fallisce, possono restare descrittori già completati, ma non viene creata una Gift parziale. La pubblicazione Home/documenti/anno resta quella atomica già implementata dal copier.

## Verifiche eseguite

- Nuovi test: 8 helper e 13 interfaccia, 21/21 verdi. Coprono selezione, esclusioni, mappa pendente, drift, esiti incerti, stessa chiave, rigenerazione esplicita, sola lettura, perdita accesso e cambio pratica. Riprodotto rosso e corretto un difetto: il GET dopo il rilascio riconosciuto toglieva il flag del documento appena preparato.
- Regressione finale Gift/mappa 231/231 in18file e navigazione Agency7/7. I test del vecchio pannello non costituiscono prova della nuova UX.
- Typecheck frontend e lint mirato verdi; guardie runner 20/20. Nessuna nuova suite completa backend dichiarata: il prodotto backend è invariato.
- Browser su nuovo cluster protetto `bLJISV`, snapshot del codice finale: accesso agente normale, tre documenti selezionati (atto, planimetria con tre ambienti, prospetto), nota interna esclusa, anno incluso, una sola azione di creazione. Link aperto dal destinatario sintetico già verificato, accesso normale, anteprima e accettazione, poller applicativo, Home pronta con tre file, mappa modificabile e anno fino al 3 novembre 2027. Nessun elettrodomestico del venditore trasferito.
- Schermata agente a 375×812: flag, email e comando usabili, nessun overflow orizzontale (scrollWidth 360 su viewport 375); viewport ripristinato. Nessun errore console rilevato. Screenshot osservati nel browser. Non è una prova su hardware touch fisico.
- Primo nuovo run `oX1CAI` arrestato con il proprio marker prima del browser per ricostruire lo snapshot con la correzione; runner exit0, harness1/1, stop PostgreSQL verificato. Nessun vecchio collaudo riavviato o fermato.

## Ambiente, dipendenze e limiti

Branch `codex/gift-selezione-semplice-20261103`, checkout dedicato dalla PR74 al commit `8f1ba91`, con dipendenze PR73/72. Base comune remota `cbddcf0` e main invariati. Nuovo nominale con hostname/cookie/cluster separati, porta secondaria protetta; termine automatico 3 novembre 2026 alle 02:00 Europe/Rome. Credenziali, link personali, outbox e run restano fuori Git. La pratica `journey` lasciata all'utente non è quella consumata dal collaudo QA.

Solo persone, file e geometrie sintetici; email/scanner fixture, nessuna AI o spesa. Build e API locali reali, nessun deploy o modifica della demo pubblica Alessio. La registrazione/challenge già esistente non è stata ricollaudata in questo lotto: usato destinatario fixture verificato. L'anno senza flag, trascinamento e lifecycle conservano le verifiche dei lotti precedenti, non nuove prove complete qui.

L'archivio proprietario classifica ancora questi file sintetici come «Da classificare / Da compilare»: ricevuti correttamente e leggibili, ma il mapping della classificazione dal fascicolo all'archivio è un seguito separato. Non aggiunta classificazione automatica o AI. Non sono completati integrazione nel consolidamento, invio email reale o generazione di incarichi senza modello approvato.


## Pubblicazione

Codice 9f16073bc83f1c77cbf1cecc3d32c3a1a445b08b, push verificato con ls-remote. [PR draft75](https://github.com/Vincenzobrutto/Home_OS/pull/75), stack PR74/73/72 verso il consolidamento, nessun merge. Screenshot della selezione salvato soltanto negli outputs privati della chat. Trial nuovo ancora attivo fino al termine nominale; arresto finale non ancora verificato.

## Riprova guidata del 3 novembre, mattina

Il precedente bLJISV è terminato al proprio limite: status deadline, stop PostgreSQL alle01:00:00.500UTC, pid assente e nessun listener55440 o processo del run alla verifica09:30UTC. Anche il vecchio b55HFe ha log di arresto riuscito alle00:30UTC. Nessuno dei due è stato ripristinato o riavviato.

Su nuova richiesta di prova guidata è registrato il nominale separato `test:gift-simple-user-trial-20261103`, termine3nov11:30UTC/12:30Europe/Rome. Solo nuovo cluster/snapshot/hostname, stesse fixture e codice prodotto invariato. Guardie dirette offline-harness19/19 (incluso il nuovo caso datato), syntax check verde; non sono la suite completa di guardie storicamente riportata come20. Nessun aumento del limite2ore o ingresso negli aggregati ordinari. Il collaudo utente è distinto dalla QA browser storica; non dichiararlo completato prima del riscontro.
Nuovo run lAunc8 attivo: build/readiness/API/statici verdi; accesso normale agente e checklist browser verificati. La pratica journey è intatta, nessun invito o selezione creati al posto del committente. Scadenza12:30Rome; arresto del nuovo run ancora da verificare. URL/credenziali solo negli outputs privati.
