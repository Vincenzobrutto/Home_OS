# Matrice degli scenari — flusso Documenti

**Copertura.** Combinazioni pairwise e casi ad alto rischio. **Non** è il prodotto cartesiano di tutte le varianti e non dichiara copertura esaustiva.

**Stato di ogni riga:**
- **OSS-H**: osservato sull'harness sintetico compilato dal codice del master. È il componente reale, con container finto e senza API.
- **COD**: dedotto dalla lettura del codice o del contratto.
- **DA PROVARE**: richiede l'app reale (5174), il backend o persone. **Nessuna riga è osservata nell'app reale**: l'accesso è stato negato nell'ambiente di questo audit.

**Prove esistenti citate:**
- test vitest in `src/document-intake/*.test.tsx` e `src/intake-integration/*.test.ts(x)`;
- collaudo Codex con PDF sintetici, dal report app;
- misure di questo audit (`CONSEGNA.md`).

Riferimenti abbreviati: `DIA` = `DocumentIntakeAssistant.tsx`, `RD` = `ReviewDialog.tsx`, `IP` = `IntakePage.tsx`, `DP` = `DocumentsPages.tsx`.

## 1. Conteggio delle azioni

**Cosa si conta:**
- ogni clic, tasto Invio su un controllo, scelta in un menu o compilazione di un campo vale 1;
- la scelta dei file nel selettore di sistema vale 1;
- attese e scorrimenti non si contano.

| Percorso | Inizio | Fine | Azioni | Fonte |
|---|---|---|---|---|
| 1 APE testuale, solo casa | Documenti, con la pagina caricata | Documenti, dopo l'esito | **11**: Carica documenti, file, consenso, Avvia analisi, Rivedi le proposte, Rivedi, Usa questa organizzazione, Controlla il riepilogo, casella, Conferma, Vai ai Documenti | COD (container) + OSS-H (componente) |
| Lotto misto da 7 file | Pagina lotto con i file già acquisiti | Schermata di esito | **22** | OSS-H |
| — file chiaro (APE, regolamento, CILA+agibilità preselezionate) | riga in proposte | dialogo chiuso, «Scelta pronta» | 2 per file | OSS-H |
| — schema `needs_choice`, solo casa | riga | «Scelta pronta» | 3 | OSS-H |
| — copia identica, riuso | riga | stato riuso | 3 | OSS-H |
| — scansione, manuale (1 contenuto, tipo, nome, casa) | riga | «Scelta pronta» | 6 | OSS-H |
| — riepilogo e conferma | proposte | esito | 3 | OSS-H |
| Tastiera, dialogo APE | focus iniziale «Chiudi» | focus su «Usa questa organizzazione» | 10 Tab | OSS-H |

**Posizione dell'azione principale** (prima di scorrere, in altezze di schermo):

| Azione | 1280 | 390 | 320 |
|---|---|---|---|
| «Rivedi le proposte» nel lotto | 0,4 | 1,7 | 2,4 |
| «Controlla il riepilogo» | 0,4 | 2,1 | 3,0 |

**Dialogo CILA (OSS-H):**

| Larghezza | Corpo del dialogo | Altezza visibile | La decisione inizia a | La destinazione a |
|---|---|---|---|---|
| 1280 | 1,0 altezze | 627 px | — | — |
| 390 | 1,8 altezze | 563 px | 400 px | 828 px |
| 320 | 3,9 altezze | 295 px | 483 px | 932 px |

## 2. Caricamento

