# Fase 0 — Progetto dell'eliminazione dei dati, 22 ottobre 2026

Progetto Claude con le scelte del committente del 22/10. **Solo progetto: nessun codice, nessuna eliminazione eseguita.** Parte dai requisiti di `prova-personale-conservazione-20261016.md`: conservazione per default, eliminazione solo su richiesta esplicita, impatto mostrato prima, nessuna cascata indistinta, backup che non fanno ricomparire i dati.

## 1. Cosa esiste oggi

| Capacità | Stato |
|---|---|
| Eliminare un documento privato, caricato da sé e **mai usato** (nessuna analisi, proposta, collegamento o condivisione) | Implementato: `documents/removal.ts`, `POST documents/:id/removal`, idempotente e con versione; rimuove riga, versione, file registrato e originale su disco |
| Rimuovere un file dal lotto prima dell'uso | Implementato (`document-intake/removal.ts`) |
| Archiviare oggetti, spese, lavori e contatti; annullare attività; rimuovere collegamenti; revocare condivisioni | Implementato, ma **non è eliminazione**: i dati restano |
| Eliminare un documento già usato, un oggetto, una spesa, un contatto, una casa o l'account | **Assente** |
| Regola sui backup dopo un'eliminazione | **Assente**: le copie restano senza scadenza |

## 2. Modello per l'utente (decisione del committente, 22/10)

- **Archivia** resta com'è: «non lo uso più ma voglio tenerlo». Dati e storia restano.
- **Elimina** sposta nel **Cestino della casa** per **30 giorni**. Da lì si ripristina con un clic; dopo 30 giorni l'eliminazione diventa definitiva da sola. «Elimina subito» e «Svuota cestino» per chi vuole farlo prima.
- Una sola regola per documenti, oggetti, spese, lavori, attività, contatti ed eventi della storia. Nessun passaggio «prima archivia, poi elimina».
- **La casa intera non va nel cestino**: ha un percorso proprio (§4.5).

## 3. Cestino: accesso e pagina

**Accesso**

1. Avviso dopo ogni eliminazione: «Spostato nel cestino · **Annulla** · Vai al cestino».
2. Link discreto in fondo alla barra laterale della casa, «Cestino (n)», visibile solo se il cestino non è vuoto; su telefono nel menu «Menu», non nella barra in basso.

**Pagina** `/home/:homeId/cestino`

- Elenco unico di ciò che l'utente ha eliminato in quella casa: icona del tipo, nome, data di eliminazione, «eliminazione definitiva tra N giorni».
- Per ogni voce «Ripristina» ed «Elimina subito»; in alto «Svuota cestino» con conferma. Filtro per tipo solo con molte voci.
- Ogni membro vede solo ciò che ha eliminato lui, coerente con la privacy del resto dell'app.
- Ripristinando una voce tornano anche i suoi collegamenti, se l'altra parte esiste ancora. Se la fonte è stata eliminata definitivamente nel frattempo, la scheda torna con «fonte non più disponibile».
- Le voci nel cestino non compaiono altrove: ricerche, elenchi, storia della casa, export, conteggi, suggerimenti dell'AI.

## 4. Comportamento per caso

### 4.1 Documento già usato
L'anteprima mostra di cosa è fonte (spese, oggetti, contatti, eventi della storia, condivisioni). **Default: va nel cestino solo il documento**; i dati confermati restano, con la fonte mostrata come «documento eliminato». Casella facoltativa, non spuntata: «elimina anche le schede create solo da questo documento e mai modificate». Le condivisioni del documento vengono revocate subito, con l'avviso che le copie già scaricate dal destinatario non si possono richiamare.

### 4.2 Oggetto, spesa, lavoro, attività, contatto
Elimina → cestino. Allo scadere: si rimuovono la scheda, i suoi collegamenti, i campi con provenienza e le voci della storia che la riguardano; nella storia di altre schede resta solo «elemento eliminato», senza nome. I documenti collegati **non** vengono eliminati.

### 4.3 Evento della storia della casa
Rimozione → cestino; allo scadere titolo e descrizione vengono cancellati, resta solo l'identificativo per l'idempotenza.

### 4.4 Analisi in corso
Eliminazione bloccata finché l'analisi non termina o non viene annullata. Un'analisi che termina dopo non può ricreare dati su un documento nel cestino o eliminato: controllo nella stessa transazione della conferma.

