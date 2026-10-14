# Spese — proposta di Panoramica grafica — 14 ottobre 2026

Proposta di Claude Code da valutare: **non** è una modifica approvata della navigazione ufficiale.

**Base.** Mockup ufficiale del master (`Home_OS` commit `3c6aa59`, file `frontend-v5/public/mockup-proprietario-v5.html`):
- SHA256 `960a0576c40828f8dbe1584285aeb886b03afd0680c5c33994404b0599123923`;
- include già la rifinitura visiva integrata da Codex (`bb8ce9e`);
- letto in sola lettura e verificato invariato a fine lavoro.

**Variante:** `frontend-v5/docs/proposta-ux/dimora-dashboard-spese.html`.
- Generata dallo script `frontend-v5/docs/proposta-ux/script/dashboard-spese.mjs`, che fa sostituzioni esatte e si ferma se un punto non corrisponde. Sorgente e destinazione si passano come argomenti.
- Chiave di storage propria: `dimora-owner-dashboard-v1`, con `-qa` se l'URL contiene `?qa=1`.

## 1. Cosa propone

Una vista **Panoramica** dentro Spese, accanto a Elenco / Per oggetto / Per lavoro / Riepilogo. Non è una quinta voce della navigazione. Nella variante è la vista con cui si apre Spese; la sezione 4 dice perché e cosa resta da decidere.

Ordine dall'alto, con lo stesso menu delle famiglie e gli stessi filtri delle altre viste:

1. **Azioni:** «Registra una spesa» e «Da documento», invariate.
2. **Famiglie:** Tutte e le sette famiglie, invariate.
3. **Visualizza e Periodo,** affiancati. Il periodo è esplicito e modificabile («2026 · fino al 14 ottobre», 2025).
4. **Totale dei costi registrati,** con la seconda misura «Senza mutuo e finanziamenti» e il numero di registrazioni. Il totale include sempre il finanziamento.
5. **Filtri** (categoria, oggetto, lavoro, ricerca), chiusi.
6. **Distribuzione:**
   - grafico ad anello con legenda;
   - con «Tutte», un interruttore **Famiglie / Categorie**; scegliendo una famiglia, il grafico mostra le **categorie di quella famiglia**, con il link «Tutte le famiglie».
7. **Confronto con lo stesso periodo:** la funzione `comparison()` esistente, invariata, con l'avvertenza che non dimostra un risparmio.
8. **Bozze:** card esistente, escluse dai totali e recuperabili.
9. **Ultime registrazioni:** le 4 più recenti, più «Vedi tutte le N registrazioni».

## 2. Regole rispettate

- **Famiglie e categorie non sono sinonimi.** Il quadro iniziale usa le sette famiglie, il passaggio a «Categorie» usa le voci dettagliate. I testi lo dicono: «Le famiglie raggruppano le categorie» / «Le categorie sono le voci che scegli quando registri».
- **Stessi calcoli e mapping del mockup.** Uso `groups()`, `familyLabels`, `cats`, `filtered()` e `comparison()` senza modificarli: `repairs_works` segue il collegamento al lavoro, la polizza mutuo resta `financing`. Somme in centesimi interi; nessuna riclassificazione.
- **Famiglie vuote.** Non diventano settori a zero: compaiono in una riga separata («Senza registrazioni nel periodo: Condominio, …»).
- **Percentuali.** Sono solo rappresentazione, arrotondate a un decimale e calcolate in decimi interi. Se la somma non fa 100,0% lo si dichiara (per esempio nel 2025: «la somma è 99,9%»).
- **Nessun costo con questi filtri:** messaggio «Nessun costo registrato nel periodo e con questi filtri», senza anello.
- **Il grafico non è mai l'unico modo di leggere i dati.** La legenda riporta etichetta, importo e percentuale. Il grafico ha un'etichetta che rimanda alla legenda, ogni settore ha un titolo con valore e percentuale, e i colori non portano significati propri.
- **Navigazione.**
  - Un clic su settore o legenda apre l'Elenco filtrato (famiglia o categoria) con lo **stesso periodo**.
  - Nell'elenco compare «← Torna alla panoramica», che ripristina famiglia e categoria precedenti senza toccare il periodo.
  - La legenda è fatta di pulsanti, quindi raggiungibile da tastiera; i settori sono solo un'alternativa per il mouse.
  - Il focus va su «Torna alla panoramica» quando si apre l'elenco, e sul titolo «Distribuzione» al ritorno.
- **Fuori S1, nulla aggiunto:** niente ricorrenze, stato pagato, budget, previsioni, calcolo del mutuo o consigli.
- Nessun dato inviato a servizi esterni.

## 3. Quando aiuta rispetto all'elenco

- **Aiuta:**
  - per rispondere a «dove sono andati i soldi quest'anno?» senza leggere tutte le righe;
  - per vedere a colpo d'occhio che un lavoro straordinario (qui il rifacimento del bagno, 62% del 2026) pesa più di tutto il resto;
  - per scendere da famiglia a categoria e poi alle registrazioni con due tocchi.
- **Non aiuta, o aiuta meno:**
  - per cercare una spesa precisa: lì servono Elenco e ricerca;
  - con poche registrazioni: con 2–3 voci il grafico dice quanto la legenda, e occupa più spazio;
  - per capire se si spende di più o di meno: il confronto riguarda solo ciò che è stato registrato, e lo dice.

## 4. Pagina iniziale o vista aggiuntiva

