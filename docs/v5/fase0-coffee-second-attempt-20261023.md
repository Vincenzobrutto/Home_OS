# Seconda precompilazione del PDF caffè: rifiuto localizzato sul nome

23 ottobre 2026. Nuovo consenso esplicito del committente: solo PDF anonimizzato della macchina da caffè ad Anthropic, una chiamata, massimo 0,25 USD, nessun retry o salvataggio di oggetti/spese. Ambiente isolato esistente, con i tre moduli compilati della diagnostica di `3647f76`; nessun deploy reale. Tentativo e registro di rete separati dal primo, senza azzerare ledger o ricevute.

## Esito

- SHA dell’originale caricato verificato; nessun altro documento autorizzato.
- Una richiesta Messages; una verifica modello e un conteggio token preliminari. Tutte le risposte HTTP 200, nessun secondo invio.
- Modello configurato: claude-sonnet-5-5. Prompt e validazioni invariati.
- Costo nuovo tentativo: **0,038369 USD**, contabilizzato come settled. Primo tentativo preservato: 0,038409 USD. Totale dei due tentativi: **0,076778 USD**.
- Nuovo rifiuto: `analysis_invalid_output`, fase `evidence`, modalità `visual_pdf`, sezione **item_field**, campo **name**, stop_reason end_turn.
- Nessuna proposta AI accettata. Il confronto dei singoli valori estratti non è possibile; non attribuire al modello i valori attesi letti umanamente dal documento.
- Verifica finale in sola lettura sul DB temporaneo: **1 documento, 0 oggetti, 0 spese**, sola bozza manuale precedente. Entrambi i tentativi restano conservati.

## Cosa dimostra la nuova diagnostica

Il secondo rifiuto è nel percorso di validazione del nome del prodotto: è un’informazione più precisa della sola fase evidence del primo tentativo. Non prova retroattivamente che il primo rifiuto avesse la stessa causa.

Il codice del nome verifica struttura del campo, valore testuale non vuoto entro 120 caratteri, citazione e corrispondenza del valore con la fonte. La diagnostica osservata non distingue ancora limite del valore, struttura o pagina/estratto della citazione. Un errore nelle coordinate avrebbe la sezione distinta source_region. Una mancata corrispondenza testuale tipizzata avrebbe codice evidence_unverified; il codice osservato resta analysis_invalid_output. La risposta grezza rifiutata non è conservata.

Il titolo commerciale lungo visibile nel PDF rende plausibile il superamento dei 120 caratteri, ma **non lo dimostra**. Non vengono troncati dati né aumentati i limiti sulla base di questa ipotesi.

## Proposta discussa con il committente

Un nome breve leggibile per la scheda, separato da marca/modello e dalla descrizione originale, può evitare titoli commerciali eccessivi. L’eventuale segmento selezionato deve rimanere supportato dalla fonte; il taglio non deve occultare identità, modelli o varianti né rendere valido un dato non verificato. Per l’originale caffè il riferimento umano è De’Longhi Rivelia, con modello EXAM440.35.B separato: **non è una proposta estratta accettata dal sistema**.

Questo comportamento è una proposta, non implementato in questa sessione. Prossimo lavoro offline: diagnostica più granulare della causa e regressioni di nomi lunghi, ambigui o con modello alla fine; scegliere una politica di abbreviazione verificabile mantenendo le validazioni e senza eccezioni per cliente.

## Verifica e limiti

Registro di rete e ledger del DB temporaneo verificati. Nessuna suite automatica ripetuta: nessuna modifica di prodotto in questa sessione; sola esecuzione autorizzata con la diagnostica già verificata nel checkpoint precedente (278/214/16 test). Nessuna nuova conferma, dati reali, main, .env, gold o campagne sintetiche modificati; file estranei e 104 StoredFile preservati. Nessun retry oltre la nuova singola chiamata autorizzata.
