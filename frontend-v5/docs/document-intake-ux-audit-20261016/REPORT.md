# Audit UX del flusso Documenti — rilievi prioritari (Claude)

Audit indipendente: l'audit di Codex (`docs/v5/document-intake-ux-audit-codex-20261016.md`, commit `2a493c2`) **non è stato letto**.

**Punto di vista:** un proprietario medio che vuole «mettere in ordine i documenti» senza conoscere termini tecnici.

**Metodo:**
- Lettura del codice corrente del master (`Home_OS`, branch `dev/dimora-v5-local-20261013`).
- Misure sull'harness sintetico compilato da quel codice (vedi `CONSEGNA.md`).
- Griglia della skill CRO (chiarezza della promessa, gerarchia delle azioni, attriti, errori, mobile), adattata a un flusso interno all'app: l'obiettivo di «conversione» qui è **documento organizzato**, non registrazione.

**Legenda dell'evidenza:**
- **[codice]** fatto letto nel sorgente, con riferimento;
- **[harness]** misurato nel browser sull'harness sintetico. È il componente reale, ma senza il container e senza API;
- **[ipotesi]** effetto sull'utente dedotto, da verificare con persone reali.

**Limite principale:** l'app reale su 5174 **non è stata aperta** (permesso negato nell'ambiente). Nessun rilievo è «osservato nell'app reale».

Percorsi abbreviati:
- `DIA` = `frontend-v5/src/document-intake/DocumentIntakeAssistant.tsx`;
- `RD` = `…/ReviewDialog.tsx`;
- `IP` = `frontend-v5/src/intake-integration/IntakePage.tsx`;
- `DP` = `frontend-v5/src/routes/DocumentsPages.tsx`.

---

## R1 — «Usa questa organizzazione» non organizza: servono due conferme distinte · Gravità ALTA

**Fatti [codice]:**
- Nel dialogo il pulsante principale è «Usa questa organizzazione» (`RD:299-300`), ma salva solo una *decisione*: lo stato diventa «Scelta pronta» (`model.ts` `STATUS_LABEL.saved`).
- L'organizzazione si applica solo dopo un secondo passaggio: «Controlla il riepilogo →», poi la casella «Ho controllato…», poi «Conferma le scelte» (`DIA:398-411`, `DIA:448`).
- **[harness]** «Controlla il riepilogo» sta in fondo alla pagina proposte: a **2,1 schermate** a 390 px e a **3 schermate** a 320 px.

**Impatto [ipotesi]:** il verbo «Usa» suggerisce che la cosa sia fatta. Un utente che chiude dopo aver rivisto tutti i file lascia i documenti **non organizzati**, perché in Documenti restano in «Da organizzare», senza alcun avviso. È il punto di abbandono più probabile del flusso e contraddice l'aspettativa «ho finito».

## R2 — L'analisi non parte da sola e il passaggio si salta facilmente · Gravità ALTA

**Fatti [codice]:**
- Dopo il caricamento, per avere le proposte bisogna spuntare «Autorizzo l'analisi dei N file indicati» e poi premere «Avvia l'analisi» (`DIA:459-480`).
- Il motore è locale, gratuito e non trasmette nulla: lo dice il testo del container (`IP:130`).
- Il pannello sta nella colonna laterale. Su mobile finisce **dopo** l'elenco dei file e subito prima di «Rivedi le proposte →» (`DIA:350-356`).
- Se l'utente preme «Rivedi le proposte» senza avviare l'analisi, tutti i file risultano «Originale acquisito» senza proposta e la revisione diventa manuale.
- **[harness]** «Rivedi le proposte» compare a 1,7 schermate (390 px) e a 2,4 schermate (320 px) dall'inizio della pagina del lotto.

**Impatto [ipotesi]:** il consenso è una garanzia giusta per un futuro motore esterno a pagamento. Per il motore locale è invece un attrito che non protegge nulla. Il pulsante principale («Rivedi le proposte») porta avanti anche quando manca il passaggio che produce il valore. Chi lo salta compila tutto a mano e conclude che «l'assistente non funziona».

