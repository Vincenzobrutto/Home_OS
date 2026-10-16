# Home — backlog di aggiunte dalla proposition · 16/10/2026

Proposta Claude, condivisa con il committente nella sessione del 16/10. Serve a Codex per pianificare lo sviluppo. **Non è un contratto né una specifica:** Codex stima, arbitra e decide l'ordine definitivo.

## Fonti

**Documenti Drive, cartella «Dimora»:**
- `Dimora_Master_Document` (v4): §1–3, §6–8, §10, §17, §21, Appendice B, Annex §2–3, §10, §14–15;
- `Dimora – avanzamento Project Work - VB 261010-3.pptx`;
- `Dimora_spunti_previsioni_e_valore_finanziario.docx`;
- `TEAM 3 - BMeP - APPUNTI DI LAVORO - GG 261010.docx`.

**Confronto con il prodotto:** baseline `42a4b47`; `docs/v5/implementation-decisions.md`; `docs/v5/home-economy-module.md`; `docs/v5/domain-model.md`.

## Decisioni del committente (16/10)

- **Escluse per ora:** BL-05 (esportazione .ics), BL-06 («Cosa manca nella mia casa»), BL-11 (pacchetto di consegna a chi compra).
- **Eventi del condominio:** arriveranno con la vista condominio. Non vanno nella Home.
- **Da fare a seguire, perché aggiungono valore:**
  - scadenze normative regionali;
  - consigli e incentivi, collegati alle scadenze perché anch'essi localizzati;
  - previsioni, budget e accantonamenti;
  - valore dell'immobile.
- **Ancora aperte:** il momento di BL-03 rispetto ad Agenzie e l'inclusione di BL-07 nel ciclo Home. Il committente non ha escluso nessuna delle due.

## Principi validi per tutte le voci

Derivano da Master, Appendice B e dalle decisioni V5.

- **L'AI propone, l'utente conferma.** Dato dichiarato, documentato e verificato restano distinguibili.
- **Nessuna dichiarazione indebita.** Mai «certificato», «conforme» o «obbligatorio» senza fonte versionata e un soggetto abilitato.
- **Privacy di default:** oggetti, attività e costi personali restano visibili solo a chi li ha creati, salvo condivisione esplicita.
- **Sistema leggero:** nessuna nuova sezione principale, si resta nella navigazione Casa / Attività / Documenti / Spese.
- **Fonte e data visibili** su ogni numero, scadenza o consiglio. Le informazioni mancanti vanno dichiarate, non dedotte.

## Fase 0 — Prerequisiti del pilota reale (prima delle funzionalità)

Da `home-economy-module.md`, «Prima di pilota esterno»:

| Prerequisito | Stato da verificare |
|---|---|
| Backup e ripristino | Codex lo sta preparando |
| Recupero account (password dimenticata) | Da verificare |
| Controlli su storage e caricamenti | Da verificare |
| Conservazione dei dati ed esportazione | L'export ZIP dei documenti esiste: va esteso agli altri dati? |
| Protezione dei documenti sensibili | Da verificare |
| Qualità dell'estrazione AI misurata | Da verificare |

## Fase 1 — Piccole, alto valore

### BL-04 · Scatta una foto
- **Cosa.** Su telefono, «Carica documento» offre anche la fotocamera. È la promessa «Tu fotografi, Dimora legge, tu confermi» della presentazione.
- **Perché.** Riduce lo sforzo iniziale, il problema di attivazione indicato nel Master §4.
- **Accettazione.**
  - Su dispositivo mobile si può scattare e caricare una foto JPEG senza passare dalla galleria.
  - Si applicano gli stessi limiti di formato e dimensione e la stessa visibilità iniziale «Solo io».
  - Nessuna analisi parte automaticamente.
- **Effort indicativo.** S, solo frontend.

### BL-01 · Promemoria che si ripete
- **Cosa.** Quando l'utente completa un'attività, Dimora propone di creare la successiva (scelte rapide «tra 6 / 12 / 24 mesi» oppure una data libera). L'utente conferma o ignora.
- **Perché.** Rafforza la persistenza (Master §17) senza disciplina manuale e senza notifiche. Oggi H1 esclude ricorrenze (`implementation-decisions.md`).
- **Accettazione.**
  - La proposta compare solo dopo il completamento.
  - La nuova attività eredita titolo, descrizione e collegamento all'oggetto o alla caldaia, modificabili prima della conferma.
  - Ignorare la proposta non crea nulla.
  - Nella storia delle due attività resta visibile il legame.
  - Nessun testo dice «obbligo» o «scadenza di legge».
- **Effort indicativo.** S–M. Valutare se basta il frontend (crea una nuova attività) o se serve un riferimento all'attività precedente.

