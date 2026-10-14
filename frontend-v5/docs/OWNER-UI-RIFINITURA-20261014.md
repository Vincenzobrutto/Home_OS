# Rifinitura visiva del mockup proprietario — 14 ottobre 2026

Revisione di Claude Code limitata a UI, gerarchia visiva e leggibilità. L'architettura funzionale non è stata riaperta.

**Base.** Mockup ufficiale consolidato nel master (`Home_OS` commit `787e6534`), file `frontend-v5/public/mockup-proprietario-v5.html`:
- SHA256 `d4f0c63165e899c0f3a78587ffadb1bf25f0fefddf4f092c7c838f03fa2eaa19`, 91 997 byte;
- letto in sola lettura e verificato invariato a fine lavoro.

**Variante:** `frontend-v5/docs/proposta-ux/dimora-owner-rifinitura.html`.

## 1. Perché la proposta Claude appare più curata

Confronto fra la proposta Claude e il consolidato su Casa, Spese e scheda Caldaia: otto differenze concrete.

| # | Dove | Consolidato | Proposta Claude |
|---|---|---|---|
| R1 | Testata, tutte le pagine | Barra prova su due righe a 390 px. Blocco account su tre righe («Casa di Giulia · Milano / Giulia Leone · proprietaria / Home completa · prova UX») | Una riga di barra prova, testata con una sola informazione |
| R2 | Titoli | `h1` da 36 px (29 su mobile) con punto finale («Spese.», «La tua casa.»): suona come uno slogan | `h1` più contenuto (30–34 px), senza punto: suona come il nome della pagina |
| R3 | Righe di spesa | Icona documento/lavoro su ogni riga, tre righe di testo (titolo; data · categoria; oggetto · lavoro), padding 18 px. Riga alta 77 px a 390 | Niente icona, due righe (titolo; metadati uniti), importo allineato con cifre tabulari, riga intera cliccabile |
| R4 | Gerarchia delle azioni | Navigazione secondaria come pulsanti bordati dello stesso peso delle azioni («Tutti gli oggetti e impianti», «Gestisci ambienti», «Vedi tutte le attività», «Vai al condominio», «Vedi tutti i documenti/costi») | Una sola azione primaria per contesto, la navigazione secondaria come link |
| R5 | Menu famiglie (Spese) | Otto pulsanti da 44 px; quello attivo pieno blu, gli altri bianchi bordati. Un blocco pesante di comandi | Etichette a pillola leggere; l'attiva in tinta tenue con bordo d'accento |
| R6 | Ordine in Spese | Azioni → famiglie → Visualizza/Periodo (due campi impilati su mobile) → Filtri → **totale** → elenco → bozze in fondo. La prima registrazione è a 1050 px dall'alto a 390 | Totale subito sotto la scelta di famiglia, controlli compatti, bozze sopra l'elenco |
| R7 | Importi | «2477,90 €»: senza separatore delle migliaia, perché `Intl` it-IT lo omette sotto le 5 cifre | «2.477,90 €», cifre tabulari |
| R8 | Ritmo di card e chip | Card con padding 24 e raggio 18, margine 20. Ambienti come blocchi rettangolari. Schede dell'oggetto che vanno a capo a 390 | Card con padding 18–20, raggio 16, margine 14. Ambienti come pillole. Schede su una riga che scorre |

## 2. Direzione di rifinitura

Una sola direzione: **«stesso Blu architettura, meno rumore»**. Nessun nuovo colore, nessun nuovo tema.

- **Tipografia:**
  - titoli `h1` 32 px su desktop e 27 su mobile, interlinea stretta, senza punto finale;
  - `h2` 18 px;
  - occhielli 10,5 px con spaziatura;
  - importi in cifre tabulari e con separatore delle migliaia.
- **Spaziature e densità:**
  - card con padding 20 (16 su mobile), raggio 16 (14), margine 14;
  - righe con padding 12 e gap 12;
  - testata 10–12 px verticali.