## R3 — Organizzare un solo documento costa 11 interazioni e 5 schermate · Gravità ALTA

**Fatti:**
- Esiste un solo ingresso, «Carica documenti» (`DP:95`, report app «Unico ingresso documentale»).
- Conteggio **[codice + harness]** per un singolo APE testuale, da Documenti fino al ritorno in Documenti:

  | Passo | Interazioni |
  |---|---|
  | Carica documenti | 1 |
  | Scelta del file | 1 |
  | Consenso e avvio dell'analisi | 2 |
  | Rivedi le proposte | 1 |
  | Rivedi e Usa questa organizzazione | 2 |
  | Riepilogo, casella e Conferma | 3 |
  | Vai ai Documenti | 1 |
  | **Totale** | **11** |

- Le schermate attraversate sono 5: ingresso, lotto, proposte con dialogo, riepilogo, esito.
- **[harness]** Per il lotto misto di 7 file, dal lotto all'esito, servono **22 clic**: 2 per ogni file chiaro, 3 per un file da scegliere, 3 per la copia, 6 per la scansione manuale, più 1 per entrare e 3 per confermare.

**Impatto [ipotesi]:** il flusso è pensato per 10–20 file, ma è anche l'**unico** modo di caricare un documento. Il caso più frequente, «ho appena ricevuto un PDF», paga il costo completo del percorso a lotti.

## R4 — Linguaggio da sistema, non da proprietario · Gravità MEDIA

**Fatti [codice]:** termini visibili all'utente:
- «lotto», «Lotti salvati», «Riapri il lotto dal server» (`IP:118`, `IP:138`);
- «Originale acquisito»;
- «Usa solo il riferimento all'originale esistente» (`RD:191`);
- «Riorganizza senza ricaricare» (`DIA:238`);
- «Nuovi oggetti / spese 0 / 0» (`DIA:394`);
- «organizzazione», «scheda», «raccolta», «Esito non noto».

Le spiegazioni sono accurate, ma lunghe e piene di negazioni: per esempio «Non applica il titolo o la categoria proposti. L'organizzazione esistente resta invariata, anche se è "Altro documento". Nessuna seconda copia, nessuna eliminazione.»

**Impatto [ipotesi]:** l'utente deve capire il modello interno (originale, decisione, conferma, organizzazione) prima di poter agire. Le rassicurazioni giuste («resta privato», «non crea spese») sono ripetute ovunque e perdono forza.

## R5 — Su mobile la decisione è sotto l'anteprima · Gravità MEDIA

**Fatti [harness, dialogo CILA]:**

| Larghezza | Altezza visibile del corpo | Contenuto | Primo controllo della decisione | Scelta «Dove va collegato?» |
|---|---|---|---|---|
| 390 px | 563 px | 1,8 altezze | a 400 px | a 828 px |
| 320 px | 295 px | 3,9 altezze | a 483 px | a 932 px |

- Il pie' con «Chiudi senza modificare / Decidi più avanti / Usa questa organizzazione» occupa circa **un terzo** dello schermo a 320 px.
- Ordine dei contenuti (`RD:158-178`): anteprima, estratti delle fonti, «Apri l'originale», poi la proposta.

**Impatto [ipotesi]:** su un telefono piccolo, per ogni file si scorre una finestra ridotta per arrivare alla scelta. Il controllo dell'originale è prezioso, ma qui precede sempre la decisione invece di accompagnarla.

## R6 — Correggere un documento già organizzato non si fa da Documenti · Gravità MEDIA

**Fatti [codice]:**
- Il dettaglio documento mostra «Organizzazione personale» e le parti, ma non offre azioni per cambiarle (`DocumentDetailPage.tsx:160-162`).
- La raccolta «Da organizzare» include i documenti mai organizzati (contratto B2, riga 76), ma in Documenti non c'è un'azione «Organizza» sui risultati.
- La correzione esiste solo dentro un lotto: riga confermata, poi «Riorganizza senza ricaricare», che prepara un nuovo lotto (`DIA:238`, `IP:75-85`). L'utente deve quindi ritrovare il lotto giusto in «Lotti salvati», un elenco di date e numeri di file (`IP:139`).

