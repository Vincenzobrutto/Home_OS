# Revisione UX — Economia della casa e fondazione ambienti/oggetti (G1)

14 ottobre 2026. Autore: Claude Code (frontend), su incarico autorizzato dal committente e coordinato da Codex.

Base:
- checkout `Dimora-V5-Claude` `760804f`;
- in sola lettura dal master: `docs/v5/home-economy-module.md` (la «specifica»), `expenses-api-contract.md` e `h3-integration-review.md`;
- il codice frontend H3a integrato nel master (`a3f7f32`). Rispetto al mio checkout cambiano solo il testo del 503 e la scelta di anni storici fatti da Codex.

**Cosa non è questo documento.** È una revisione documentale. Non è un contratto, non contiene nomi REST/DTO da implementare e non descrive funzioni attive. Nessun browser usato: i rilievi «verificati sul codice» seguono il percorso del codice e **non sono stati riprodotti**. Nessuna dichiarazione WCAG.

La specifica prevale sulla mia proposta H3 notturna (`cfdd0b3`, ora storica). H3a è runtime reale integrato.

---

## 1. Valutazione della specifica

Giudizio complessivo: impostazione solida e onesta. Separa il registrato dal futuro e non promette il «costo totale della casa». Rifiuta percentuali e stime senza base. Mantiene H3a come fatto canonico. I punti sotto riguardano la comprensibilità per un utente su telefono e la coerenza con le parole già presenti nel runtime.

### 1.1 Sostenute / In programma / Per oggetto

- **Sostenute.** Buona vista iniziale: chi ha solo lo storico non vede un futuro vuoto (§2). Il runtime H3a però dice «Costi registrati da te» e la specifica vieta «uscite effettive» (§3).
  - Suggerimento: etichetta di scheda «Sostenute», sottotitolo costante «Costi registrati da te, non verificati con la banca».
  - Così il termine non suggerisce una prova di pagamento.
- **In programma.** Collide con un'etichetta già in uso. Nel runtime H1 «In programma» è uno stato temporale delle attività (`DUE_LABEL.upcoming`, `src/lib/activities.ts`), e Casa mostra già «Le tue scadenze» (H1).
  - La specifica stessa chiama il calendario «Impegni noti» (§3).
  - Proposta: scheda «Impegni». In Casa, riquadro «Prossimi impegni» separato da «Le tue scadenze». Vedi criticità K4.
- **Per oggetto e lavoro.** Chiara se resta una lettura dei costi esistenti con filtro per ambiente, senza contabilità della stanza (§2, §5).
  - Va però deciso come un impianto collegato a più ambienti compare nei filtri, senza somme per ambiente (K6).
  - Va deciso come compaiono i lavori su più oggetti (K10).
  - Finché G1 e S1 non sono attivi, la scheda non va mostrata nel runtime nemmeno disattivata: le funzioni future stanno nei documenti.

### 1.2 Categorie

- **Catalogo** (§3): comprensibile e abbastanza corto per un selettore su telefono (13 voci).
- **Rischio**: «riparazione/lavori» e «manutenzione» si sovrappongono nella percezione dell'utente.
  - Proposta: un aiuto di una riga sotto ciascuna voce nel selettore, per esempio «Manutenzione: controlli e interventi periodici» e «Riparazione/lavori: guasti e opere straordinarie».
  - Senza regole automatiche.
- **Registrazioni H3a «Non classificata»**: corretto non attribuirle automaticamente. In S1 serve un'azione di massa? Non la proporrei in S1: basta un filtro «Non classificate» e la modifica singola con storia. La classificazione di massa è un incremento a parte, perché va annullabile.
- **Raggruppamenti gestione / lavori-acquisti / finanziamento**: utili come tre totali letti separatamente. Mai un «totale di tutto» che includa la rata del mutuo (§3).
  - Proposta: il finanziamento in un riquadro a sé con la dicitura «Rata intera dichiarata, non è un costo di gestione».

### 1.3 Natura, fonte e pagamento separati (§4)

Corretto e necessario. Per la UI raccomando:
- **Tre informazioni, tre posizioni fisse nella riga**: titolo e importo; poi «Fonte: …»; poi, solo quando S2 lo introduce, «Pagamento: dichiarato il …» oppure niente.
  - Mai un badge unico che fonda le tre dimensioni (per esempio un «Pagata» verde).