### BL-02 · Garanzie
- **Cosa.** Sulla scheda di un oggetto:
  - data d'acquisto e durata o scadenza della garanzia, facoltative;
  - documento di supporto collegabile;
  - proposta di un promemoria prima della scadenza.

  In seguito il dato può arrivare dall'analisi di una fattura come dato proposto da confermare.
- **Perché.** Il «ritrovo la garanzia quando serve» degli spunti §5 è un beneficio concreto e facile da comunicare. Oggi non esiste nessun campo garanzia.
- **Accettazione.**
  - Il dato è marcato dichiarato oppure documentato, se c'è un documento collegato.
  - La scheda mostra «Garanzia fino al …» e nessuna copertura presunta.
  - Il promemoria è una proposta confermata dall'utente.
  - Privacy identica a quella dell'oggetto.
- **Effort indicativo.** M: estensione degli oggetti nel contratto e nel backend.

## Fase 2 — La promessa centrale

### BL-03 · Storia della casa
- **Cosa.** Una cronologia unica della casa (Master §6, «Property Timeline»), accessibile da Casa. Riunisce eventi già presenti:
  - lavori;
  - attività completate;
  - oggetti aggiunti o sostituiti;
  - documenti marcati come rilevanti;
  - eventi confermati da un'analisi.

  Più **eventi passati inseriti a mano** (per esempio «2020 — bagno rifatto»), con data, descrizione e documenti collegati.
- **Perché.** È la differenza fra archivio e storia («questa è la storia della tua casa e da dove arrivano le informazioni»). Oggi esistono solo storie per oggetto e per attività.
- **Accettazione.**
  - Ogni voce mostra data dell'evento, fonte (dichiarato o documento) e collegamenti.
  - La data dell'evento è distinta da quella di caricamento.
  - Le voci personali sono visibili solo a chi le ha create.
  - Filtro per anno e per oggetto.
  - Nessun registro tecnico: entrano solo eventi significativi, non ogni modifica.
  - Il ritorno dalla voce alla risorsa mantiene il contesto.
- **Effort indicativo.** M–L: nuova lettura aggregata lato server, più l'entità «evento manuale».
- **Aperto.** Il committente deve decidere se va prima o dopo Agenzie.

## Fase 3 — Dopo, con decisioni o prerequisiti

### BL-07 · Persone della casa
- **Cosa.** Invitare familiari e coinquilini con ruolo membro o sola lettura. I ruoli esistono già nel server, ma la UI dice «gestione degli accessi non disponibile».
- **Prerequisiti.** Progettazione di inviti, revoca e privacy al livello della C1.
- **Accettazione.**
  - Nessun dato personale di un membro diventa visibile ad altri.
  - Revoca immediata.
  - Il ruolo e i permessi sono spiegati prima della conferma.
- **Aperto.** Il committente deve decidere se rientra nel ciclo Home.

### BL-08 · Riepilogo via email delle scadenze
- **Cosa.** Riepilogo periodico facoltativo delle scadenze personali. Con BL-05 escluso, è l'unico canale «push» previsto.
- **Prerequisiti.** Fornitore email, consenso esplicito, preferenze e disiscrizione; nessun dato sensibile nel testo dell'email.
- **Effort indicativo.** M.

### BL-09 · Impegni e spese ricorrenti
- **Cosa.** Rate, polizze e condominio come regole ricorrenti. È già pianificato come **S2 «Impegni e ricorrenze»** in `home-economy-module.md` §6.
- **Nota.** È la base dati necessaria per BL-15.

### BL-10 · Professionista collegato all'intervento
- **Cosa.** Versione minima: nome e recapito facoltativi su lavoro e spesa, per ritrovare insieme intervento, fattura, garanzia e professionista (spunti §6).
- **Nota.** La rubrica completa resta rinviata. Il committente decide se questa versione minima basta.

## Fase 4 — Da fare a seguire (approvate dal committente come valore)

Sono funzioni ad alto valore ma con rischi di dichiarazioni eccessive e di manutenzione. Per ognuna serve **prima una specifica di progettazione**, e solo dopo lo sviluppo.

### BL-12 · Posizione strutturata della casa (prerequisito di BL-13 e BL-14)
- **Cosa.** Regione, provincia e comune strutturati, in aggiunta all'indirizzo libero di oggi. Facoltativi, con dichiarazione dell'utente.
- **Perché.** Scadenze e incentivi dipendono dal territorio.
- **Accettazione.**
  - Le case esistenti non vengono modificate retroattivamente.
  - Il dato è dichiarato, non verificato.
  - Senza posizione, le funzioni localizzate spiegano cosa manca e non deducono nulla.

### BL-13 · Scadenze normative localizzate
- **Cosa.** Scadenze applicabili alla specifica casa (Master §8, «Conformità / scadenzario»), per esempio il controllo dell'impianto termico secondo le regole del territorio. Si basano su impianti noti, posizione (BL-12) e un catalogo di regole versionato.
- **Prerequisiti.**
  - Catalogo regole con fonte, territorio, periodo di validità e data di aggiornamento.
  - Responsabile della manutenzione del catalogo.
  - Revisione legale dei testi.