**Impatto [ipotesi]:** il filtro «Da organizzare» mostra un problema senza offrire il rimedio. Un errore di tipo, come la visura riusata nel caso reale del committente, richiede di conoscere la storia del lotto.

## R7 — Un file fuori limite blocca tutta la selezione · Gravità MEDIA

**Fatti [codice]:**
- `IP:58`: se **un** file supera 20 MiB, o è vuoto, o la selezione supera 20 file o 200 MiB, l'intera selezione viene scartata con un messaggio generico: «Scegli fino a 20 file, 20 MiB per file e 200 MiB complessivi.»
- Il messaggio non dice quale file è il problema.
- La specifica chiede che «un errore non ripete l'intero lotto».

**Impatto [ipotesi]:** chi trascina 12 PDF con una scansione pesante non carica nulla e deve indovinare quale togliere. Lo stesso vale, da verificare, per un MIME rifiutato dal server sul manifest.

## R8 — Recupero da esiti incerti e ricaricamento: messaggi doppi e passi oscuri · Gravità MEDIA

**Fatti [codice]:**
- **Avvisi sovrapposti:** in caso di esito incerto il container mostra «Controlla l'esito» e un pulsante che ricarica l'intera pagina, «Riapri il lotto dal server» (`IP:117-118`). Il componente mostra a sua volta «Esito non confermato» con «Verifica l'esito» (`DIA:484-494`, `RD:309-323`). Sono due avvisi e due azioni diverse per lo stesso evento.
- **File da riselezionare:** dopo un ricaricamento i file non ancora acquisiti vanno scelti di nuovo. «Riprova questo file» apre un selettore nascosto, «Originale da ricaricare» (`IP:44`, `IP:137`), che non mostra quale file aspetta.
- **Elemento dimostrativo:** quando non c'è un lotto, la pagina reale mostra «PDF sintetici per provare il percorso» con i link di download (`IP:121`). È un elemento dimostrativo nel prodotto.

**Impatto [ipotesi]:**
- Nelle situazioni di stress l'utente non sa quale pulsante premere.
- Può riselezionare il file sbagliato: se il server lo accetti va verificato, vedi la matrice.
- Un proprietario vede file di esempio che non c'entrano con la sua casa.

---

## Cosa funziona e va conservato

Fatti da codice e harness:
- **Stati per file con testo.** Gli stati non sono affidati al solo colore (`StatusBadge`), i filtri del lotto hanno conteggi, il passo corrente è indicato con `aria-current`.
- **Nessuna scrittura implicita.** Nessun oggetto o costo implicito, nessuna condivisione dovuta a «Condominio», una sola sorgente per i PDF multiparte con pagine come riferimento.
- **Conflitti espliciti.** Il conflitto con dati confermati è esplicito e non preselezionato; le copie identiche sono distinte dalla nuova versione.
- **Dialogo accessibile.** Focus iniziale, Tab confinato, Esc e ritorno del focus. **[harness]** 10 Tab dal focus iniziale a «Usa questa organizzazione».
- **Layout.** Nessun overflow orizzontale a 320, 390 e 1280 px.
- **Esiti incerti** mai reinviati da soli, e conferma parziale con esito per file.
- **Fonti con pagina ed estratto,** consultabili durante la scelta.

## Fatti e ipotesi in sintesi

- I numeri di R1, R2, R3 e R5 sono misurati sull'harness o contati dal codice.
- Gli effetti sul comportamento («abbandona», «non capisce») sono **ipotesi**. Si verificano con 5 proprietari che organizzano 1 PDF e poi 6 PDF sintetici, misurando quanti arrivano a «Organizzato» senza aiuto e in quanto tempo.
