# Home — collaudo funzionale finale, 16 ottobre 2026

## Perimetro e risultato

Baseline runtime42a4b47. Il committente ha avviato Claude sulla rifinitura UX documentale; Codex possiede il codice e il collaudo funzionale. Nessuna modifica runtime in questo giro: aggiornati due test dopo il riordino Casa, senza eliminare controlli né aumentare timeout. Nessun difetto bloccante emerso nei percorsi qui provati; non è una certificazione completa del servizio o della sicurezza.

Una sola esecuzione completa frontend: **342/344** verdi,30file. I due fallimenti riguardavano test:
- review cercava il conteggio nella vecchia scheda Impianti e verifiche. Ora verifica la nuova sezione Da rivedere, conservando il controllo Dati confermati nella scheda tecnica. Aspetta inoltre il titolo Casa prima di catturare la regione: anche la pagina Attività ha una regione con lo stesso nome e il router può risolvere prima del commit React;
- errore elenco case avviava una seconda navigazione prima dell'esito del login. Ora aspetta il primo errore visibile e verifica nuovamente /case, mantenendo le asserzioni che impediscono modulo o scheda codice al posto dell'errore.

Ripetizione dei due file:29/30; la prova conteggi catturava ancora la regione della vecchia pagina. Aggiunta attesa del titolo Casa, caso finale **1/1 verde**,20non eseguiti. Tutti344casi distinti hanno quindi esito positivo nelle esecuzioni pertinenti; **non dichiarare una seconda suite completa344/344**. Nessun timeout aumentato o regola disattivata. Lint mirato finale dei due file. Build/lint runtime erano verdi sulla stessa baseline nell'integrazione precedente, non ripetuti perché codice prodotto invariato.

Log workspace: outputs/Dimora-V5-Home-collaudo-finale-test-20261016.log; Dimora-V5-Home-collaudo-riparazioni-test-20261016.log; Dimora-V5-Home-conteggi-mirato-20261016.log. La suite comprende cache/logout, autorizzazioni lato UI, documenti, review/fixture AI, attività, oggetti, economia/bozze, sharing e caricamento differito: sono test con backend simulato e integrità fixture, non nuove prove DB/HTTP.

## Browser sul servizio reale

Sessione di collaudo già esistente `Verifica Home sintetica`, casa `8f7fff10-910f-4593-bc23-6f89607f35ec`. Tutte le nuove scritture via UI ordinaria nel DB V5 locale dedicato, con dati sintetici. Nessun account del committente modificato.

| Percorso | Osservato |
|---|---|
| Casa → Oggetti → creazione personale | Creata Lavatrice · collaudo Home16ottobre, dettaglio e storia presenti |
| Oggetto → Crea promemoria | Un'attività creata e collegata, presente nella scheda dopo il ritorno |
| Attività → Modifica data | Data17ottobre2026 salvata, storia modifica e badge In programma |
| Casa → scadenze | Conteggio in programma1 e attività con data corretta |
| Oggetto → Registra costo | Oggetto preselezionato, costo manuale12,34EUR salvato, ritorno alla stessa scheda |
| Ricaricamento/ritorni | Costo e attività mantengono i collegamenti dopo ricaricamento e navigazione |
| Documenti → Carica | Caricata fixture sintetica docs/v5/fixtures/s1/invoice.pdf, visibilità predefinita Solo io |
| Oggetto → Collega documento | Originale collegato senza cambiarne la visibilità; documento/costo/attività contemporaneamente presenti |
| Documento → Scarica originale | SHA256 scaricato uguale alla fixture e all'impronta UI |
| Attività → Completa | Conferma esplicita, stato Completata da te/Chiusa, focus sullo stato |
| Casa dopo completamento | In programma torna0, attività non compare fra le aperte; costo resta una registrazione da12,34EUR |
| Casa estranea via URL | Il profilo sintetico riceve Accesso non consentito, senza nome, dettagli o menu della casa richiesta |

La fattura è una fixture generica per provare il collegamento all'oggetto, non prova del costo manuale di12,34EUR: nessuna estrazione, confronto importi o associazione economica automatica è stata eseguita. Il documento continua a mostrare Nessuna spesa attiva collegata; collegare due risorse allo stesso oggetto non le collega fra loro.

Nota sugli strumenti: fill sugli input date inizialmente non aggiornava lo stato React nel browser automatizzato. Completata l'immissione con freccia su/giù e Tab ordinari, quindi verificati valore persistito, badge e storia. Non classificato come difetto prodotto. Il primo tentativo di individuare Nuovo oggetto come region non trovava il modulo: corretto il selettore a form, senza cambiare codice.

## Dati ed evidenze ripetibili

- Oggetto:195602b3-d3c9-4b19-ad3c-be3a201fa585.
- Attività:dd805019-1476-4b93-b13d-b924b57aa6b9, completata.
- Costo:40cc0e67-62b2-4141-abcc-1f9d44c09d13,12,34EUR manutenzione, attivo.
- Documento:0670e091-7de9-431c-8542-240f51acc5b4, originale privato,v1,820byte.
- SHA256:a2bf4033d3fe882bab682b5f1675e4bde91c7ab770b2b01f0bc095472a628e6a. Download ordinario in C:\Users\07704017\Downloads\invoice.pdf, confronto Get-FileHash.
- Screenshot workspace outputs/Dimora-V5-Home-collaudo-oggetto-20261016.png e Dimora-V5-Home-collaudo-accesso-negato-20261016.png. Lasciati dati sintetici disponibili, senza cancellazioni; scheda oggetto aperta per la revisione.

## Limiti e seguito

Nuovo flusso AI reale e nuova consegna a un altro account non ripetuti nel browser: copertura simulata della suite e prove reali precedenti in c1-frontend-integration-20261015.md, spese-verifica-percorso-20261015.md e home-consolidamento-integrazione-20261016.md. Non dichiarare un'unica catena documenti→AI→consegna reale eseguita oggi. Nessun nuovo collaudo screen reader o mobile fisico. Il rifiuto osservato su una casa è una prova mirata, non dimostra ogni autorizzazione server.

Codice backend, schema, API e configurazioni invariati; nessun riavvio, chiamata Anthropic/prodotto a pagamento, modifica.env/quote/sicurezza/main, push o DB reale/legacy. Dirty estraneo preservato. Fetch origin:179avanti/0indietro prima di queste modifiche.

Il prossimo passo è raccogliere la consegna UX di Claude quando dichiarata completa, arbitrare gli interventi minimi e lasciare quelli facoltativi nel backlog. Nessuna guida, forecast o nuova funzione aggiunta. Non avviare Agenzie prima di questo breve arbitrato. Nessun processo Codex permanente o nuova automazione di raccolta attivata.
