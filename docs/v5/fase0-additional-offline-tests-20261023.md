# Collaudo aggiuntivo offline: formati e varianti con nome breve uguale

23 ottobre 2026. Prosecuzione autonoma autorizzata dal committente durante la sua assenza. Solo test offline, nessuna nuova chiamata AI o accesso al DB reale.

## Esito

Le nuove prove passano sul codice prodotto già pubblicato in `abf7156`: **nessun nuovo difetto riprodotto e nessuna modifica di prodotto necessaria**. Aggiunte regressioni permanenti al comando onboarding e al runner DB esistente.

Le prove dei formati costruiscono nomi, citazioni e contesti text/visual_pdf in memoria, esercitando il validatore reale. Non sono nuovi parsing di PDF o misure OCR. Le prove DB chiamano i servizi reali con record e snapshot sintetici; i ricaricamenti sono simulati con copie dello stesso SHA, senza ripetere il percorso HTTP/UI di upload.

- **252 combinazioni**: sette scritture di nomi (incluse lettere accentate, greco, CJK, arabo ed emoji), sei separatori, tre spaziature (spazio, nuova riga, spazio non separabile), in testo e PDF visuale. Nome breve letterale entro 120, nome esteso completo, modello e variante finale preservati, fonte/versione/SHA conservati e automatico bloccato. Questa è copertura del trattamento testuale dei nomi, non qualità di classificazione multilingue o OCR.
- **20 varianti nello stesso documento**, tutte con nome breve uguale: venti fingerprint distinti; stessi identificativi dopo inversione degli articoli e dell’ordine dei campi. Nessun riconoscimento per solo prefisso. Ventunesima riga e ripetizione della stessa riga respinte dai limiti esistenti.
- La citazione di una variante vicina non verifica il nome completo di un’altra; una pagina esclusa dalla selezione inviata non può fornire evidenza. Pagina 2 ammessa validata, pagine 0/1/3/4 escluse respinte nel rispettivo contesto.
- Nome esteso di **2000 caratteri** conservato integralmente; 2001 respinto. Identificatore iniziale non separabile oltre il limite non tagliato. `fullName` dichiarato dal provider respinto. Consumabili/accessori incerti restano tali; un articolo a bassa confidenza non diventa una scheda.
- Unicode NFC/NFD equivalente conserva la stessa identità. Una copia con stesso SHA mantiene il fingerprint ma riceve un item ID vincolato al proprio documentId e la propria fonte: nessuna confusione tra documenti.

## Prove durevoli sui due ordini di caricamento

Nuovo cluster dedicato a 127.0.0.1:55433 / dimora_v5_quality_v3_test, documenti/attori sintetici locali e rete provider bloccata dal test. Il precedente ambiente UI è stato fermato durante il collaudo, poi ripristinato offline preservando i dati.

Due documenti distinti descrivono le varianti Blu e Rossa dello stesso modello, con nomi estesi diversi e **stesso nome breve**. Eseguiti Blu→Rossa e Rossa→Blu, poi ricaricamenti nell’ordine inverso. Per ogni ordine:

1. Ogni variante confermata esplicitamente produce la propria scheda, con modello separato e fonte completa corretta nella provenienza.
2. Replay della stessa conferma da un nuovo client riutilizza la ricevuta: nessun nuovo oggetto o spesa.
3. Una copia dello stesso SHA non può creare nuovamente l’articolo già censito: risposta onboarding_object_exists e conteggi invariati.
4. Il collegamento esplicito della copia alla rispettiva variante e il relativo replay producono un solo collegamento attivo per quella coppia oggetto/documento.
5. L’altro owner non legge la bozza privata. Il nome esteso resta consultabile soltanto nel proprio contesto autorizzato.

Risultato per ciascun ordine: **2 oggetti, 0 spese**, varianti e fonti distinte. Il limite canonico, le conferme manuali, l’idempotenza e la privacy non sono stati ridotti.

## Verifiche e consegna

- Backend build e lint superati; onboarding completo **291/291**, inclusi sei nuovi test di stress con molteplici casi interni.
- DB temporaneo completo **87/87**, inclusi i due nuovi ordini e le regressioni precedenti su acconto/saldo, Q48, ordini, privacy/revoca/versione/SHA e concorrenza. Cluster fermato, directory conservata.
- Frontend e codice prodotto invariati: non ripetute suite già superate senza ulteriori cambiamenti. Ultimo risultato mock completo **844/844**, più backend ordinari 214/214 e guard/runner 17/17, appartiene al checkpoint precedente.
- Nessuna nuova prova AI: restano non misurati il successo del PDF reale caffè dopo la modifica e l’accuratezza di precompilazione reale. Nessuna risposta scartata ricostruita o nuova causa attribuita retroattivamente.

Nessuna modifica a .env, main, gold/scorer/soglie, autorizzazioni o ledger delle campagne, DB/API/storage reale, file sporchi estranei o 104 StoredFile. Nessun reset, clean, force push, rimozione di worktree, deploy o backfill. Ambiente UI ripristinato con AI disabilitata e chiamate esterne bloccate. Lo scopo di questi test è dimostrare invarianti generali; i documenti sintetici di regressione non sono nuovi esempi commerciali obbligatori.