- **Pagamento non dichiarato**: si omette, non si scrive «Non pagata». La specifica chiede di non dedurre morosità (§4); un'etichetta negativa su ogni riga H3a esistente sembrerebbe un debito.
- **Fonte H3a attuale**: «Inserita da te» / «Collegata a un documento» (`ORIGIN_LABEL`) è coerente con la specifica. Va mantenuta quando arriveranno «estrazione confermata», «regola confermata» e «stima deterministica».
  - Oggi i totali del riepilogo H3a sono divisi per origine («Inserite da te» / «Collegate a un documento»).
  - Con S1 quella divisione andrebbe sostituita dai tre raggruppamenti economici: una divisione per fonte nel riepilogo principale diventa rumore quando le fonti sono cinque. Decisione di contratto S1.

### 1.4 Copertura senza percentuali (§7)

Ottima la lista «Registrate / Da aggiungere / Non applicabili / Incluse in altra voce».
- Su telefono va presentata come lista di righe con stato testuale, non come anello, barra o contatore «6/9». Anche un contatore viene letto come percentuale.
- Criterio: nessun numero aggregato di categorie mostrato vicino a un importo.

### 1.5 Rinnovi ignoti

Corretto non dedurli (§6). Proposta UI: dopo l'ultima rata nota, una riga «Dopo il 31 marzo 2027: rinnovo non indicato», esclusa dai totali e con l'azione «Aggiungi il rinnovo» solo quando S2 è attivo. Lo stesso schema vale per «Importo da indicare». La specifica lo prevede già (§2): va reso uniforme in tutte le viste.

### 1.6 Privacy (§9)

Coerente con H1, H3a e M3: dati personali del creatore, nessun totale familiare implicito.

**Lacuna**: la specifica non dice chi vede **ambienti e oggetti** G1. Il §9 parla di economia e condivisione selettiva (C1); il §5 parla di oggetti senza regola di visibilità. Poiché le schede caldaia M3 sono personali al creatore (`review-api-contract.md`), questa è la decisione più importante prima del contratto G1 (K2, K3).

---

## 2. Flussi essenziali G1

Principi dalla specifica:
- gli ambienti sono contesto di lettura;
- documenti, garanzie e costi non si copiano nell'ambiente;
- «Da collocare» è assenza di posizione, non una stanza;
- un costo è un solo record;
- la caldaia e le sue conferme non si duplicano.

### F1 — Crea ambiente

Casa → «Ambienti» → «Aggiungi ambiente» → nome (obbligatorio) → salva.
- La destinazione è visibile: «Ambiente in <Casa>», con la visibilità decisa dal contratto (K2).
- Dopo il salvataggio si resta nella lista ambienti, con il focus sulla nuova riga.
- Nessun elenco predefinito di stanze imposto. Se il contratto lo prevede, i suggerimenti («Cucina», «Bagno»…) sono scorciatoie da toccare, non record creati automaticamente.
- Errori: nome vuoto o duplicato secondo il contratto; esito ambiguo con «Riprova invio» (stessa operazione); 409 → «Rileggi i dati». Nessun successo locale.

### F2 — Crea oggetto manuale, anche senza ambiente

Casa → «Oggetti e impianti» → «Aggiungi oggetto» → nome, tipo, note facoltative → «Dove si trova» facoltativo → salva.
- **Tipo**: elenco del contratto, più «Altro».
- **Senza posizione**: l'oggetto compare in «Da collocare», come filtro della lista e non come stanza.
- **Duplicati**: prima del salvataggio, se il tipo è «Caldaia» e l'utente ha già una scheda caldaia M3, il modulo lo dice: «Hai già la scheda “Caldaia cucina”. Vuoi collegarla invece di creare un nuovo oggetto?» (K3).
  - Le azioni sono «Collega la scheda esistente» e «Crea comunque un nuovo oggetto».
  - Nessuna fusione automatica.

### F3 — Collega un impianto a più ambienti

Scheda oggetto → «Dove si trova» → «Modifica» → caselle di scelta multipla degli ambienti → salva.
- Per gli oggetti non impianto, la scelta multipla è disponibile solo se il contratto la consente. La specifica parla di multiambiente «per impianti».
- **Lettura**: «Termosifoni — Soggiorno, Camera, Bagno». Nella vista di ogni ambiente l'oggetto compare con la nota «anche in altri 2 ambienti».
- Cambiare ambienti non modifica costi, importi, storia economica o attività (EC-02).