- **Componenti:**
  - pillole per famiglie e ambienti;
  - righe di spesa a due livelli, cliccabili per intero;
  - card del totale compatta;
  - card bozze compatta.
- **Gerarchia delle azioni:**
  - una primaria piena (per esempio «Registra una spesa», «Importa documenti»), una secondaria bordata;
  - la navigazione verso elenchi o sezioni («Tutti gli oggetti», «Vedi tutte…», «Vai al condominio») diventa link.
- **Menu:**
  - famiglie come pillole scorrevoli su mobile, a bordo pieno, e a capo su desktop;
  - «Visualizza» e «Periodo» affiancati;
  - Filtri come riga richiudibile compatta.
- **Icone:** restano dove identificano un tipo di oggetto (documenti, attività, ambienti). Tolte dalle righe di spesa, dove ripetevano informazioni già scritte.

## 3. Modifiche applicate nella variante

La variante è una copia del mockup ufficiale. Le modifiche sono generate da uno script di sostituzioni esatte, che fallisce se un punto non corrisponde, per renderle ripetibili da Codex.

| # | Tipo | Modifica |
|---|---|---|
| 1 | Storage | Chiave `dimora-owner-rifinitura-v1` (con `-qa` se `?qa=1`) al posto di `dimora-owner-ux-mock-v1`. Dati sintetici e totali iniziali invariati: 2.477,90 €; senza finanziamenti 1.907,90 €; 9 registrazioni |
| 2 | Markup | Barra prova: «Variante rifinitura visiva · dati sintetici · nessuna operazione reale» |
| 3 | Markup | Testata: «Casa di Giulia · Milano»; la seconda riga (proprietaria) è nascosta sotto 650 px. Tolta la riga «Home completa · prova UX» |
| 4 | Funzione `title()` | Toglie il punto finale dal solo `h1`. Il focus programmatico sul titolo resta, senza contorno visivo (`h1[tabindex="-1"]:focus{outline:none}`) |
| 5 | Funzione `rows()` | Righe di spesa senza icona; metadati in una riga (data · categoria · oggetto · lavoro); classe `exp-row` con riga intera cliccabile tramite il link esistente (`::after`). Nessun cambio di destinazione |
| 6 | Funzione `history()` | Solo ordine dei blocchi: totale (`sp-total`) subito dopo le famiglie; bozze (`sp-drafts`) prima dell'elenco (`sp-list`). Contenuti, filtri e calcoli invariati |
| 7 | Funzione `money()` | Aggiunge il separatore delle migliaia anche a 4 cifre. Solo formattazione |
| 8 | Markup | Classe `btn link` su: «Tutti gli oggetti e impianti», «Gestisci ambienti», «Vedi tutte le attività» (Home); «Vai al condominio»; «Vedi tutti i documenti/costi» (Sintesi oggetto) |
| 9 | CSS | Blocco «Rifinitura visiva» in fondo allo stile: tipografia, card, pulsanti, pillole famiglie e ambienti, totale, toolbar affiancata, filtri e bozze compatti, schede oggetto su una riga, regole mobile ≤650 e ≤350 |

**Non modificato:**
- percorsi, rotte e ritorni;
- condivisioni, manifesto, revoca, esportazione, vendita e ripristino;
- bozze, consenso, importi ambigui, collegamento alla spesa esistente, inserimento manuale;
- testi, salvo quelli del punto 2;
- i messaggi temporanei sovrapposti (toast), che sono un comportamento.

## 4. Verifiche eseguite

Variante servita da un mio server statico temporaneo su 127.0.0.1:5175, fermato a fine lavoro. Pannello browser di Claude Code, URL con `?qa=1`.

