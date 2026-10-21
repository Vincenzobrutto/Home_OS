# Attività: ricerca e compattezza; paginazione stabile — 21 ottobre 2026

## Implementato

- «Mostra altre attività» e «Mostra altri contatti» mantengono il punto di lettura: l’ultima riga già caricata conserva la posizione, il primo nuovo risultato riceve il focus senza scorrimento automatico verso il pulsante. Annuncio dei risultati aggiunti e del numero caricato. Il recupero dopo errore riusa la stessa logica; scope di account/casa/ricerca/filtri impedisce di applicare una posizione a un’altra vista. Ritorno dai dettagli preservato.
- Attività: ricerca automatica per titolo (300 ms, invio esplicito possibile) su tutte le pagine dei risultati, non soltanto sugli elementi già caricati. Mostra e Scadenza sempre espliciti. q nell’URL e nella cache scoped; cambio filtro conserva la ricerca, azzeramento conserva i filtri. Stato vuoto con Azzera ricerca. Nessuna nuova scrittura o azione AI.
- Backend activities-v1: q opzionale trim/NFC, massimo 120 code point, ricerca case-insensitive nel titolo applicata al where account/casa prima della paginazione; total dopo i filtri. Cursore vincolato anche alla ricerca. Nessuna modifica a schema, migrazioni, permessi o mutazioni. Summary globale invariato e non riutilizzato come totale della ricerca.
- Attività: fila di pulsanti e Storico sostituiti da ricerca + Mostra/Scadenza; Scadenza visibile per Aperte. Conteggi nelle opzioni soltanto senza q. Titolo e stato affiancati; data su una riga con «Scadenza: …», senza ripetere «Senza data» sotto il badge. Link alti almeno 44 px, titoli lunghi a capo. Rimangono Nuova attività, Analisi e verifiche, moduli e dettagli.
- Rubrica: corretto soltanto il caricamento incrementale e l’annuncio associato. Ricerca fissa durante lo scorrimento, ordinamento A–Z e disambiguazione degli omonimi restano proposte dell’audit, non implementate in questo incarico.

## Verifiche

- Frontend: 37 test simulati in routes/activities.test.tsx, contacts/catalog.test.tsx, contacts/navigation.test.ts e contacts/actions.test.tsx. Ricerca oltre pagina 1, dati di un altro account esclusi, filtri/ricerca conservati dal dettaglio, azzeramento e vuoto, focus sul primo risultato aggiunto, annuncio, recupero errori e revoca della Rubrica; precedenti mutazioni e ritorno dopo perdita cache ancora coperti.
- Backend: build e 6 test offline activities.test.cjs, inclusi validazione q, NFC/code point, ricerca scoped prima della pagina, totale, pagina successiva e rifiuto del cursore con ricerca cambiata. Letture del servizio esercitate con transaction/database simulati; nessun database personale o di produzione contattato dai test.
- Build e lint frontend; lint dei soli file backend modificati. Avviso Vite preesistente sul bundle oltre 500 kB, nessun errore bloccante.
- Browser isolato con produzione dei componenti correnti e API in memoria: 80 attività, 100 contatti; desktop 1440×1000, mobile 390×844 e Attività a 320×800. Nessun duplicato o overflow orizzontale.
- Dopo Mostra altre, primo nuovo risultato visibile: Attività desktop a circa 779 px / mobile a 519 px; Rubrica desktop a 879 px / mobile a 683 px. Focus sul primo nuovo elemento; nessun salto alle ultime righe del blocco aggiunto. Apertura e ritorno dal dettaglio, ricerca combinata con In programma, titolo lungo, ricerca senza risultati e azzeramento verificati. Conta delle scritture richieste sempre zero.
- Schermate e harness nella cartella locale della chat `outputs/activities-compact-20261021/`, non nel repository. API simulate in memoria, nessun invio AI, chiamata, email o mutazione da browser. Non è un benchmark API/DB né una certificazione di accessibilità. Il browser del collaudo usa un memory router: verificati i link interni di ritorno, non il pulsante Indietro nativo.

## Stato e limiti

Codice pronto con ricerca server e totale; un eventuale processo API già avviato deve caricare la nuova build per accettare q. Nessun riavvio o modifica del servizio personale eseguito durante il collaudo. Le modifiche legacy locali restano separate. Nessun problema bloccante emerso sul flusso verificato.
