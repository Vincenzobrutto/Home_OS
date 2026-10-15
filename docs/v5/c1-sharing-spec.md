# C1 — condivisione selettiva, proposta v0.1

15 ottobre 2026. Base: home-economy-module.md §9 e §11; separazione originali/derivati di M2/M3 e privacy personale di G1/S1. **Definizione in revisione, non funzione attiva né contratto REST congelato.**

## Esperienza desiderata

Il proprietario prepara una selezione per una persona precisa: per esempio manuale e libretto della caldaia per il tecnico, senza dare accesso alla casa o alle spese. Il destinatario vede una consegna dedicata, non la normale Home del mittente. La condivisione non cambia la visibilità M2 Solo io/Persone della casa e non crea membership.

Percorso: Casa → Condivisioni; scorciatoie da documento e oggetto con solo quel contesto iniziale, senza selezione automatica di contenuti. Selezione → destinatario/durata → anteprima esatta → conferma esplicita → invito → accettazione → consultazione. Il mittente può revocare. Prima dell'accettazione il destinatario non vede titoli dei file, indirizzo o contenuti.

## Regole da conservare

1. Nessun elemento selezionato all'apertura, compresi i documenti suggeriti dall'oggetto di partenza. Checkbox e conteggio espliciti; anteprima prima di concedere accesso.
2. Documenti: soltanto originali caricati dal mittente, ancora leggibili/esportabili da lui con membership attuale valida. Essere owner della casa non autorizza a ricondividere un originale privato altrui. Prima iterazione: non ricondividere file caricati da altri, anche se leggibili nella casa.
3. Il file intero può contenere importi, IBAN e dati personali. Nessuna pretesa di anonimizzazione o rilevamento automatico. Conferma specifica dei file selezionati dopo avviso: «Il destinatario vedrà il file completo, anche eventuali importi e dati personali al suo interno». Un cambiamento di selezione azzera la conferma.
4. Scheda oggetto: proiezione dedicata solo nome/tipo e campi tecnici confermati che il mittente può divulgare. Niente link automatici ai documenti, attività, costi, note personali, storia tecnica o ambienti. Ogni documento va selezionato separatamente. La parte oggetto è C1b, successiva alla prima verticale documentale C1a.
5. C1a non condivide record Spese, dashboard, bozze AI, pagamenti o riepiloghi. La condivisione di una fattura non condivide il costo strutturato collegato; l'avviso sul contenuto originale vale anche per questa scelta.
6. Il manifesto conserva ID/versione/hash degli originali inclusi. Nuovi caricamenti, collegamenti o nuove versioni non entrano automaticamente. Il destinatario consulta e scarica; non modifica originali o dati della casa e non può delegare il permesso dentro Dimora.
7. Scadenza proposta: 7 giorni predefiniti, alternative 1/30 giorni; istante esatto calcolato dal server e mostrato prima della conferma. Scadenza verificata ad ogni lettura/download e conferma, senza dipendere dallo scheduler. Revoca immediata sui nuovi accessi; le copie già scaricate non si ritirano.
8. Se la membership del mittente cessa (vendita compresa) o perde i diritti su un originale, il permesso C1 non lo aggira. Pacchetto non disponibile; niente nomi/ID/file residui nei replay o nei messaggi del destinatario. Nessun trasferimento di proprietà tramite C1.
9. Accettazione, revoca e conferma sono operazioni versionate/idempotenti; nessun successo ottimistico su errore rete. 401 pulisce cache e richiede login, 403 non viene trasformato in archivio vuoto. Link copiato non equivale a email inviata, accettato non equivale a letto.

## Prima verticale C1a e punti da chiudere prima delle API

Prima implementare originali selezionati e manifesto, poi proiezione oggetti. Il primo lavoro backend copre solo validazioni/policy offline: non concede nuovi diritti e non modifica gli endpoint M2.

**Destinatario raccomandato per la prima verticale reale:** account già membro della stessa casa, scelto dall'elenco autorizzato delle persone della casa, con accettazione esplicita. Account ID canonico, non email digitata come prova di identità. La condivisione serve a rendere leggibili file personali scelti, senza condividere tutto. Il mittente deve poter vedere nome e recapito già autorizzati dal servizio, evitando omonimi.

**Destinatario esterno (tecnico/familiare senza membership):** percorso da rappresentare separatamente nel mockup, ma non attivare finché non sono definite verifica del destinatario e consegna sicura. La sola email di registrazione attuale non è verificata: non basta confrontarla per sbloccare file sensibili. Niente link pubblico bearer al file e niente promessa di email/OTP già operativi. Claude deve criticare questa sequenza: se l'utilità richiede prima il tecnico esterno, proporre la minima verifica necessaria, senza aggirare il problema con una pagina anonima.

Questa scelta di sequenza è proposta tecnica di Codex, non una nuova limitazione permanente del prodotto. Eventuali costi SMS/email, condizioni legali o cambi al modello commerciale richiedono decisione distinta; nessun acquisto o integrazione esterna in questo incarico.

## Accettazione

- C1-01: da oggetto/documento niente file selezionati implicitamente; manifesto uguale ai soli elementi scelti.
- C1-02: originale privato altrui, utente viewer, altra casa o membership cessata: nessuna creazione o ricondivisione.
- C1-03: selezione aggiornata → consenso sui file da ripetere; nessun record economico o derivato esposto.
- C1-04: destinatario nominato accetta; altro account, anteprima anonima e token indovinato non leggono titoli/file.
- C1-05: revoca, scadenza o vendita bloccano dettaglio/file/export e replay; nessuna dipendenza dallo scheduler.
- C1-06: nuovi documenti/versioni non ampliano il manifesto; idempotenza evita doppie concessioni.
- C1-07: mobile 320/390, tastiera, indietro, errore rete, selezione persa dichiarata e nessuna confusione con visibilità M2.

## Divisione del lavoro

Claude: revisione critica UX/privacy e mockup standalone sintetico, nessun runtime reale o contratto inventato. Codex: policy backend offline, specifica/contratto dopo revisione, poi schema/API e integrazione. Nessun frontend master sovrapposto al lavoro di Claude. Questa fase finisce con artefatti revisionabili, non con una condivisione reale dichiarata funzionante.