### F4 — Scheda oggetto: documenti, costi e attività autorizzati, senza duplicarli

Ordine delle sezioni:
1. **Identità**: nome, tipo, posizione, note.
2. **Scheda tecnica**, solo per la caldaia collegata: link alla scheda M3 esistente (`/impianti/:assetId`), non una copia. Restano lì proposte, conferme e storia tecnica.
3. **Documenti collegati**: solo quelli leggibili dal richiedente (visibilità M2). Un documento privato di un altro membro non compare e non viene conteggiato.
4. **I tuoi costi**: la stessa lista H3a filtrata (oggi «Costi collegati», `LinkedExpenses`), con la dicitura «visibili solo a te».
5. **Le tue attività**: promemoria H1 collegati.
6. **Storia dell'oggetto**: modifiche a identità e posizione, separata dalla storia tecnica M3 e da quella economica.

Regole:
- nessun conteggio aggregato fra utenti («3 costi in questa casa»);
- ogni sezione dice di chi sono i dati;
- un oggetto leggibile non rende leggibili i dati collegati (§9; K9).

### F5 — Scheda ambiente (contesto)

Nome → oggetti presenti (con «anche in…» per i multiambiente) → link «Documenti degli oggetti di questo ambiente» e «Costi degli oggetti di questo ambiente».
- Sono letture filtrate delle sezioni esistenti, non sezioni proprie dell'ambiente.
- Nessun importo totale per ambiente in G1 (K6).

### F6 — Caldaia già presente (migrazione senza doppia scheda)

- Le schede M3 esistenti restano dove sono: route, conferme, versioni, storia e costi collegati invariati.
- Nella lista oggetti la scheda caldaia personale compare **una volta sola**, in base alla decisione K3:
  - **(a)** se viene collegata a un oggetto, compare come quell'oggetto con la sezione «Scheda tecnica»;
  - **(b)** se non è collegata, compare come voce «Scheda caldaia (personale)» con l'azione «Collega a un oggetto o a un ambiente».
- Mai due righe per la stessa scheda.
- I link esistenti (Casa → «Impianti e verifiche», promemoria H1, costi H3a) continuano ad aprire la scheda M3 o il suo oggetto.

---

## 3. Wireframe testuali

Stile V5 invariato: shell, navigazione inferiore Casa / Attività / Documenti / Spese, card bianche, palette blu attuale. Nessun elemento dal PDF di scouting. Le funzioni future non compaiono nel runtime (né disattivate né «presto»): le indico tra parentesi quadre solo per Codex.

### 3.1 Casa con G1 — 320/390 px (una colonna)

```
┌ Appartamento Roma ─────────────── [Esci] ┐
│ CASA                                      │
│ Appartamento Roma                         │
│ Via Roma 12 · Proprietario                │
├───────────────────────────────────────────┤
│ Le tue scadenze (H1, invariato)           │
├───────────────────────────────────────────┤
│ Le tue spese del 2026 (H3a, invariato)    │
│ Totale registrato  309,30 €               │
├───────────────────────────────────────────┤
│ Ambienti e oggetti                 (G1)   │
│ 6 ambienti · 9 oggetti · 2 da collocare   │  ← conteggi solo di ciò che il richiedente vede
│ [Ambienti] [Oggetti e impianti]           │
├───────────────────────────────────────────┤
│ Impianti e verifiche (M3, invariato)      │
└───────────────────────────────────────────┘
 Casa · Attività · Documenti · Spese
```

Su desktop Casa resta a griglia come oggi. «Ambienti e oggetti» occupa una card larga sotto le scadenze. [S2: «Prossimi impegni» compare come card separata solo quando attivo.]

### 3.2 Lista oggetti — 390 px

```
Oggetti e impianti                      [+ Aggiungi]
Filtri: [Tutti gli ambienti ▾] [Tutti i tipi ▾]
        ( Da collocare )  ← filtro, non stanza
┌─────────────────────────────────────────┐
│ Caldaia cucina                Caldaia   │
│ Cucina · scheda tecnica personale       │
├─────────────────────────────────────────┤
│ Termosifoni                   Impianto  │
│ Soggiorno, Camera, Bagno                │
├─────────────────────────────────────────┤
│ Lavastoviglie                 Elettrod. │
│ Da collocare                            │
└─────────────────────────────────────────┘
[Mostra altri oggetti]
```