- **Guardrail** (Appendice B):
  - nessuna scadenza codificata nel software;
  - la scadenza è una **proposta** con fonte, che l'utente trasforma in promemoria;
  - testo del tipo «secondo [fonte, aggiornata al …], per questo tipo di impianto…», mai «sei obbligato»;
  - nessuna dichiarazione di conformità.
- **Accettazione.**
  - Ogni scadenza proposta mostra la regola, la versione e la data di aggiornamento.
  - Cambiare il catalogo non modifica i promemoria già confermati.
  - Se mancano dati, lo dice.

### BL-14 · Consigli e incentivi localizzati (collegati a BL-13)
- **Cosa.** Segnalazioni informative contestuali, come l'esempio del Master: caldaia tradizionale e incentivo regionale per la condensazione. Usano gli stessi dati di BL-12 e BL-13 e un catalogo di opportunità.
- **Prerequisiti.** Stesso catalogo versionato, con fonte, territorio, validità e data di aggiornamento. Principio di indipendenza delle raccomandazioni da accordi commerciali (Master §20).
- **Guardrail.**
  - Mai garantire esistenza, ammissibilità o convenienza.
  - Il consiglio può essere ignorato senza conseguenze.
  - Decisione finale con verifica professionale quando serve.
- **Accettazione.**
  - Ogni consiglio mostra fonte, territorio, periodo e data di aggiornamento, e scompare o si segnala come scaduto a fine validità.
  - Nessun consiglio senza dati sufficienti.

### BL-15 · Previsioni, budget e accantonamenti
- **Cosa.** Il «budget prospettico della casa» degli spunti §3, con tre categorie distinte:
  1. uscite programmate, con importo e data documentati;
  2. spese ricorrenti stimate, con fonte, ipotesi e intervallo;
  3. accantonamenti suggeriti, come riserva prudenziale separata dalle somme da pagare.
- **Prerequisiti.** BL-09 (S2, impegni e ricorrenze) e storico spese sufficiente.
- **Guardrail.**
  - L'accantonamento non è una previsione di guasto.
  - Nessun pagamento dedotto.
  - Il prospetto è utile anche con dati parziali e mostra le lacune.
  - Ogni numero ha fonte e ipotesi visibili.
- **Accettazione.**
  - Le tre categorie sono sempre separate nei totali.
  - Cambiare un'ipotesi ricalcola il prospetto senza riscrivere lo storico.

### BL-16 · Valore indicativo dell'immobile
- **Cosa.** Un intervallo indicativo di valore e, facoltativamente, il patrimonio netto (valore meno debito residuo del mutuo, se dichiarato). Spunti §1.
- **Prerequisiti.**
  - Fonte di mercato adeguata e citabile, per esempio le quotazioni pubbliche per zona.
  - Dati della casa: superficie, tipologia, zona.
  - Revisione legale dei testi.
- **Guardrail** (Master Annex §10, prima in PARK):
  - **intervallo, non un numero**, con fonte e data;
  - non è una perizia;
  - le ristrutturazioni non aumentano automaticamente il valore del loro costo;
  - nessun punteggio unico della casa.
- **Accettazione.**
  - Il valore mostra intervallo, fonte, zona, data e dati usati.
  - Senza dati sufficienti non viene mostrato.
  - Debito e valore restano personali e privati.

## Escluse o fuori dalla Home

| Voce | Esito |
|---|---|
| BL-05 Esportazione promemoria .ics | Escluso per ora (committente 16/10) |
| BL-06 «Cosa manca nella mia casa» (checklist, tipo documento) | Escluso per ora (committente 16/10) |
| BL-11 Pacchetto di consegna a chi compra | Escluso per ora (committente 16/10) |
| Passaggio di proprietà completo | Non pianificato. Le domande dell'Annex §14 restano aperte |
| Eventi del condominio nella storia della casa | Con la futura vista condominio (Dimora Admin) |
| Marketplace e tecnici, avvisi meteo, modelli per unità simili | Fuori dal modello attuale |
| Punteggio unico della casa | Escluso dal Master |

## Ordine proposto

1. Fase 0: prerequisiti del pilota.
2. BL-04 → BL-01 → BL-02.
3. BL-03, in un momento da decidere rispetto ad Agenzie.
4. BL-07, BL-08, BL-09, BL-10, secondo le decisioni del committente.
5. BL-12, che abilita BL-13 e BL-14 (progettazione congiunta).
6. BL-15, dopo BL-09.
7. BL-16.

## Nota fuori backlog

Negli appunti del Team 3 compare «Cambiare nome alla start-up» e nel benchmark c'è un concorrente italiano chiamato **«didimora»**. Non riguarda lo sviluppo, ma va chiarito prima di consolidare claim e materiali di comunicazione.
