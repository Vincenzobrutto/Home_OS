# Terza precompilazione caffè: proposta accettata, revisione aperta

23 ottobre 2026. Consenso nuovo del committente alla proposta di una precompilazione del solo PDF anonimizzato caffè ad Anthropic, massimo 0,25 USD, senza retry né registrazione di oggetti/spese; esecuzione autonoma e controllo finale del committente al rientro.

## Esecuzione e controlli

Codice prodotto del checkpoint 419adae (nome breve da abf7156), nel collaudo isolato preesistente: API 3109, frontend 5179, DB temporaneo 55433/dimora_v5_quality_v3_test. Hash dei moduli domain, short-name, product-name e decode-diagnostic identici al dist del repository. Nessun deploy o accesso al DB reale.

Terza campagna separata onboarding-coffee-real-20261023-three; ledger e audit dei primi due invii preservati. SHA del solo originale autorizzato verificato. Una richiesta Messages a claude-sonnet-5-5, un controllo modello e un conteggio token preliminari: tutti HTTP 200. Nessun retry. Costo settled **0,038369 USD**, totale storico dei tre **0,115147 USD**. Job succeeded, una nuova bozza extraction aperta. Conteggi iniziali e finali in sola lettura: **1 documento, 0 oggetti, 0 spese**; vecchia bozza manuale preservata.

## Confronto umano con il PDF e proposta effettiva

| Dato | Esito nella bozza | Confronto e conferma necessaria |
| --- | --- | --- |
| Documento | Riepilogo dell’ordine, Ordine di acquisto | Coerente: non fattura o prova del pagamento |
| Nome breve | De'Longhi Rivelia | Coerente, avviso di nome abbreviato e revisione obbligatoria visibili |
| Marca e modello | De'Longhi; EXAM440.35.B | Coerenti con l’originale |
| Tipologia | Elettrodomestico | Coerente; non prova una stanza |
| Data ordine | 2026-06-14 | Coerente con Ordine effettuato il; data acquisto vuota |
| Totale documento | 499,00 EUR | Coerente; non trasferito al prezzo dell’oggetto né a una spesa |
| Spedizione | 0,00 EUR, fatto documentale nella bozza | Coerente; nessun costo aggiuntivo creato |
| Prezzo articolo | Assente; campo economico vuoto | Nel PDF è visibile 499,00 EUR: omissione da rivedere, nessun ripiego sul totale |
| Descrizione e variante | Testo esteso proposto fino a “Contenitori”; modello separato | Descrizione AI incompleta rispetto al titolo visibile, colore nero non riportato esplicitamente; non dichiarare conservata tutta la descrizione del PDF |
| Quantità | null; un candidato articolo | La presenza di un candidato non equivale a quantità esplicitamente verificata |
| Consegna e pagamento | Nessuna data proposta | “16 giugno” senza anno non completato; metodo bancario non trasformato in pagamento |
| Stanza, seriale, garanzia | Nessuna proposta | Da fornire/confermare dall’utente; nessuna deduzione automatica |

Il nome breve funziona in questa misura reale ed evita il rifiuto osservato precedentemente. Le due vecchie risposte non sono ricostruibili: questo successo non dimostra retroattivamente la loro causa. Le validazioni restano integre; reviewWarnings contiene item:0:name/unverified e purchaseExpenseReady è false. Nessun campo corretto manualmente dall’agente, nessuna conferma canonica.

## Consegna e limiti

Browser integrato lasciato sulla nuova bozza, sezione oggetti aperta. Dopo la prova, servizi isolati ripresi con AI disabilitata e fetch esterni bloccati; proposta persistita e disponibile per il controllo. Supervisore temporaneo con arresto dopo quattro ore: la bozza sopravvive all’arresto, la disponibilità del servizio è temporanea.

Da far confermare al committente: identità/modello/variante, oggetto nuovo o già posseduto e stanza effettiva; eventuale registrazione manuale di 499 EUR con ruolo e data corretti. Nessun clic su Salva e continua o conferma di oggetti/spese. Il residuo del budget non autorizza ulteriori chiamate.

Nessuna modifica di prodotto o suite automatica ripetuta in questa sessione; controllati UI, ledger, audit, SHA e conteggi del DB isolato. Test storici: onboarding 291/291 e DB 87/87, mock frontend 844/844 del precedente checkpoint, non nuove misure. Un solo documento non misura accuratezza generale o chiusura del gate Fase 0. Restano aperti prezzo di riga/completezza delle varianti e gli altri rinvii. Nessuna modifica a main, .env, dati reali, gold/ledger sintetici, file estranei o 104 StoredFile.