Sono possibili entrambe, e la scelta resta al committente. Nella variante la Panoramica è la vista iniziale **solo per poterla valutare**.

| | Panoramica come prima vista | Elenco come prima vista, Panoramica come opzione |
|---|---|---|
| Pro | Orienta subito; il totale ha un contesto | Chi registra spesso trova subito le righe; nessun grafico da superare |
| Contro | Su telefono il grafico arriva al secondo schermo (sotto) | Il quadro d'insieme resta nascosto in un menu che molti non apriranno |

**Raccomandazione:** Panoramica come prima vista **solo se** la casa ha almeno qualche registrazione nel periodo, ed Elenco quando ce ne sono poche. È un'ipotesi da verificare con persone reali, non una decisione.

## 5. Prove effettive

Variante servita da un mio server statico temporaneo su 127.0.0.1:5175, fermato a fine lavoro, con `?qa=1`.

**Limite di metodo.** Durante la prova il pannello browser non disegnava la pagina (finestra in secondo piano), quindi i clic reali non partivano. Le interazioni sono state attivate con `click()` e `change` via JavaScript sugli stessi pulsanti e campi, quindi con gli stessi gestori di un clic vero. Non è una prova con mouse o tastiera reali.

| # | Prova | Esito |
|---|---|---|
| 1 | Apertura Spese, 2026 | Panoramica; totale 2.477,90 €; senza finanziamenti 1.907,90 €; 9 registrazioni. Legenda: Lavori e acquisti 1.540,00 (62,1%), Mutuo e finanziamenti 570,00 (23,0%), Bollette 187,90 (7,6%), Tasse e assicurazioni 180,00 (7,3%); somma 100,0%. Famiglie vuote elencate a parte. Nessun errore in console |
| 2 | Legenda «Bollette» | Elenco, famiglia Bollette, periodo 2026, 187,90 €, 3 righe; focus su «Torna alla panoramica» |
| 3 | «Torna alla panoramica» | Tutte, 2.477,90 €, periodo invariato; focus sul titolo |
| 4 | Interruttore Categorie → legenda «Assicurazione» → ritorno | 7 categorie; elenco con 1 riga da 180,00 €; ritorno alla vista Categorie |
| 5 | Clic sul settore «Lavori e acquisti» | Elenco, 1.540,00 €, 3 righe |
| 6 | Periodo 2025 | 747,00 €; Mutuo 450,00, Bollette 202,00, Manutenzione 95,00; nota «la somma è 99,9%». Legenda → elenco → ritorno: periodo 2025 conservato |
| 7 | Famiglia «Lavori e acquisti» dal menu | Titolo «Categorie in Lavori e acquisti»: Riparazioni e lavori 1.120,00, Acquisti e sostituzioni 420,00; «Tutte le famiglie» riporta al quadro |
| 8 | Filtro ricerca senza risultati | 0,00 €, messaggio «Nessun costo registrato…», nessun anello; «Azzera filtri» riporta 2.477,90 € |
| 9 | Vista Elenco | 2.477,90 €, 9 righe: invariata |
| 10 | 390 × 844 | Nessuno scorrimento orizzontale. Periodo e totale nella prima schermata; il grafico inizia a 790 px (secondo schermo) |
| 11 | 320 × 720 | Nessuno scorrimento orizzontale né righe di legenda tagliate, nelle viste Famiglie, Categorie ed Elenco |

**Screenshot** in `frontend-v5/docs/screenshots/spese-dashboard-20261014/`, catturati con Chrome headless:
- `01-panoramica-desktop-1280.png` (1280×1250);
- `02-panoramica-mobile-390.png`, catturato in un iframe largo 390 px e ritagliato a 390×1900.

## 6. Modifiche rispetto al mockup ufficiale

- **Nuova funzione `overview()`,** più i colori della legenda nella stessa gamma Blu architettura e sabbia; nessun nuovo tema.
- **`history()`:**
  - vista predefinita `panoramica`;
  - nuova opzione nel menu Visualizza;
  - ramo che disegna la Panoramica;
  - «Torna alla panoramica» negli elenchi aperti dal grafico.
- **Ordine dei blocchi in Spese,** in tutte le viste: Visualizza/Periodo **prima** del totale, nel markup e quindi anche nell'ordine di tabulazione.
- **`bind()`:** gestori per legenda, settori, interruttore, «Tutte le famiglie», «Vedi tutte», ritorno.
- **CSS:** blocco «Dashboard Spese» in fondo allo stile.
- **Invariati:** calcoli, mapping, percorsi, bozze, condivisioni e le altre sezioni.

## 7. Limiti

- **Clic simulati** via JavaScript (vedi sopra). Nessun lettore di schermo, nessuna dichiarazione WCAG.
- **Contrasto dei colori.** Alcuni colori della legenda, l'azzurro chiaro e il grigio chiaro per «Altro», hanno contrasto basso fra loro e verso lo sfondo. Il significato è sempre nel testo, ma Codex dovrebbe verificarli.
- **Su telefono il grafico richiede uno scorrimento.** Rimpicciolirlo ancora lo renderebbe decorativo.
- **Stato in localStorage.** La scelta Famiglie/Categorie e l'eventuale ritorno sono salvati nello stato della variante; nel prodotto reale vanno nello stato di navigazione, non nel contratto API.
- **Nessun impatto sul contratto** economic-history: i totali per famiglia e categoria sono già derivabili dalle registrazioni filtrate.