| # | Situazione iniziale | Obiettivo | Azioni | Risultato visibile atteso | Rischio | Prova | Stato |
|---|---|---|---|---|---|---|---|
| C1 | Nessun lotto | Caricare 1 file | Carica documenti → selettore | Lotto con 1 riga «Caricamento…» → «Originale acquisito» | Percorso lungo per 1 file (R3) | Report app, test container | COD |
| C2 | Nessun lotto | Caricare 6 file con selezione multipla | Selettore con più file | 6 righe con stato indipendente, 2 upload alla volta | — | Collaudo Codex (4 PDF) | COD |
| C3 | Nessun lotto | Trascinare 6 file | Drag&drop sull'area | Come C2 | Il drop non filtra il MIME: lo controlla il server | `DIA:302-310` | COD / DA PROVARE |
| C4 | Lotto aperto | Aggiungere 2 file | + Aggiungi documenti → selettore | Ritorno al lotto, righe nuove, scelte precedenti intatte | Lotto completato «riaperto» senza che sia chiaro | Spec «Aggiunta progressiva», 8 test HTTP | COD |
| C5 | Selezione con 1 file da 25 MiB e 5 validi | Caricare i validi | Selettore | **Atteso:** 5 caricati e 1 escluso con il nome. **Attuale:** nulla caricato, messaggio generico | R7 | `IP:58` | COD |
| C6 | Selezione con 21 file | Caricare | Selettore | **Attuale:** tutta la selezione rifiutata | Nessuna indicazione su come dividere | `IP:58` | COD |
| C7 | Selezione con un file `.docx` (drag&drop) | Caricare gli altri | Drop | **Atteso:** solo quel file rifiutato | Il manifest intero potrebbe essere rifiutato (422) | Contratto B1 | DA PROVARE |
| C8 | Upload di un file fallito (rete) | Riprovare solo quello | Riprova questo file | Solo quella riga torna in caricamento | — | Test «upload fallito» | COD |
| C9 | Reload durante l'upload | Riprendere | Riapri `?lotto=` | Righe acquisite intatte; le incomplete chiedono di nuovo il file con un selettore anonimo | Riselezione del file sbagliato (R8) | `IP:44`, `IP:137` | DA PROVARE |
| C10 | Esito incerto della creazione del lotto | Non duplicare | Recupera il lotto | Stesso lotto, nessun doppione | Due avvisi sovrapposti (R8) | `IP:56`, `IP:117` | COD |
| C11 | Ruolo in sola lettura | Caricare | Documenti | Nessun «Carica documenti»; nota sul ruolo | — | `DP:93-104` | COD |
| C12 | Capability disattivata | Caricare | Ingresso | Banner «non disponibile», documenti consultabili | — | Test «sola lettura e capacità» | OSS-H (test) |

## 3. Analisi e proposta