A 320 px il tipo va sotto il nome (niente colonna destra) e i filtri vanno a capo a tutta larghezza.

### 3.3 Scheda oggetto — 320/390 px

```
← Oggetti e impianti
APPARTAMENTO ROMA · OGGETTO
Termosifoni
[Impianto]
┌ Dove si trova ───────────── [Modifica] ┐
│ Soggiorno, Camera, Bagno                │
└─────────────────────────────────────────┘
┌ Documenti collegati ────────────────────┐
│ Manuale termosifoni.pdf                 │
│ Solo i documenti che puoi leggere.      │
└─────────────────────────────────────────┘
┌ I tuoi costi ───────────────────────────┐
│ Spurgo · 0,10 € · 12 ott 2026           │
│ Visibili solo a te. Ogni costo una volta│
│ [Registra un costo]                     │
└─────────────────────────────────────────┘
┌ Le tue attività ────────────────────────┐
│ Spurgare i radiatori · Scaduta          │
│ [Crea promemoria]                       │
└─────────────────────────────────────────┘
┌ Storia dell'oggetto ────────────────────┐
```

**Desktop**: due colonne. A sinistra identità, posizione e documenti; a destra costi e attività. Storia a tutta larghezza.

**Caldaia collegata**: tra posizione e documenti c'è la card «Scheda tecnica (personale) → Apri scheda», con lo stato di conferma M3 come testo («Dati da rivedere: 1»). Le conferme restano nella scheda M3.

### 3.4 Scheda ambiente — 390 px

```
← Ambienti
Soggiorno                         [Rinomina]
Oggetti in questo ambiente
  Termosifoni (anche in altri 2 ambienti)
  Climatizzatore
[Documenti degli oggetti] [Costi degli oggetti]
Gli ambienti raccolgono gli oggetti: documenti e costi restano su oggetti e casa.
```

### 3.5 Spese finale (S1 attivo; S2 indicato tra parentesi quadre)

**390 px**

```
LE TUE SPESE DELLA CASA
Sostenute | [Impegni] | Per oggetto        ← schede; [Impegni] solo con S2
─────────────────────────────────────────
Anno [2026 ▾]   Confronto: stesso periodo 2025
┌ Costi registrati da te nel 2026 ───────┐
│ Gestione                 1.210,40 €    │
│ Lavori e acquisti          333,50 €    │
│ ───────────────────────────────────    │
│ Totale registrato        1.543,90 €    │
│ Stesso periodo 2025      1.401,00 €    │  ← solo con periodo omogeneo esistente
└─────────────────────────────────────────┘
┌ Finanziamento (rata intera dichiarata) ┐  ← riquadro separato, fuori dal totale
└─────────────────────────────────────────┘
Filtri: [Categoria ▾] [Stato ▾] [Fonte ▾]
Elenco
  Gas febbraio      1.234,50 €
  28 feb · Gas · Fonte: documento collegato
  Spurgo radiatori      0,10 €
  12 ott · Non classificata · Inserita da te
[Mostra altre spese]
[+ Registra una spesa]
```

**320 px**: totali a una colonna (come H3a oggi), schede scorrevoli in orizzontale senza troncare le etichette (Sostenute / Impegni / Per oggetto), filtri ciascuno a tutta larghezza.

**Desktop**: riepilogo e filtri a sinistra (circa 1/3), elenco a destra; il confronto con l'anno precedente diventa una seconda colonna nel riepilogo.

**Per oggetto**: elenco degli oggetti con il numero dei **propri** costi. Il totale per oggetto è deduplicato. «Costo del lavoro condiviso» compare come voce con quella dicitura e non entra come quota propria (§5; K10). Nessun totale per ambiente.

---

## 4. Criticità (massimo dieci)

Legenda tipo: **B** bug verificato sul codice (non riprodotto); **A** ambiguità della specifica; **U** suggerimento UX; **D** scelta di business o di committente.

### K1 — B/A · Il collegamento «oggetto» di costi e attività oggi è solo la caldaia M3 personale

- **Trigger**: con G1 l'utente vuole registrare un costo o un promemoria su un oggetto generico (per esempio i termosifoni).
- **Fatto verificato sul codice**:
  - expenses-v1 e activities-v1 accettano solo `assetId` delle schede M3 (`assetLink`);
  - il frontend legge le scelte da `useAssets` (M3) e l'etichetta è fissa «Caldaia collegata (facoltativa)» (`src/expenses/components.tsx`, `src/activities/components.tsx`).