- **Desktop 1280×800:** Spese a «Tutte» mostra 2.477,90 €, senza finanziamenti 1.907,90 €, 9 registrazioni, nessun errore in console.
- **Famiglia «Mutuo e finanziamenti»** (clic): 570,00 €, 2 registrazioni, coerente con il consolidamento.
- **390×844, misurato via JavaScript**, nessuno scorrimento orizzontale su Casa, Spese, Caldaia (Sintesi e Costi), Documenti, Attività, bozza. Confronto con il mockup ufficiale nello stesso pannello:

| Schermata | Ufficiale | Variante |
|---|---|---|
| Spese, prima registrazione dall'alto | 1050 px | 736 px (dentro la prima schermata di 844) |
| Spese, altezza riga di spesa | 77 px | 69 px |
| Spese, altezza pagina | 2000 px | 1541 px |
| Casa, altezza pagina | 1912 px | 1562 px |
| Caldaia, altezza pagina | 2038 px | 1717 px |

- **320×720:** nessun overflow su 10 schermate (Casa, Spese, Caldaia, Caldaia › Costi, Documenti, Attività, Importa, Manuale, Condivisioni, Impostazioni). Titolo allineato a 16 px.
- **Storage:** la variante crea solo `dimora-owner-rifinitura-v1(-qa)`. Gira anche su un'altra origine (localhost:5175), quindi non tocca lo stato del mockup ufficiale.
- **Screenshot** in `frontend-v5/docs/screenshots/owner-ui-rifinitura-20261014/`, catturati con Chrome headless sul mio server:
  - `01-casa-desktop-1280.png` (1280×1000);
  - `02-spese-desktop-1280.png` (1280×1100);
  - `03-caldaia-mobile-390.png`, catturato in un iframe largo 390 px perché Chrome headless non scende sotto una larghezza minima di finestra, e ritagliato a 390×1500.

Lo screenshot mobile ha fatto emergere un difetto della mia prima stesura: titolo allineato a destra su mobile. È stato corretto e rimisurato.

## 5. Limiti e cose non fatte

- **Nessun collaudo funzionale completo.** Ho provato solo cambio famiglia e navigazione fra le schermate. La variante non tocca la logica, ma Codex deve ripetere i propri percorsi dopo l'integrazione.
- **Screenshot dal pannello.** Durante il lavoro il pannello browser ha smesso di produrre screenshot (timeout). Le misure sono state prese via JavaScript, le immagini con Chrome headless.
- **Rimasto com'è (non necessario o fuori dalla rifinitura):**
  - la striscia «Menu della casa» su mobile;
  - i toast;
  - la card condominio con «Studio Rossi · Scala A · versione 1»;
  - il testo esplicativo nella Sintesi dell'oggetto («Valori dimostrativi…»).
- **Famiglie su desktop:** vanno su due righe a 1280. Ho scelto di non comprimerle oltre per non ridurre l'area cliccabile.
- **Accessibilità:** nessuna dichiarazione di conformità WCAG. Ridurre i pulsanti di navigazione a link mantiene un'altezza minima di 40 px (44 dentro `.actions` su mobile), ma non è stato provato con lettore di schermo.

## 6. Cosa deve raccogliere Codex

1. Lo **script di sostituzioni** `frontend-v5/docs/proposta-ux/script/rifinitura.mjs` (sezione 3; i percorsi sorgente/destinazione in testa allo script sono assoluti e vanno adattati), oppure direttamente il diff fra il mockup ufficiale e `dimora-owner-rifinitura.html`. Tutte le modifiche sono circoscritte:
   - blocco CSS in fondo allo stile;
   - funzioni `title`, `rows`, `history` (solo ordine), `money`;
   - classi `btn link` in `ownerHome`, `condoSummary`, `ownerObject`;
   - testata e barra prova.
2. Ripetere i percorsi del consolidamento (punti 1–9 di `owner-ux-consolidation-20261014.md`) sulla versione integrata.
3. Decidere se estendere le stesse regole (righe a due livelli, link per la navigazione secondaria) alle pagine non toccate: Documenti, Attività, Condominio, Condivisioni.
