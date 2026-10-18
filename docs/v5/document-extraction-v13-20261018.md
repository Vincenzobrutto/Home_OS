# Estrazione documenti V13 — 18 ottobre 2026

## Obiettivo e perimetro

Migliorare i dati effettivamente estratti, verificandoli sugli originali già caricati. Il committente ha autorizzato prove autonome Anthropic sul budget residuo esistente. Nessuna modifica a modello, tariffe, plafond, consenso nell'app o limite di 40 analisi. Nessun nuovo servizio esterno.

Le prove producono nuove bozze, non confermano né sovrascrivono gli oggetti e le spese già presenti. Le bozze restano disponibili per la revisione unica e i controlli canonici dei doppioni. Non è una nuova ricostruzione manuale della demo.

## Correzioni

- Quantità opzionale non verificabile: conservare identità, data e prezzo validi; omettere la quantità e richiedere revisione. Rimangono vincolanti fonte, pagina, SHA e identità. La policy automatica blocca i casi con warning.
- Tabelle descrizione/quantità/prezzo/totale: supportare descrizioni su più righe prima della quantità e dell'importo, oltre alle etichette esplicite di prezzo. Nessuna moltiplicazione o ripartizione del totale. Righe duplicate, prezzo unitario senza totale e righe adiacenti incomplete non devono prestare importi ad altri prodotti.
- Planimetria visiva senza intestazione stampata: consentire una proposta di tipo floor_plan con titolo locale «Planimetria», marcato origin=document_type e warning da verificare. Non descriverlo come una citazione letterale; nessuna estensione a fatture o altre classificazioni. Il dominio continua a vietare oggetti e spese per house_document.
- Diagnostica di decodifica: distinguere risposta, normalizzazione wire e validazione delle evidenze; registrare solo fase, modalità della fonte, stop reason consentita e conteggi. Nessun testo, nome, citazione o risposta privata nei log.
- Prompt document-understanding-v13: allineare le istruzioni alle tabelle reali, mantenendo una sola risposta strutturata e una sola revisione utente.

## Prove live

Set limitato di sette originali, otto chiamate Messages, con singola ripetizione esplicita della planimetria dopo correzione locale. Nessun retry automatico a pagamento. Spesa complessiva **0,258852 USD**. Ogni chiamata è stata regolata con costo effettivo inferiore alla riserva di 0,25 USD.

| Originale | Esito dell'ultima prova | Dati utili e limiti |
| --- | --- | --- |
| Macchina caffè | Proposta riuscita | Nome, De’Longhi, Rivelia, riferimento EXAM440.35.B, acquisto 14/06/2026, totale 499,00 €. Data di consegna scartata come non verificabile. Nessuna integrazione manuale per questi cinque dati richiesti. |
| Ricevuta DREAME | Proposta riuscita | Nome, DREAME, X50 Ultra Complete, quantità 1, riga e totale 899,00 €, ordine 26/11/2025 distinto dalla ricevuta 27/11/2025. |
| Fattura lavori | Proposta riuscita | Quadro elettrico e monitor videocitofonico distinti; intervento, data 08/07/2026, numero fattura, fornitore e unica spesa della casa 1.537,20 €. Nessuna ripartizione per oggetto, nessuna marca/modello inventati. Importi ausiliari non verificati richiedono controllo. |
| Bolletta Sorgenia | Proposta riuscita | Categoria elettricità, fornitore, numero, data 23/09/2025 e scadenza 13/10/2025; costo corrente 67,97 € distinto da importo da pagare 76,97 €. Zero oggetti. Differenza e importi ausiliari richiedono revisione, senza scegliere silenziosamente il totale. |
| Conformità impianto | Proposta parziale | Quadro elettrico, emittente, potenza disponibile 6 kW. Data e systemType non validati, lasciati fuori e segnalati. Nessun acquisto/garanzia inventati; resta un limite da affinare. |
| Screenshot TV | Proposta riuscita | Nome, Samsung, 444,00 €. Modello esatto e data non presenti nella proposta; nessuna data inventata e nessuna spesa confermata. |
| Planimetria | Seconda prova riuscita | Prima risposta rifiutata in validazione locale; seconda proposta house_document/floor_plan, nessun oggetto o spesa. Il test sintetico copre anche il caso privo di titolo stampato. Il solo cambio di esito live non dimostra che la prima risposta avesse esattamente quel difetto: il contenuto grezzo non è conservato. |

Le osservazioni visive restano osservazioni del provider con regione, non OCR indipendente. Il corpus è piccolo: questi risultati non sono una misura statistica dell'affidabilità su documenti nuovi. La conformità non è ancora abbastanza completa per promettere onboarding interamente automatico. Il prezzo del caffè è il totale verificato di un documento con un solo prodotto, non una nuova riga inventata.

## Verifiche e stato

- Build e lint backend verdi; 97 test offline del gruppo object-onboarding (96 prima dell'ultimo test diagnostica, poi i 34 del file understanding tutti verdi); 14 test policy automatica già verdi; 46 test DB/HTTP inclusi automatic intake, replay, consenso, budget e doppioni verdi.
- Dati canonici invariati: 9 documenti, 5 oggetti, 5 spese per 3.012,17 €, un ambiente. SHA dei nove originali verificati invariati.
- Budget finale **2,416046 USD residui, 39/40 analisi utilizzate**. Resta **una sola analisi** prima del limite numerico, anche se il saldo monetario è maggiore. Nessuna riserva storica incerta liberata.
- API locale aggiornata; frontend e accesso LAN non modificati. Nessuna migrazione, push o deploy.
- Ricevuta dettagliata privata fuori repository: outputs/extraction-v13-live-20261018.json; chiavi delle prove in work/extraction-v13. Non versionare originali o output personali.

## Prossimi affinamenti

Usare prima replay e fixture sintetiche per le cause residue: semantica data/tipo della conformità e importi ausiliari delle bollette. Mantenere la distinzione costo energia/importo da pagare e la prova della singola riga. Non consumare l'ultima analisi per ripetizioni identiche prive di una modifica o ipotesi verificabile.