- **Rischio**:
  - riusare il campo esistente per oggetti di natura diversa;
  - doppi riferimenti (scheda e oggetto) che contano lo stesso costo in due schede;
  - perdita dei collegamenti H3a esistenti.
- **Proposta**: il contratto G1 (o un'estensione dichiarata di expenses-v1/activities-v1) definisce come un costo o un'attività si riferisce a un oggetto e come si conservano i collegamenti caldaia esistenti. Fino ad allora il frontend non mostra «collega a oggetto» su costi e attività.
- **Accettazione**:
  - i costi e le attività H3a/H1 legati alla caldaia appaiono identici dopo G1 (EC-01);
  - un costo ha al massimo un oggetto principale;
  - il totale per oggetto conta ogni costo una volta.

### K2 — D/A · Visibilità di ambienti e oggetti non definita

- **Trigger**: un member crea l'ambiente «Studio» o l'oggetto «Climatizzatore»; owner e viewer aprono la lista.
- **Rischio**: se sono condivisi nella casa, i dati derivati personali (costi, attività, schede M3) potrebbero sembrare condivisi; se sono personali, due membri creano due «Caldaia» per lo stesso impianto fisico.
- **Proposta**:
  - **Decisione del committente**.
  - Opzione consigliata: identità e posizione di ambienti e oggetti condivise con i membri con diritto di lettura; tutto ciò che è derivato (costi, attività, schede tecniche, note personali) resta personale.
  - Ciascuna sezione della scheda oggetto dichiara di chi sono i dati.
  - Alternativa: tutto personale in G1 e condivisione con C1.
- **Accettazione**:
  - la matrice del contratto G1 indica, per owner, member e viewer, lettura e scrittura di ambiente, oggetto, posizione e note;
  - un test dimostra che un oggetto condiviso non espone costi, attività o schede dell'autore.

### K3 — A · Caldaia già presente: doppia scheda e conferme

- **Trigger**: un utente con una scheda M3 «Caldaia cucina» apre «Oggetti e impianti» o crea l'oggetto «Caldaia».
- **Rischio**: due voci per la stessa caldaia; conferme M3 copiate o perse; link H1/H3a che puntano a entità diverse. Con il modello M3 personale, due membri possono già avere ciascuno la propria scheda della stessa caldaia fisica.
- **Proposta**:
  - nessuna migrazione automatica;
  - legame esplicito «scheda tecnica personale ↔ oggetto», con azione «Collega la scheda esistente» o «Crea oggetto da questa scheda»;
  - la scheda M3 resta l'unico posto di proposte e conferme;
  - l'oggetto mostra un link, non una copia.
- **Accettazione**:
  - dopo G1 versioni, conferme e storia della scheda sono invariate;
  - ogni utente vede la sua scheda una volta sola nella lista;
  - `/impianti/:assetId` continua a funzionare.

### K4 — U (testo verificato sul codice) · «In programma» e «scadenze» già occupati

- **Trigger**: con S2 attivo, la scheda «In programma» di Spese convive con lo stato «In programma» delle attività H1 (`DUE_LABEL.upcoming`) e con la card Casa «Le tue scadenze».
- **Rischio**: l'utente confonde un promemoria con un impegno economico, o pensa che un impegno sia un'attività da completare. La specifica dice che completare un'attività non significa aver pagato (§5).
- **Proposta**: in Spese la scheda «Impegni» (coerente con «Impegni noti», §3); in Casa la card «Prossimi impegni»; nessun impegno dentro «Le tue scadenze».
- **Accettazione**: nessuna schermata usa la stessa etichetta per due entità diverse; le liste H1 e S2 non contengono elementi dell'altra.

### K5 — A (verificato sul codice) · Anno predefinito di «Sostenute» diverso da H3a

- **Trigger**: la specifica vuole «Sostenute» con anno corrente predefinito (§2). In H3a l'elenco senza `?anno` mostra «Tutti gli anni», mentre il riepilogo mostra l'anno corrente (`filtersFromParams` → `year: null`; decisione 2 di `h3-integration-review.md`).
- **Rischio**:
  - cambiare il default rompe i link esistenti `/spese` e il comportamento noto;
  - non cambiarlo lascia elenco e riepilogo su periodi diversi nella vista principale.
- **Proposta**: in S1, «Sostenute» apre l'anno corrente sia per l'elenco sia per il riepilogo; «Tutti gli anni» resta una scelta esplicita nel filtro; i link con `?anno=` restano validi.
- **Accettazione**: aprendo Spese elenco e riepilogo dichiarano lo stesso anno; il ritorno dal dettaglio conserva il filtro dello stesso account (come oggi).

### K6 — A · Ambienti multipli e importi

- **Trigger**: un impianto collegato a tre ambienti ha un costo; l'utente filtra per ambiente o confronta stanze.
- **Rischio**: lo stesso costo appare in tre ambienti e qualunque somma per ambiente lo triplica. Una ripartizione implicita sarebbe inventata (§5).
- **Proposta**:
  - il filtro per ambiente restituisce costi deduplicati per ID;
  - nessun totale monetario per ambiente in G1/S1;
  - quando si filtra, una riga «Questo costo riguarda anche altri ambienti».
- **Accettazione**:
  - nessuna vista mostra somme per ambiente;
  - selezionare più ambienti non conta due volte lo stesso costo (test sulla deduplicazione).

### K7 — B · Perdita del focus dopo le azioni nel dettaglio attività H1 (non riprodotta)

- **Trigger**: completare, annullare o riaprire un'attività. `ActivityDetailPage` usa la versione come `key`; la risposta aggiorna la cache, la vista si rimonta e il pulsante d'origine sparisce. La callback passata a `mutate` non viene eseguita se il componente si è smontato.
- **Rischio**: con la tastiera o uno screen reader il focus finisce sul body; lo stesso schema si ripeterà in tutte le schede G1 con versione.
- **Proposta**: per G1 adottare lo schema già usato in H3a (`ExpenseDetailPage`: focus sulla nuova azione quando cambia la versione) e applicarlo anche a H1 in un incarico separato (backlog Codex, decisione 7).
- **Accettazione**: dopo ogni azione riuscita in una scheda versionata, `document.activeElement` è un controllo della scheda, verificato in test e da tastiera.

### K8 — U (verificato sul codice) · I selettori nativi non scalano

- **Trigger**: con G1 aumentano oggetti e documenti. I selettori H1/H3a sono `<select>` che caricano pagina dopo pagina con «Carica altri …» (`ExpenseForm`).
- **Rischio**: su telefono un menu con centinaia di voci non è usabile; l'utente collega l'elemento sbagliato o rinuncia.
- **Proposta**: un selettore con ricerca, che per i documenti usa la ricerca server H2 (titolo e nome file) e per gli oggetti la ricerca o i filtri del contratto G1. Il riferimento proposto dall'URL resta verificato con una lettura autorizzata, come oggi.
- **Accettazione**:
  - un documento oltre la prima pagina si trova digitandone il nome;
  - il selettore è usabile da tastiera, con etichetta e messaggi;
  - nessun elemento non autorizzato compare tra i risultati.

### K9 — A · Aggregazione nella scheda oggetto e conteggi altrui

- **Trigger**: un owner apre l'oggetto condiviso di un member che ha costi, attività e documenti privati collegati.
- **Rischio**: contatori, badge («3 costi») o sezioni vuote con un messaggio diverso possono rivelare che esistono dati altrui.
- **Proposta**:
  - ogni sezione legge dal server solo i dati del richiedente;
  - stesso messaggio vuoto («Nessun costo tuo collegato») a prescindere dai dati altrui;
  - nessun contatore fra utenti.
- **Accettazione**: un test con due account mostra testi, conteggi e richieste identici per l'owner che ha zero dati propri, sia quando il member ha dati sia quando non ne ha.

### K10 — A/D · Lavori su più oggetti con «un oggetto principale»

- **Trigger**: la specifica vuole un solo costo per un intervento su più oggetti, mostrato come «Costo del lavoro condiviso» (§5), ma la prima versione collega un costo a un oggetto principale e a un intervento.
- **Rischio**: sugli oggetti secondari il costo non compare oppure viene sommato come quota propria; il totale per oggetto diventa incoerente.
- **Proposta**:
  - decidere se l'entità «intervento» entra in G1 o in S1;
  - i riepiloghi per oggetto mostrano i costi dei lavori condivisi in una sezione distinta e fuori dal totale dell'oggetto, finché non esiste una ripartizione esplicita con contratto separato.
- **Accettazione**: un intervento su due oggetti con un costo da 300 € compare su entrambi come lavoro condiviso, conta 300 € una sola volta in Sostenute, e nessun oggetto mostra 150 € dedotti.

---

## 5. Taglio piccolo ma completo

### G1 — fondazione ambienti/oggetti

**Incluso:**
1. Ambienti: crea, rinomina, archivia logicamente con storia; nessun elenco imposto.
2. Oggetti manuali: nome, tipo, note; posizione facoltativa («Da collocare» come filtro); più ambienti per gli impianti; modifica con versione e storia.
3. Caldaia: legame esplicito tra la propria scheda M3 e un oggetto, con link alla scheda tecnica; nessuna copia di proposte o conferme (K3).
4. Scheda oggetto con le sezioni F4. Costi e attività restano visibili solo se esiste il collegamento (oggi solo caldaia, K1). Documenti collegati solo se il contratto introduce il legame documento ↔ oggetto.
5. Casa: card «Ambienti e oggetti»; liste con paginazione e filtri ambiente/tipo; stati vuoto, filtrato, errore e accesso negato distinti.
6. Trasversale come H1/H3a: idempotenza, CAS, riprova esplicita, 403 che pulisce cache e bozze, cambio account o casa, 320/390/desktop, tastiera.

**Collegamenti che richiedono nuovi permessi o contratti** (senza nomi REST inventati):
- **Policy di visibilità** per ambiente e oggetto e matrice owner/member/viewer (K2).
- **Legame scheda tecnica M3 ↔ oggetto**: chi può crearlo, e se è personale al titolare della scheda.
- **Legame documento ↔ oggetto**: rispetta la visibilità M2 e non rende leggibile il documento a chi vede l'oggetto.
- **Riferimento a un oggetto generico da costi (expenses-v1) e attività (activities-v1)**, con compatibilità per i riferimenti caldaia esistenti (K1).
- **Ricerca o filtro degli oggetti** per il selettore (K8).

**Escluso da G1:**
- AI generica;
- inventario da foto;
- condivisione selettiva (C1);
- ripartizioni;
- totali per ambiente;
- interventi, se il committente li assegna a S1 (K10).

### S1 — storico economico evoluto

**Incluso:**
1. Categoria per costo, dal catalogo §3, con «Non classificata» per i costi H3a. Modifica con storia; filtro per categoria.
2. Raggruppamenti gestione / lavori-acquisti / finanziamento. Totale registrato con il significato H3a; finanziamento in un riquadro separato.
3. Scheda «Sostenute» con anno corrente predefinito per elenco e riepilogo (K5). Confronto con lo stesso periodo dell'anno precedente solo se esistono dati in quel periodo, con il criterio scritto.
4. «Per oggetto»: costi deduplicati per oggetto e lavori condivisi come voce distinta (K10).
5. Compatibilità H3a: stessi record, importi, storia e collegamenti; nessuno stato di pagamento dedotto.

**Richiede contratto:**
- campo categoria e sua storia;
- riepiloghi per categoria e raggruppamento calcolati dal server;
- confronto omogeneo calcolato dal server;
- eventuale entità intervento e regola di presentazione dei costi condivisi.

Il frontend non somma importi in proprio, come in H3a.

**Escluso da S1:** impegni, ricorrenze e pagamento (S2); documenti economici con estrazione (S3); stime, conguagli e copertura (S4).

---

## 6. Decisioni da lasciare al committente

1. Visibilità di ambienti e oggetti (K2): condivisi nell'identità e personali nei derivati, oppure tutto personale fino a C1.
2. Migrazione caldaia (K3): solo legame esplicito (consigliato) oppure creazione assistita di un oggetto per ogni scheda esistente.
3. Interventi in G1 o in S1 (K10).
4. Nome della scheda futura: «Impegni» (consigliato, K4) oppure «In programma».
5. Default anno di «Sostenute» (K5): anno corrente per elenco e riepilogo (consigliato) oppure comportamento H3a invariato.

## 7. Limiti di questa consegna

- Revisione documentale: nessun codice, test, runtime o contratto modificato; nessuna API prodotto o Anthropic chiamata; nessun browser.
- I rilievi B e i testi «verificati sul codice» derivano dalla lettura del codice integrato nel master e del mio checkout, **non da riproduzioni**.
- Il PDF di scouting non è stato usato come fonte di stile o di requisiti; la specifica consolidata prevale.
- I wireframe indicano gerarchia e contenuti, non misure grafiche. Lo stile resta quello V5 in uso.