### 4.5 Casa intera (decisione del committente, 22/10)
- Solo il proprietario. Prima della conferma: inventario (documenti, schede, spese, membri, condivisioni) e proposta di scaricare l'export (JSON + ZIP già esistenti).
- Conferma rafforzata: digitare il nome della casa. Avviso: «L'eliminazione è definitiva e non potrai più accedere alla casa.» Il recupero **non viene menzionato all'utente** (decisione del committente): è una possibilità interna, usata solo se serve.
- L'informativa sulla privacy dichiara comunque i tempi di rimozione effettiva («i dati di una casa eliminata vengono rimossi dai sistemi entro 7 giorni e dalle copie di sicurezza entro 3 mesi»), senza parlare di recupero. Da far verificare a chi cura gli aspetti legali.
- Effetto immediato: casa invisibile e inaccessibile a tutti i membri, che vengono avvisati; condivisioni revocate; nessuna lettura, analisi o export possibile.
- **Lato server la casa resta conservata 7 giorni**, poi viene eliminata definitivamente (originali, schede, storie, analisi, condivisioni, contenuti dei membri in quella casa).
- **Recupero interno entro i 7 giorni**, solo se il proprietario lo chiede all'assistenza di sua iniziativa: eseguito da un operatore con uno strumento amministrativo dedicato, che verifica che la richiesta arrivi dall'indirizzo del proprietario e registra l'operazione. Nessun pulsante di recupero nell'app, nessun cestino delle case, nessuna menzione nell'interfaccia.
- Da definire prima del rilascio: procedura operativa dell'assistenza (chi risponde, entro quanto).

### 4.6 Account
Eliminazione dei contenuti personali in tutte le case. Le case di cui l'account è unico proprietario seguono §4.5; per case con altri proprietari si eliminano solo i contenuti propri. Sessioni e credenziali rimosse subito. Prima della conferma si propone l'export personale.

## 5. Dove stanno i dati personali (inventario da verificare in implementazione)

Oltre alle righe principali, il contenuto personale compare anche in:

- originali su disco (`storage-private`) e copie duplicate dello stesso file;
- output delle analisi (`ObjectOnboardingDraft.output`, analisi del lotto, job AI): estratti di testo, nomi, P.IVA, importi;
- provenienze e citazioni nei campi confermati (`sources`, `economicProvenance`, `ReceiptObjectField`);
- storie in JSON (`ActivityHistory`, `ExpenseHistory`, `ObjectEvent`, `EconomicWorkHistory`, storia della casa);
- registri delle richieste idempotenti (`*Request.response`);
- condivisioni: manifesti, anteprime, destinatari;
- ledger del budget AI: deve restare contabilmente coerente, ma senza contenuto;
- backup locali e copia cifrata su Drive;
- fornitore AI: i documenti già inviati ad Anthropic seguono la sua politica di conservazione dei dati API, da verificare e citare con la fonte nella UI. Dimora non può richiamarli e va dichiarato.

All'eliminazione definitiva si rimuove il contenuto e si conserva solo il minimo tecnico senza contenuto (identificativo, data, tipo dell'operazione, esito) per idempotenza, sicurezza e contabilità.

## 6. Backup: come evitare la ricomparsa

- **Registro delle eliminazioni** (tipo, identificativo, data; nessun contenuto): dopo qualsiasi ripristino la procedura lo riapplica prima di riaprire il servizio, così un backup vecchio non fa ricomparire dati eliminati. Il registro è incluso nei backup.
- **Ciclo delle copie**: ultime 4 copie verificate più una mensile per 3 mesi; le più vecchie vengono cancellate, compresa la copia su Drive.
- Testo per l'informativa: «I dati eliminati spariscono anche dalle copie di sicurezza entro 3 mesi».

## 7. Requisiti tecnici e verifiche

- Eliminazione automatica allo scadere del cestino (30 giorni) e della casa (7 giorni) eseguita da un'attività del server, ripetibile e idempotente; finché il server è spento l'eliminazione avviene alla riaccensione. Da dichiarare nella prova locale.
- Operazioni con chiave di idempotenza e versione; anteprima e conferma nella stessa transazione con blocco della casa; rimozione fisica dei file dopo il commit, con ripetizione sicura se fallisce.
- Test su dati sintetici isolati (DB temporaneo): fonti JSON e storie oltre alle chiavi esterne, analisi concorrenti, condivisioni revocate o scadute, letture/download/export concorrenti, errore di rimozione fisica, ripristino dal cestino con fonte mancante, restore di backup seguito dalla riapplicazione del registro.
- Dopo un'eliminazione definitiva di prova, ricerca automatica in tutte le tabelle (JSON inclusi) di nomi e valori del documento sintetico: zero risultati.

## 8. Ordine di realizzazione

1. Registro delle eliminazioni, riapplicazione dopo restore e ciclo delle copie di backup.
2. Cestino (modello dati, pagina, avviso con Annulla, scadenza automatica) con i documenti, incluso il documento già usato (§4.1) e le condivisioni.
3. Schede (§4.2) ed evento della storia (§4.3).
4. Casa (§4.5) con lo strumento amministrativo di recupero, poi account (§4.6).

## 9. Decisioni

Approvate dal committente il 22/10: cestino per casa di 30 giorni per tutti i contenuti; accesso dall'avviso dopo l'eliminazione e da un link discreto nella barra laterale; nessun cestino delle case; eliminazione della casa con avviso di irreversibilità, conservazione lato server per 7 giorni e recupero interno non comunicato all'utente.

Confermati anche: default del documento già usato (§4.1) e ciclo dei backup (4 copie + una mensile per 3 mesi).

Ancora aperti: indirizzo email dell'assistenza (da definire; le richieste di recupero arriveranno lì) e procedura di risposta; testo dell'informativa sui tempi di rimozione, da verificare con chi cura gli aspetti legali.
