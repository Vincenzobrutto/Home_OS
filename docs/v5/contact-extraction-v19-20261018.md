# Rubrica dai documenti — 18 ottobre 2026

## Risultato

La stessa analisi del documento estrae il professionista emittente, telefono, email e partita IVA/codice fiscale espliciti. Nessun servizio/provider aggiuntivo. Proposta nella revisione unica; un solo «Salva e organizza». Il caricamento automatico, con nuovo consenso `automaticContacts:true`, può creare/collegare il contatto e completare solo campi vuoti. I vecchi consensi/run non acquisiscono queste scritture.

Conformità: solo documento di casa e professionista, nessun nuovo oggetto o spesa. La normale fattura di un negozio e una bolletta non creano contatti professionali. Un documento può essere archiviato anche escludendo la proposta contatto.

## Regole

- Facts documentali issuerPhone/issuerEmail/issuerVatId/issuerFiscalId. Fonti legate a versione e SHA originale.
- Testo: blocco emittente prima del committente, stessa pagina; scansioni: citazione del blocco comprendente nome e valore. Nessun allentamento basato solo su vicinanza delle coordinate.
- Rimozione delle sole etichette note, formati telefono/email e checksum IVA; dati non attribuibili omessi con avviso.
- Partita IVA/CF, email o telefono per riconciliazione forte. Il solo nome e le corrispondenze multiple richiedono revisione.
- Contatti privati per account/casa, versioni, archivio e duplicati verificati. Riuso conserva nome, ruolo e ogni campo già compilato. Conflitti richiedono revisione; mai sovrascrittura automatica.
- Decisioni e link nella transazione di conferma canonica con oggetti/spese; replay idempotente. Nessuna migrazione.

## Verifiche

Backend: 8 test mirati estrazione (PDF reale sintetico + wire, citazioni visive, cliente escluso, IVA/email errate, etichette), 16 test caricamento automatico, 30 onboarding integrazione. Precedenti HTTP contatti/onboarding verdi nella stessa sessione (10+5); build e lint verdi. Il test aggiuntivo onboarding è stato eseguito dopo la suite precedente da44 test. Non sommare questi conteggi come esecuzioni distinte di tutti i casi.

Frontend: build/typecheck e lint dei file modificati verdi. Test nuovi precompilazione e salto del contatto passati, automatic intake aggiornato al nuovo consenso. Suite finale onboarding/automatic intake:49/49verdi. Browser reale: conformità con nome/telefono/IVA proposti e contatto esistente già selezionato; un salvataggio porta al risultato e al contatto. Revisione390px e dettaglio320px senza overflow orizzontale, viewport ripristinato. Prova di compilazione campi vuoti solo sintetica: il contatto personale aveva già i dati verificati nella sessione precedente.

## Collaudo reale e costo

Quattro invii autorizzati, chiavi persistite prima del dispatch; nessun retry automatico:

1. Conformità V17: AI legge i valori con etichette e citazioni troppo brevi; controlli locali omettono telefono/IVA. Costo0.026964USD.
2. Conformità V18: valori puliti, ma fonte senza nome del mittente; controlli locali ancora bloccano. Costo0.026804USD.
3. Fattura lavori V18: emittente, IVA/CF e lavori estratti dal testo; contatto riconciliato per IVA. Costo0.045410USD. Confermato SOLO il contatto tramite percorso automatico interno, nessun oggetto/spesa aggiunti.
4. Conformità V19: risolto conflitto tra istruzioni generali sulle citazioni corte e blocco completo emittente. Nome, telefono e IVA effettivamente presenti nell’output AI e nella proposta. Email assente. Costo0.028038USD. Revisione confermata dal browser senza inserire manualmente recapiti.

Costo sessione0.127216USD; residuo2.288830USD,43/50analisi. Le prime due analisi incompiute nei recapiti sono conservate, senza sostituire le loro prove con dati dell’ultima analisi. Nessuna riserva incerta liberata.

Invarianti finali:9documenti,5oggetti,5spese3012.17EUR,1ambiente,1contatto e4link documentali; noveSHAoriginali invariati. Il contatto esisteva già: i test reali provano estrazione e riconciliazione senza duplicati, non una nuova creazione reale. Le altre due fonti elettriche collegate sono rimaste intatte e non rianalizzate in questa sessione.

## Limiti

Un emittente per documento. Dati su pagine diverse o senza chiara attribuzione restano da rivedere. Nessuna ricerca web, recapito inventato o contatto al professionista. Il modello contatto ha un solo identificativo fiscale, preferendo IVA quando entrambi presenti. La data opzionale di dichiarazione non verificabile resta omessa; non impedisce il documento di casa. Il riconoscimento non è garantito su qualunque formato: quando i controlli falliscono il sistema presenta la revisione, senza nuovi invii pagati automatici.

Runtime V19 riavviato su3001, frontend Vite5174 aggiornato. Nessun push/deploy, reset demo, modifica segreti/modello/quote/firewall o automazione riattivata. Dirty estraneo preservato.