| # | Situazione iniziale | Obiettivo | Azioni | Risultato visibile atteso | Rischio | Prova | Stato |
|---|---|---|---|---|---|---|---|
| A1 | Lotto acquisito, analisi non avviata | Vedere le proposte | Rivedi le proposte (salta l'analisi) | **Attuale:** righe «Originale acquisito», revisione manuale | Valore dell'assistente perso (R2) | `DIA:336-356`, `model.ts` `itemStatus` | COD |
| A2 | APE testuale chiaro | Proposta corretta | Consenso → Avvia → Rivedi | Titolo dal testo, APE pagine 1–8, raccolta Energia, fonte pagina 1 | — | Collaudo Codex | COD |
| A3 | CILA + agibilità in un PDF | Due contenuti, un originale | Rivedi → Usa | Due parti preselezionate, una sola sorgente | Preselezione accettata senza guardare le pagine | OSS-H, emendamento «Titolo e tipi proposti» | OSS-H |
| A4 | Visura agibilità «non costituisce certificazione» | Non proporla come certificato | Analisi | `agibility_record` «Visura agibilità (non certificato)» | Menzioni nella prosa | Test del parser (spec) | COD |
| A5 | PDF testuale di tipo ignoto | Classificarlo | Analisi → Rivedi | `ready` senza proposta + banner «il testo non identifica un tipo» | Banner nel container, lontano dalla riga | `IP:120` | COD |
| A6 | Scansione senza testo | Archiviarla | Rivedi → manuale | «Testo non leggibile», nessuna fonte, editor dei contenuti | 6 azioni (sezione 1) | OSS-H | OSS-H |
| A7 | Immagine JPEG | Archiviarla | Rivedi → manuale | «Formato non analizzabile» | — | Report app | COD |
| A8 | PDF di 30 pagine (oltre il parser) | Archiviarlo | Rivedi → manuale | Non supportato; limite spiegato nel pannello | Testo dei limiti solo nel pannello di analisi | `IP:130` | COD |
| A9 | PDF multiparte con categorie diverse e pagine dubbie | Correggere le pagine | Indica tu i contenuti → Pagine (facoltative) | Intervalli validati; pagine oltre il totale bloccate | Pagine chiuse in `details`, poco visibili | Test B4-2, `RD:93` | OSS-H (test) |
| A10 | Proposta errata (tipo sbagliato) | Cambiare tipo | Indica tu i contenuti → tipo | Parte manuale; nessuna fonte attribuita | La proposta è un elenco di caselle, non un tipo da cambiare | `RD:206-227` | COD |
| A11 | Proposta parziale (un contenuto mancante) | Aggiungerlo | Indica tu → Aggiungi un contenuto | Più parti conservate alla riapertura | — | Test B4-2 | OSS-H (test) |
| A12 | Ricevuta | Registrare la spesa | Rivedi → Apri nella ricevuta assistita | Nessuna spesa creata classificando | Due percorsi possibili per la stessa ricevuta | `RD:274-285` | COD |
| A13 | Analisi in corso, si esce e si rientra | Ritrovare le proposte | Lotti salvati → lotto | Polling ogni 1,5 s finché è in coda | Lotto da ritrovare per data | `IP:30`, `IP:139` | COD |

## 4. Copie e versioni

| # | Situazione iniziale | Obiettivo | Azioni | Risultato visibile atteso | Rischio | Prova | Stato |
|---|---|---|---|---|---|---|---|
| D1 | Copia di un documento senza organizzazione | Non duplicare | Rivedi → «Usa solo il riferimento» | «Originale riusato · organizzazione invariata» | L'utente si aspetta di averlo organizzato | `DIA:230`, emendamento «Riuso distinto» | OSS-H |
| D2 | Copia di un documento in «Altro» | Dare il tipo giusto | Rivedi → «Organizza il documento esistente» | Tipi proposti preselezionati, consenso alla sostituzione | Due radio con spiegazioni lunghe (R4) | `model.ts:283`, emendamento | COD |
| D3 | Copia di un documento già organizzato uguale | Nessun cambio | Organizza | «coincide: nessuna sostituzione» | — | Test B4-2 | OSS-H (test) |
| D4 | Copia di un documento organizzato diversamente | Scegliere | Organizza → consenso oppure Mantieni | Casella non preselezionata; salvataggio bloccato senza scelta | — | Test B4-1, B4-2 | OSS-H (test) |
| D5 | Stesso nome, contenuto diverso | Trattarlo come file nuovo | Upload | Nessuna copia segnalata (hash diverso) | L'utente crede di sostituire il vecchio: due documenti con lo stesso nome | Spec SHA256 | COD |
| D6 | Nuova versione di un documento (APE rinnovato) | Sostituire il vecchio | — | **Nessun percorso «nuova versione»**: diventa un documento nuovo | Due APE senza relazione | Spec «distinguere contenuto uguale da nuova versione» | DA PROVARE |
| D7 | Copia identica nella stessa selezione | Un solo originale | Upload | Una riga «Copia identica» | — | Collaudo Codex (copia riconosciuta) | COD |

## 5. Destinazione e dati confermati

| # | Situazione iniziale | Obiettivo | Azioni | Risultato visibile atteso | Rischio | Prova | Stato |
|---|---|---|---|---|---|---|---|
| T1 | Regolamento condominiale | Archiviarlo | Rivedi → Usa | Raccolta Condominio, «Solo io» | Credere che sia condiviso | Spec, `DIA:326` | OSS-H |
| T2 | Schema d'impianto, nessuna scheda | Solo casa | Rivedi → Solo alla casa | Nessuna preselezione; scelta obbligatoria | — | OSS-H (3 azioni) | OSS-H |
| T3 | Schema, una scheda candidata | Collegarlo | Mostra le schede → scheda | Destinazione con versione attesa | — | Test «schema ambiguo» | OSS-H (test) |
| T4 | Più schede candidate | Scegliere quella giusta | Mostra / Mostra altre | Elenco paginato | Nomi simili («Caldaia» in due stanze) | `RD:259-270` | COD |
| T5 | Scheda cancellata dopo la scelta | Non collegare | Conferma | Esito «Non applicato» per quel file | Messaggio generico «dati o permessi cambiati» | `IP:101` | COD |
| T6 | Organizzazione confermata e nuova proposta diversa | Non perdere dati | Rivedi | Confronto, consenso esplicito | — | Test B4-1 | OSS-H (test) |
| T7 | Consenso dato, poi un altro dispositivo cambia l'organizzazione | Nessuna sovrascrittura silenziosa | Salva | Consenso decaduto, 409 mostrato | — | Test B4-3 | OSS-H (test) |

## 6. Conferma, ripresa, errori e permessi

| # | Situazione iniziale | Obiettivo | Azioni | Risultato visibile atteso | Rischio | Prova | Stato |
|---|---|---|---|---|---|---|---|
| F1 | Tutti i file con scelta pronta | Confermare tutto | Riepilogo → casella → Conferma | Esito per file | R1: scelte salvate ma mai confermate | OSS-H | OSS-H |
| F2 | 3 scelte pronte su 7 | Conferma parziale | Escludere 1, Conferma | 2 «Organizzato», 5 da rivedere | — | Test «conferma parziale» | OSS-H (test) |
| F3 | Rimando di un file | Decidere dopo | Decidi più avanti | «Rimandato», fuori dal riepilogo | Ritrovarlo dopo: solo dal lotto | `model.ts` `buildSummary` | COD |
| F4 | Chiusura del dialogo senza salvare | Annullare | Chiudi senza modificare / Esc | Bozza conservata nella sessione, nessuna scrittura | La bozza si perde con il reload | Test «chiudere e riaprire» | OSS-H (test) |
| F5 | Conferma con risposta persa | Non duplicare | Verifica l'esito | Stesso payload, nessun reinvio | Due avvisi (R8) | Test B4-3 e «esito incerto» | OSS-H (test) |
| F6 | Conferma parzialmente registrata | Completare | Verifica l'esito | Il resto viene ripreso con la stessa chiave | — | `IP:96-100` | COD |
| F7 | Conflitto di versione del lotto | Rileggere | Conferma | Rifiuto con la scelta conservata | — | `IP:19` | COD |
| F8 | Fonte revocata a dialogo aperto | Nessun dato in cache | — | Dialogo chiuso, «Non più disponibile» | — | Test B4-2 | OSS-H (test) |
| F9 | Cambio di account o casa con risposta tardiva | Nessuna fuga di dati | — | Rimontaggio, nessun esito vecchio | — | Test di contesto | OSS-H (test) |
| F10 | Ruolo che può vedere ma non decidere | Consultare | Proposte | Banner del ruolo, nessun salvataggio | — | `DIA:429` | COD |
| F11 | Documenti confermati, si vuole correggere il tipo | Correggere senza ricaricare | Documenti → dettaglio | **Attuale:** nessuna azione; serve ritrovare il lotto | R6 | `DocumentDetailPage.tsx:160` | COD |
| F12 | Dopo la conferma | Verificare la destinazione | Vai ai Documenti → filtro Energia | Documento nella raccolta | Il filtro non è preimpostato sulla raccolta appena usata | Collaudo Codex (filtro Energia) | COD |
| F13 | Documenti in «Da organizzare» | Organizzarli | Filtro Da organizzare | **Attuale:** elenco senza azione | R6 | Contratto B2 riga 76, `DP` | COD |

## 7. Accessibilità e mobile

| # | Situazione iniziale | Obiettivo | Azioni | Risultato visibile atteso | Rischio | Prova | Stato |
|---|---|---|---|---|---|---|---|
| M1 | 320 / 390 / 1280 | Nessun overflow | Lotto, proposte, dialogo | Nessuno scorrimento orizzontale | — | Misura di questo audit | OSS-H |
| M2 | 320 | Decidere un file | Dialogo | Decisione visibile presto | Decisione a 483 px in una finestra alta 295 px (R5) | Misura di questo audit | OSS-H |
| M3 | Solo tastiera | Rivedere e salvare | Tab / Invio / Esc | Focus confinato, ritorno alla riga | 10 Tab per arrivare al salvataggio | Misura di questo audit | OSS-H |
| M4 | Stati | Comprensibili senza colore | — | Badge con testo | — | `StatusBadge` | COD |
| M5 | Originale durante la correzione | Consultarlo | Fonte · pagina N / Apri l'originale | Anteprima nel dialogo; su mobile «Apri l'originale» scarica il file | Sul telefono lo scaricamento lascia il flusso | `IP:132-133` | DA PROVARE |
| M6 | Lettore di schermo | Capire lo stato del caricamento | — | `role=status` / `alert` | Annunci multipli in caso di errore | `IP:119` | DA PROVARE |

## Lacune dichiarate

- Nessuna verifica sull'app reale, sul backend, sul DB o sui file fisici in questo audit.
- C7, C9, D6, M5 e M6 richiedono l'app reale.
- I tempi di attesa dell'analisi locale non sono stati misurati.
- Nessun test con persone: gli effetti sul comportamento sono ipotesi (vedi `REPORT.md`).
- Le combinazioni con più varianti contemporanee (per esempio copia + multiparte + candidato + conflitto) sono coperte solo a coppie.
