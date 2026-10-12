# HomeZada — Red team indipendente (Claude) v1.1

**Data:** 2026-10-12 · **Autore:** Claude (revisore indipendente) · **Stato:** challenge, non dossier consolidato. **Nessuna modifica** a roadmap, backlog o registro decisioni.
**Sostituisce:** `claude-red-team-v1.0.md` (lasciato invariato per tracciabilità). Le differenze sono elencate in §0.

## Basi di questa versione

- **Copilot Researcher**: PDF originale, 20 pagine, letto per intero. Contiene 40 link a fonti; li ho estratti dal PDF e ho riaperto quelli rilevanti.
- **Gemini Deep Research**: testo originale (sezioni 1–16), letto per intero. **Non contiene URL**: il registro fonti (§16) usa solo segnaposto `[cite: n]` con nomi di siti. Nessuna affermazione Gemini è quindi tracciabile al link esatto.
- **Fonti originali** riaperte il 12/10/2026: pagine HomeZada (prezzi, FAQ, funzioni, PRO, builder), comunicati stampa, Google Play, Apple App Store, PitchBook, interviste.
- **Stato Dimora**: `docs/mvp-v1.md`, `docs/roadmap.md`, `docs/backlog.md`, `docs/product-backlog.md`, `docs/decisions.md` #72–#77.

### Quattro categorie usate in tutto il documento

| Etichetta | Significato |
|---|---|
| **[DOC]** | Evidenza documentata: letta su una fonte indicata, verificabile da chiunque. Se la fonte è HomeZada vale come prova di ciò che *pubblica* (listino, funzione offerta), non di ciò che *funziona* |
| **[COMM]** | Dichiarazione commerciale: promessa o beneficio affermato dal venditore (o da un concorrente) senza misura |
| **[INF]** | Inferenza: mia deduzione ragionata da evidenze documentate |
| **[IPO]** | Ipotesi strategica: proposta per Dimora, non verificata sul mercato |
| [ND] | Cercato e non trovato (non significa assente) |

---

## 0. Differenze rispetto alla v1.0

### Confermato
| Punto v1.0 | Esito v1.1 |
|---|---|
| Prezzi consumer e professionali | Confermati, coincidono parola per parola nei due originali e nelle pagine HomeZada [DOC] |
| Discrepanza Share $25 vs $49 | Confermata. Copilot la tratta come "$25 obsoleto": inferenza ragionevole, non provata [INF] |
| "Transfer (Gift)" è un'unica operazione, distinta da Share | Confermato. Copilot lo scrive esplicitamente ("il percorso Share è distinto dal Gift/Transfer") [DOC] |
| Nessuna prova pubblica di adozione, retention, conversione | Confermato. Anche Copilot lo dichiara ("Non disponibili: dati pubblici affidabili su utenti attivi…") e Gemini lo lascia come domanda aperta [ND] |
| Gemini "Distribuzione B2B Dimora: Sì" è errato | Confermato [DOC interno] |
| Raccomandazioni Gemini 20–30 € e amministratori bulk premature | Confermato: nell'originale sono esplicitamente "da validare" e marcate [S]/[I], ma in matrice e in §13.B il gift è definito "vincente" e il banner "geniale" senza dati |
| ADR #77 in conflitto con il canale agenzie | Confermato, con stato precisato in §11 |

### Corretto (la v1.0 era sbagliata o imprecisa)
| # | Cosa diceva la v1.0 | Correzione |
|---|---|---|
| K1 | "La discrepanza $90/$99 non è riportata da nessuno dei due" | **Parzialmente sbagliato.** Copilot non segnala il conflitto nella FAQ attuale, ma documenta che **$90 era il prezzo del 2015** (comunicato 17/02/2015). Questo spiega la discrepanza: la FAQ riporta un prezzo di 11 anni fa. Contraddizione **risolta** come residuo obsoleto [DOC + INF] |
| K2 | "Omissione di entrambi: il professionista conserva una copia in sola lettura" | **Sbagliato.** Copilot lo riporta (§6.A) e aggiunge che HomeZada non documenta accesso ai dati aggiunti dopo dal cliente. Solo Gemini lo omette |
| K3 | "Omissione di entrambi: affiliate program" | **Sbagliato.** Copilot lo cita tra i canali (§5, §7) |
| K4 | "Lettura AI di documenti: non trovata" e, in §14, "la lettura AI con conferma di Dimora non è dichiarata da HomeZada" | **Da ridimensionare.** HomeZada dichiara: scanner mobile con AI che rileva il testo dei documenti (OCR), riconoscimento da video con **conferma finale del proprietario**, lettura di marca/modello/seriale dalle targhette. Ciò che **non** dichiara è l'estrazione di campi strutturati da fatture e il collegamento automatico documento → impianto → intervento → garanzia. Il vantaggio Dimora è quindi più stretto di quanto scritto [DOC] |
| K5 | App: Android ~14.900 download, voto 2,37, ultimo aggiornamento 05/03/2024 | **Quadro aggiornato e peggiore**: Google Play mostra 2,2/5 (56 recensioni), 10K+ download, aggiornamento 05/03/2024; **App Store iOS: 2,9/5 su 44 voti, ultima versione 2.4.0 del 27/05/2022**. Copilot aveva già entrambi i dati (data Android 4 vs 5 marzo: differenza di fuso, irrilevante) [DOC] |
| K6 | Forecast: "orizzonte non dichiarato" | **Precisato.** Due funzioni diverse: (a) Major Asset Forecasting (29/04/2026), anno e costo di sostituzione per grafico annuale, senza orizzonte fisso; (b) Finanze: **"three-year forecast"** con aggiornamenti trimestrali. Copilot ha ragione su entrambe. Il "forecast a 5 anni dei costi di manutenzione" di Gemini non compare in nessuna pagina [DOC] |
| K7 | Matrice §2: "Nessuno dei due ha confrontato con i concorrenti italiani" | Confermato, ma Copilot porta fonti italiane primarie (Notariato, FIAIP, IVASS, EDPB, GDPR) per la trasferibilità. La v1.0 non le aveva considerate |

### Nuove evidenze (non presenti nella v1.0)
- Due email automatiche co-brandizzate **al mese** al cliente e tracciamento degli acquirenti nell'account PRO [DOC: pagina buyer's agent]. È il meccanismo concreto del "touchpoint", più invasivo di un semplice logo.
- Builder: template per modello abitativo, trasferimento del profilo, branding a ogni login [DOC]. Nessun cliente builder nominato, nessun prezzo, nessuna riduzione di chiamate di garanzia dichiarata [ND].
- Allerta meteo basata sul National Weather Service USA con consigli AI [DOC]: confermata, ma non trasferibile in sé.
- Integrazione Plaid con banche USA [DOC], comunicato senza data.
- Intervista co-founder del 07/07/2020: "The consumer market is an expensive market to reach" [DOC]. È il motivo dichiarato della svolta verso partner B2B2C.
- Storia prezzi completa: 2013 agente $40/cliente/anno (min. 3); 2015 Premium $59/anno, listing $75, dati acquirente $90; 2026 Premium $99, transfer $99 [DOC].

### Lasciato aperto
Vedi §4: privacy della copia professionale, cosa vede l'agente, $25/$49 (solo inferenza), contenuto del banner, piano che include il forecasting, fondazione 2011/2012, organico e capitale (solo aggregatori).

---

## 1. Sintesi

1. **Il listino è solido, l'uso no.** Tutti i prezzi correnti sono pubblicati e coincidono nei due dossier [DOC]. Nessuna fonte, in nessuno dei due originali né nelle mie verifiche, misura quanti professionisti comprano o quanti clienti rinnovano [ND].
2. **Copilot è affidabile e tracciabile; Gemini no.** Copilot cita 40 link reali e separa verificato/dichiarato/inferenza. Gemini etichetta [V] affermazioni che non reggono (founders e ruoli, grant 2022/23, forecast 5 anni, "pivot dal 2023", riduzione chiamate builder, stima valori AI) e non fornisce URL.
3. **Le app mobili sono ferme**: iOS dal maggio 2022, Android dal marzo 2024, voti 2,9 e 2,2 [DOC]. Per un prodotto che chiede foto e documenti "sul campo" è il segnale più concreto di sotto-investimento [INF].
4. **Il modello PRO è un'infrastruttura di marketing post-vendita**: anno Premium prepagato, banner a ogni login, due email al mese, tracciamento acquirenti [DOC]. Il beneficio per l'agente è dichiarato, mai misurato [COMM].
5. **Il vantaggio "AI che legge i documenti" di Dimora è più stretto di quanto detto in v1.0**: HomeZada ha OCR, riconoscimento video e targhette con conferma utente. Resta da dimostrare che l'estrazione strutturata + collegamento a impianto/intervento/garanzia di Dimora faccia davvero la differenza [INF].
6. **Per l'Italia** HomeZada resta più utile come avvertimento che come modello; lo spazio "fascicolo al rogito" è già presidiato (Immodoc, Faloosa) e la scelta del canale agenzie richiede prima una decisione su ADR #77.

---

## 2. Matrice delle affermazioni importanti

C = Copilot, G = Gemini. "Verdetto" si riferisce all'affermazione così come formulata nell'originale.

### 2.1 Pricing e modelli professionali
| # | Affermazione (chi) | Verdetto | Categoria | URL |
|---|---|---|---|---|
| P1 | Essentials gratis; Premium $99/anno o $15,95/mese; Deluxe $189/anno, 3 proprietà, extra $99/anno (C, G) | Confermata | DOC | homezada.com/homeowners/pricing |
| P2 | Essentials non include manutenzione/reminder (G) | Confermata (manutenzione è nel Premium) | DOC | homezada.com/homeowners/pricing |
| P3 | 300 crediti AI $25; Zada File $75; trasferimento al buyer $99 (C, G) | Confermata sul listino. La FAQ dice ancora $90 per la copia acquirente: prezzo 2015 | DOC | homezada.com/buyers-sellers/pricing · homezada.com/faq · homezada.com/press/first-all-in-one-digital-home-platform-for-the-homeowner-lifecycle |
| P4 | Gift/Transfer $99 una tantum, 1 anno Premium, poi $99 o Essentials (C, G) | Confermata | DOC | homezada.com/professionals/pricing |
| P5 | Share $49/proprietà/anno (C, G) | Confermata su listino e FAQ billing; un'altra FAQ dice $25 | DOC | homezada.com/faq |
| P6 | "$25 è informazione obsoleta" (C) | Plausibile, non provata. Il precedente $90 (2015) rende lo schema "FAQ non aggiornate" credibile | INF | — |
| P7 | Branding renewal $5/cliente/anno (C, G) | Confermata | DOC | homezada.com/professionals/pricing |
| P8 | Volume discount dichiarato, prezzi non pubblicati (C) | Confermata | DOC | homezada.com/professionals/pricing |
| P9 | "L'agente non paga più i $99 dal 2° anno, solo $5" (G) | Confermata | DOC | homezada.com/professionals/pricing |
| P10 | "$99 elevato rispetto a HomeBeacon che offre manutenzione gratis" (G) | Non verificata; fonte è un concorrente | COMM | [ND – nessun URL] |

### 2.2 Funzionalità
| # | Affermazione (chi) | Verdetto | Categoria | URL |
|---|---|---|---|---|
| F1 | Indirizzo → anno, metratura, lotto, profilo finanziario e manutenzione iniziale (C) | Confermata come dichiarazione | DOC (offerta) | homezada.com/homeowners/home-maintenance · comunicato 29/04/2026 |
| F2 | Piano manutenzione creato al signup, reminder email/push, sync calendario (C, G) | Confermata. "iCal" non nominato sulla pagina, ma confermato dallo sviluppatore in una risposta su App Store (2019) | DOC | homezada.com/homeowners/home-maintenance · apps.apple.com/us/app/homezada-mobile/id473722482 |
| F3 | Allerta meteo da National Weather Service con consigli AI (C, G) | Confermata | DOC | homezada.com/homeowners/home-maintenance |
| F4 | Riconoscimento video stanze, conferma finale del proprietario (G) | Confermata | DOC | homezada.com/press/homezada-launches-home-inventory-video-recognition-ai |
| F5 | AI "stima il valore" degli oggetti per l'assicurazione (G) | **Non trovata** nel comunicato video | ND | idem |
| F6 | Scanner mobile con riconoscimento testo, ricerca globale (C) | Confermata | DOC | homezada.com/homeowners/home-document-management |
| F7 | Documenti associati a proprietà, bene, task, contatto (C) | Non confermata sulla pagina documenti (cita solo link esterni) | ND | idem |
| F8 | Major Asset Forecasting dal 29/04/2026, anno e costo, grafico per anno (C) | Confermata. Metodologia non pubblicata (C lo dice) | DOC | comunicato 29/04/2026 |
| F9 | Finanze con "forecast triennale" e aggiornamenti trimestrali (C) | Confermata | DOC | homezada.com/homeowners/home-finances |
| F10 | "Forecast a 5 anni dei costi di manutenzione" (G) | **Non trovata** in nessuna pagina | ND | — |
| F11 | Integrazione Plaid (C, G) | Confermata (banche USA), comunicato senza data | DOC | homezada.com/press/homezada’s-home-fintech-app-integrates-with-plaid-for-home-finances |
| F12 | Export inventario in foglio di calcolo + ZIP (C) | Confermata. Export completo di task/finanze non documentato | DOC | homezada.com/faq |
| F13 | Accesso famiglia gratuito, login separato (C) | Confermata | DOC | homezada.com/homeowners/pricing |
| F14 | "Dal 2023 forte pivot AI testimoniato dai comunicati" (G) | **Non verificabile**: i comunicati AI non hanno data (C lo segnala e non attribuisce anni) | ND | — |

### 2.3 Distribuzione professionale e privacy
| # | Affermazione (chi) | Verdetto | Categoria | URL |
|---|---|---|---|---|
| D1 | Agente: profilo PRO gratis, branding, crea proprietà, carica documenti di closing e foto, invita, trasferisce (C) | Confermata | DOC | homezada.com/professionals/real-estate/buyers-agent · homezada.com/faq |
| D2 | Il professionista conserva una copia in sola lettura (C) | Confermata | DOC | homezada.com/faq |
| D3 | Non documentato l'accesso dell'agente ai dati aggiunti dopo dal cliente (C) | Confermata come lacuna | ND | — |
| D4 | Due email co-brandizzate al mese, tracciamento acquirenti (C) | Confermata | DOC | homezada.com/professionals/real-estate/buyers-agent |
| D5 | Banner dell'agente a ogni login (G) | Confermata | DOC | idem |
| D6 | "Mantiene vivo il brand per anni", referral e repeat business (C, G) | Beneficio dichiarato, mai misurato | COMM | homezada.com/professionals/real-estate · zen.homezada.com/2025/10/16/… |
| D7 | Builder: template, trasferimento, branding (C, G) | Confermata | DOC | homezada.com/professionals/builders |
| D8 | Builder: "riduce le chiamate al customer service post-vendita" (G, marcata [V]) | **Non sulla pagina**; al massimo inferenza | INF | idem |
| D9 | Service provider: Transfer per servizio una tantum, Share per servizio continuativo (C) | Confermata. La pagina dice anche "Keep your copy of clients inventory": il fornitore conserva l'inventario del cliente | DOC | homezada.com/professionals/service-providers · homezada.com/faq |
| D10 | "Modello PRO concretamente monetizzato" (C, tra i vantaggi) | **Sovrastima**: è *prezzato*, non c'è prova di volumi | INF | — |
| D11 | "Modello B2B2C eccellente" (G); gift "vincente", banner "geniale" (G) | Giudizi senza dati | COMM/IPO | — |

### 2.4 Azienda, adozione, app
| # | Affermazione (chi) | Verdetto | Categoria | URL |
|---|---|---|---|---|
| A1 | Fondata nel 2011 (G, [V]); 2011 vs 2012 divergenti (C) | Aperta; vale la cautela di Copilot | ND | pitchbook.com/profiles/company/64889-11 · thetechtribune.com/elizabeth-dodson-of-homezada |
| A2 | Sede El Dorado Hills (G) | Confermata su PitchBook; nel 2013–2015 i comunicati indicano Sacramento | DOC (aggregatore) | pitchbook.com/… |
| A3 | ~5 dipendenti nel 2026, ~$2,4M raccolti (G) | Confermata solo su aggregatore | DOC (aggregatore) | pitchbook.com/… |
| A4 | Seed 2014 "$2,1M guidato da Moneta Ventures" (G) | $2,1M nel comunicato; Moneta "partecipa", "guidato" non è scritto | DOC parziale | homezada.com/press/homezada-closes-a-two-million-seed-round-of-investment |
| A5 | "Grant 2022/2023" (G) | **Non trovati** | ND | — |
| A6 | John Bodrozic CEO, Elizabeth Dodson Sales/Marketing, David Ing CTO (G, [V]) | Bodrozic e Dodson co-founder confermati; ruoli e David Ing **non trovati** | ND | home.agetechcollaborative.org/blogs/scott-axelrod/2022/01/13/spotlight-on-homezada |
| A7 | Google Play 2,4/5, 56 recensioni, 10K+, aggiornamento 4/03/2024 (C) | Confermata (oggi 2,2/5) | DOC | play.google.com/store/apps/details?id=com.homezada.mobile |
| A8 | App Store 2,9/5, 44 voti, versione maggio 2022 (C) | Confermata: 2.4.0 del 27/05/2022 | DOC | apps.apple.com/us/app/homezada-mobile/id473722482 |
| A9 | Recensioni recenti: complessità, import bancario, rimborsi (C) | Confermata; recensioni fino a 11/2024 (iOS) e 10/2025 (Android) | DOC (testimonianze singole) | idem |
| A10 | "Overwhelming" secondo recensori esterni come HomeBeacon (G, [V]) | Fonte è un concorrente; non tracciata | COMM | [ND – nessun URL] |
| A11 | 2020: "il mercato consumer è costoso da raggiungere", servono partner (C) | Confermata | DOC | thetechtribune.com/elizabeth-dodson-of-homezada |
| A12 | Partnership Chubb, Slevin, Plug and Play, Rosie on the House, Wells Fargo: storiche, non confermate attive (C) | Corretto l'approccio prudente | DOC storico | comunicati linkati da Copilot |
| A13 | Marketplace Zada File poco adottato (C) | Confermata: 10 schede, una "Sample Listing" | DOC | homezada.com/listings |

### 2.5 Trasferibilità e implicazioni (affermazioni dei dossier)
| # | Affermazione (chi) | Verdetto | Categoria |
|---|---|---|---|
| T1 | In Italia il notaio, non l'agente, governa controlli e rogito (C) | Supportata da notariato.it e fiaip.it | DOC (fonti IT) |
| T2 | IVASS osservava un ruolo marginale delle assicurazioni nelle catastrofi naturali domestiche (C) | Supportata da Quaderno IVASS n. 13 (2019); dato da aggiornare | DOC (datato) |
| T3 | GDPR: base giuridica, minimizzazione, privacy by design, trasferimenti extra SEE (C) | Corretto; riferimenti EDPB/EUR-Lex | DOC |
| T4 | In Italia le agenzie investono meno in retention post-vendita (G) | Plausibile, nessuna fonte | INF |
| T5 | In Italia il motore è la compliance normativa più dell'assicurazione (G) | Coerente con ADR #72/#74 interni, non con dati di mercato | INF |
| T6 | Partnership con assicurazioni per sconti polizza (G) | Indebolita da T2 e scartata come wedge in ADR #77 | IPO |
| T7 | Test agenti leggero: 20–30 compravendite, onboarding assistito, nessun accesso dell'agente ai dati (C) | Proposta sensata e misurabile | IPO |

---

## 3. Dove Copilot e Gemini concordano senza prove indipendenti

L'accordo tra due AI non è una prova: entrambi leggono **le stesse pagine del venditore**.

- **Prezzi**: identici perché copiati dallo stesso listino. Provano cosa HomeZada chiede, non cosa incassa.
- **Manutenzione come motore di retention**: Copilot lo dichiara [INF], Gemini lo presenta come primo dei "tre motori operativi" [I]. Nessuno ha un dato d'uso. L'unica evidenza esterna (app ferme, voti bassi, recensioni su complessità) va in senso contrario.
- **Valore relazionale per l'agente**: entrambi lo riportano dalla pagina PRO. Gemini lo trasforma in giudizio ("eccellente", "geniale"); Copilot lo tempera ("funziona soltanto se il cliente completa l'onboarding").
- **Dati azienda** (2011, 5 dipendenti, $2,4M): vengono da PitchBook/Tracxn, aggregatori. Copilot dichiara la divergenza sull'anno; Gemini la cancella.
- **"L'AI riduce l'attrito di onboarding"**: entrambi lo affermano; HomeZada non pubblica accuratezza né tasso di correzione (Copilot lo segnala).

---

## 4. Contraddizioni

### Risolte
| Tema | Esito | Base |
|---|---|---|
| Transfer acquirente $90 (FAQ) vs $99 (listino) | **$90 è il prezzo 2015** rimasto nella FAQ. Vale $99 | Comunicato 17/02/2015 + listino 2026 [DOC + INF] |
| Gift vs Transfer vs Share | Gift = Transfer (una operazione). Share è distinto | Pagina prezzi PRO, FAQ [DOC] |
| Forecast 5 anni (G) vs per-anno e triennale (C) | Copilot corretto su entrambe le funzioni; "5 anni" non esiste | Comunicato 29/04/2026, pagina Finanze [DOC] |
| Freschezza recensioni mobile | Non ci sono versioni più recenti: iOS 05/2022, Android 03/2024 | App Store, Google Play [DOC] |
| Distribuzione B2B Dimora "Sì" (G) | Errata: nessun canale attivo | `docs/backlog.md` B12, B39 |
| Builder "riduce chiamate assistenza" [V] (G) | Non presente sulla fonte: inferenza | Pagina builder [DOC] |
| Transfer "dell'intero storico" (G) | Errato: si copiano solo i dati del Zada File pubblicato; i dati personali restano nell'account del venditore | FAQ [DOC] |

### Ancora aperte
| Tema | Perché resta aperto | Come chiuderlo |
|---|---|---|
| Share $25 vs $49 | Solo inferenza che $25 sia obsoleto | Domanda scritta a info@homezada.com o account PRO di prova |
| Privacy della copia in sola lettura del professionista | HomeZada non dice chi è titolare del trattamento, per quanto tempo la copia resta, se include documenti caricati dall'agente con dati personali del cliente | Privacy policy HomeZada (non analizzata da nessuno dei due) + account PRO di prova |
| Cosa vede l'agente col "buyer tracking" | Non descritto: attività di login? apertura email? | Account PRO di prova |
| Contenuto del banner e delle 2 email/mese | Non descritto | Account PRO di prova, screenshot |
| Piano che include Major Asset Forecasting | Non dichiarato | Account Essentials di prova |
| Anno di fondazione, ruoli founder, grant | Fonti secondarie divergenti o assenti | Irrilevante per la strategia |
| Partnership assicurative attive nel 2026 | Solo fonti storiche | Irrilevante salvo riapertura del filone Insurance (scartato da ADR #77) |

---

## 5. Funzionalità HomeZada disponibili oggi

| Funzione | Stato al 12/10/2026 | Categoria |
|---|---|---|
| Inventario, documenti, contatti, 10 chat AI | Disponibile (gratis) | DOC |
| Scanner documenti con OCR, ricerca globale | Disponibile | DOC |
| Manutenzione con piano automatico, reminder email/push, calendario | Disponibile (Premium) | DOC |
| Allerta meteo NWS (solo USA) | Disponibile | DOC |
| Riconoscimento video stanze con conferma utente | Dichiarato (Premium) | DOC (offerta) |
| Targhette → marca, modello, seriale | Dichiarato | DOC (offerta) |
| Major Asset Forecasting | Annunciato 29/04/2026, piano non dichiarato | DOC (offerta) |
| Finanze: valore, mutuo, equity, forecast triennale, Plaid | Disponibile (Premium) | DOC |
| Progetti di ristrutturazione, Visual Design AI | Disponibile | DOC |
| Multi-proprietà, accesso famiglia | Disponibile | DOC |
| Zada File e transfer all'acquirente | Disponibile ma quasi inutilizzato (10 schede) | DOC |
| PRO: Transfer, Share, branding, 2 email/mese, buyer tracking | Disponibile | DOC |
| App iOS | Pubblicata, ultima versione 27/05/2022 | DOC |
| App Android | Pubblicata, ultimo aggiornamento 05/03/2024 | DOC |
| Estrazione campi strutturati da fatture | Non trovata | ND |

---

## 6. Come funzionano davvero Gift, Transfer, Share e Branding

| Modello | Chi paga | Quanto | Meccanica | Dopo il primo anno |
|---|---|---|---|---|
| **Transfer (Gift)** | Professionista | $99 per proprietà, una volta | Il professionista crea la proprietà, carica documenti di closing e foto, la **copia** nell'account privato del cliente. Il cliente riceve 1 anno Premium. Il professionista **conserva una copia in sola lettura** | Il cliente paga $99/anno o scende a Essentials. Il professionista paga $5 per tenere il banner |
| **Share** | Professionista | $49/proprietà/anno (una FAQ dice $25) | Accesso **mutuo e continuativo** alla stessa proprietà tra professionista e cliente o staff. Pensato per property manager e servizi ricorrenti | Si rinnova finché si paga |
| **Branding** | Professionista | Incluso il primo anno, poi $5/cliente/anno | Banner sul dashboard **a ogni login**, **2 email automatiche al mese** co-brandizzate, tracciamento acquirenti nel PRO | Rinnovo cliente per cliente |
| **Transfer Zada File** (consumer) | Venditore o agente; o acquirente | $75 pubblicazione (6 mesi) + $99 transfer | Solo chi ha pubblicato può copiare i dati **del Zada File** all'acquirente; i dati personali del venditore restano privati | — |

**Lettura critica [INF]:** per l'agente il prodotto è un **canale di comunicazione prepagato** verso l'ex cliente. Il valore operativo durante la vendita è nullo; il valore post-vendita dipende interamente dal fatto che il cliente apra l'app o le email. Copilot lo dice in modo esplicito ("il vero prodotto B2B non è il software, ma una relationship infrastructure post-transaction"); è la sua osservazione più utile.

---

## 7. Pricing: quanto è solido

- **Listino**: solido e coerente, salvo due residui obsoleti nella FAQ ($25, $90) [DOC + INF].
- **Traiettoria**: Premium da $59 (2015) a $99 (2026); agente da $40/cliente/anno (2013) a $99 una tantum [DOC]. Un listino che sale senza numeri di adozione non indica economie di scala [INF].
- **Prova di monetizzazione**: nessuna. "Modello PRO concretamente monetizzato" (Copilot) va letto come "prezzato" [INF].
- **Per l'Italia [IPO]**: con una provvigione intorno al 3% per parte su una casa da 200.000 €, l'agenzia incassa circa 6.000 € [stima, ipotesi da verificare]. Né 20–30 € (Gemini) né 99 € sono la barriera; la barriera è il **tempo** dell'agente e l'assenza di beneficio prima del rogito. Copilot (§9) arriva alla stessa conclusione per altra via: "testare sponsor B2B, fee una tantum e freemium prima del SaaS annuale".

---

## 8. Adozione, retention, monetizzazione: evidenze reali

| Indicatore | Evidenza | Categoria |
|---|---|---|
| Utenti, clienti PRO, conversione gift→pagante, churn | Nessun dato pubblico | ND |
| Download Android | 10K+ | DOC |
| Voti app | Android 2,2/5 (56); iOS 2,9/5 (44) | DOC |
| Ultimi aggiornamenti app | iOS 27/05/2022; Android 05/03/2024 | DOC |
| Marketplace Zada File | 10 schede, una di esempio | DOC |
| Organico, capitale | ~5 persone, ~$2,4M (aggregatore) | DOC (aggregatore) |
| Motivo del B2B2C | "Il mercato consumer è costoso da raggiungere" (co-founder, 2020) | DOC |

**Conclusione [INF]:** dopo circa 15 anni non esiste una prova pubblica che il regalo dell'agente generi uso o pagamento. Non prova che il modello fallisca; prova che **HomeZada non può essere citato come dimostrazione che funzioni**.

---

## 9. Lavoro richiesto durante l'onboarding

**Professionista** [DOC]: crea profilo PRO (gratis), branding, proprietà, carica documenti di closing e foto, invita, trasferisce. Il builder può usare template per modello abitativo. Tempo richiesto: [ND].

**Proprietario** [DOC]: signup (email, Google, Microsoft, Apple), indirizzo, profilo generato, poi inventario stanza per stanza, upload foto/video, conferma dei risultati AI, documenti, costi. "I clienti scelgono cosa aggiungere".

**Valutazioni dei due dossier**:
- Gemini: chi riceve dall'agente "entra senza frizioni" [V] → è una [COMM]: nessuna fonte misura la frizione. Gemini stesso aggiunge che il completamento con fatture "richiede lavoro documentale manuale consistente".
- Copilot: "valore immediato" (profilo, calendario, forecast) prima dell'inventario completo [INF ragionevole].

**Lettura critica [INF]:** il guscio pre-compilato dall'agente contiene soprattutto documenti di closing; il valore di manutenzione e storico richiede lavoro del proprietario. È lo stesso collo di bottiglia di Dimora.

---

## 10. Cosa è trasferibile in Italia

| Elemento USA | Giudizio | Categoria |
|---|---|---|
| Closing gift standard da $99 | Poco trasferibile senza validazione (C e G concordano; nessun dato italiano) | INF |
| Banner + 2 email/mese dell'agente | **Rischioso**: in UE servono consenso marketing e base giuridica; contrasta con "la casa è tua" | INF (fonti GDPR in C) |
| Copia read-only conservata dal professionista | **Da non copiare** così com'è: minimizzazione e limitazione della conservazione | INF |
| Notaio come snodo del rogito | Il provisioning potrebbe passare anche dal notaio (C) | IPO |
| Handover builder | Trasferibile come forma, ma il canale costruttore italiano è marginale (ADR #73) | INF |
| Forecast costi di sostituzione | Trasferibile, richiede costi italiani; coerente con ADR #77 | IPO |
| Allerta meteo | Da adattare (fonte dati italiana); utilità non provata | IPO |
| Accesso famiglia | Trasferibile, coerente con B12 | INF |

---

## 11. Confronto con lo stato reale di Dimora

| Proposta emersa | Stato Dimora | Fonte |
|---|---|---|
| Lettura AI di documenti con conferma | **Implementata, in alpha** | `docs/mvp-v1.md` §1, §4 |
| Scheda Asset, interventi, garanzie, ricerca | **Implementata, in alpha** | `docs/mvp-v1.md` §4, §6 |
| Export ZIP, cancellazione | **Implementata, in alpha** | `docs/mvp-v1.md` §8 |
| Piani di manutenzione con suggerimenti | **Implementata**; in alpha solo promemoria essenziali in-app | `docs/roadmap.md` M1, `docs/mvp-v1.md` §6 |
| Notifiche email/push | **In standby per decisione utente** | `docs/backlog.md` B18 |
| Profilo casa catastale/energetico | **Implementata, nascosta in alpha** | `docs/roadmap.md` M2 (B36) |
| Inventario da foto/video (G: "Sì") | **Sovrastimato da Gemini.** Foto di documenti: in alpha. Scansione guidata Genesis: solo **demo con catalogo fittizio**. Foto targhetta reale: pianificata (B43), da misurare in alpha (B65). Video: **ipotizzato** | `docs/mvp-v1.md` §4, `docs/backlog.md` B43, B65 |
| Manutenzione "calendari, notifiche e checklist AI" (G: "Sì") | **Parziale**: calendario e suggerimenti sì; notifiche esterne no; checklist AI no | idem |
| Forecast costi di sostituzione | **Ipotizzata** ("renovation opportunity model") | `docs/decisions.md` #77 |
| Multiutente / famiglia | **Pianificata** (dati pronti, UI mancante) | `docs/backlog.md` B12 |
| Libretto casa PDF | **Pianificata** | `docs/backlog.md` B23 |
| Trasferimento record al nuovo proprietario | **Pianificata a bassa priorità**, prima specifica e threat model | `docs/backlog.md` B39, EPIC 11 |
| Canale agenzie (gift, fascicolo al rogito) | **Ipotizzata**, in tensione con ADR #77 | dossier Agente 3 |
| Amministratori bulk, branding professionista, fee 20–30 € | **Ipotizzate** | originale Gemini §13 |

**Stato di ADR #77** (verificato in `docs/decisions.md` e `docs/roadmap.md`): è una **decisione di direzione registrata** il 16/09/2026 con l'utente: Renovation + Financing come wedge B2B2C prioritario, Transaction Readiness scartata, niente rete tecnici propria. **Non è validata** (B74: colloqui con banche, imprese, installatori ancora da fare) e **non è una fase della roadmap tecnica**. Quindi: oggi il canale agenzie non è "vietato", ma è **in contraddizione con l'ultima decisione scritta**; riaprirlo richiede una nuova decisione esplicita di Vincenzo, non un benchmark.

---

## 12. Raccomandazioni premature, deboli o già presidiate

| Raccomandazione | Fonte | Giudizio | Motivo |
|---|---|---|---|
| Fee agenzia 20–30 € con "penetrazione massiva" | G §13.F3 | **Prematura** | Nessuna prova di WTP; il prezzo non è la barriera |
| Amministratori come distributori bulk | G §12, §13.F4 | **Prematura** | Nessuna evidenza nel benchmark; il cross-analysis interno lo legge come referral senza WTP |
| Gift "vincente", banner $5 "geniale" | G §13.B | **Economicamente debole** | Nessun dato su rinnovi; in UE il banner porta oneri di consenso |
| Partnership assicurative con sconti | G §13.F1 | **Debole** | IVASS (via C) indica ruolo marginale; filone Insurance scartato in ADR #77 |
| Template italiani (libretto caldaia, APE, DM 37/08) | G §13.F2 | **Valida ma in parte già presente** | Profilo casa B36 e check-up normativo esistono nel codice, nascosti in alpha |
| Alert meteo localizzati | G §13.A | **Prematura** | Utilità non provata; non è il problema che Dimora sta validando |
| Escludere Visual Design AI | G §13.F5 | **Condivisibile** | Fuori dal nucleo |
| Passaporto digitale trasferibile | C §10 | **Prematura** | B39 non implementato; Immodoc lo dichiara già |
| Test agenti leggero (20–30 compravendite, nessun accesso dati agente) | C §10 | **Valida come esperimento**, subordinata a ADR #77 | Unica proposta con metriche chiare |
| Builder handover | C §10 | **Debole in Italia** | Nuovo marginale (ADR #73) |
| Forecast vita utile/costi | C §10 | **Da validare** | Coerente con ADR #77; rischio di falsa precisione (C) |
| Libretto all'acquirente, raccolta documenti al rogito | dossier Agente 3 | **Già presidiate** | Immodoc (passaggio al rogito, gratis primo immobile), Faloosa (9,99–69,99 €/mese) |

---

## 13. Correzioni necessarie ai due dossier

### Copilot (qualità complessiva: alta, tracciabile)
1. §5: trasformare "$25 informazione obsoleta" in inferenza esplicita e aggiungere che anche il **$90** della FAQ attuale è un residuo del 2015, già documentato in §8.
2. §11 "modello PRO concretamente monetizzato": sostituire con "prezzato e venduto; volumi non pubblici".
3. §4 "Continuità della memoria venditore-acquirente: funzione distintiva verificata": aggiungere che il marketplace mostra 10 schede, quindi l'uso è marginale.
4. §2 Documenti "associazione a proprietà, bene, task o contatto": non confermata sulla pagina citata; indicare la fonte precisa o declassare.
5. §2 Major Asset Forecasting "tetto, infissi": il comunicato cita esempi di impianti (caldaia, condizionatore, scaldabagno); verificare l'elenco.
6. §3 Mobile: aggiornare Google Play a 2,2/5.
7. Aggiungere la privacy policy HomeZada tra le fonti: il dossier segnala la lacuna privacy B2B2C ma non legge la policy.

### Gemini (qualità complessiva: bassa tracciabilità, molte [V] non sostenute)
1. §16: sostituire tutti i `[cite: n]` con URL; fino ad allora ogni [V] vale come [ND].
2. §2: rimuovere "David Ing (CTO)" e i ruoli CEO/Sales non trovati; rimuovere "grant 2022/2023"; "guidato da Moneta" → "con la partecipazione di Moneta"; segnalare la divergenza 2011/2012.
3. §4.B: rimuovere "stimandone anche il valore per le assicurazioni" (non trovato).
4. §4.E: "Forecast a 5 anni dei costi di manutenzione" → "forecast finanziario triennale" + "Major Asset Forecasting per anno, senza orizzonte fisso".
5. §4.F e §7: il transfer al buyer copia i dati del **Zada File pubblicato**, non "l'intero storico".
6. §5: "entra senza frizioni" da [V] a dichiarazione commerciale.
7. §5, §11: "overwhelming" e "$99 elevato rispetto a HomeBeacon": fonte è un concorrente, marcarla come tale e fornire URL.
8. §6: builder "riducendo le chiamate al customer service" da [V] a [I].
9. §10: "dal 2023 forte pivot AI" da [V] a [ND]: i comunicati non hanno data.
10. §6: aggiungere copia read-only del professionista, 2 email/mese, buyer tracking, discrepanze $25/$49 e $90/$99.
11. §3, §11: aggiungere lo stato delle app (iOS 2022, Android 2024).
12. §13.B: "vincente", "geniale" → ipotesi da validare.
13. §14: "Presente nel progetto Dimora?" → usare implementato / alpha / pianificato / ipotizzato (vedi §11 sopra); in particolare inventario foto/video e B2B non sono "Sì".

### Confronto v0.1
1. Divergenza 1 (fonti): confermata e più grave del previsto per Gemini.
2. Divergenza 2 (fondazione): resta aperta, irrilevante.
3. Divergenza 8 (forecast): chiusa a favore di Copilot.
4. Aggiungere: copia read-only e $90/$99 sono stati trattati da Copilot, non da Gemini.

---

## 14. Le 5 evidenze più importanti per la strategia Dimora

1. **Nessuna prova pubblica che il regalo dell'agente produca uso o pagamento** in circa 15 anni, e il venditore stesso dichiarava nel 2020 che il consumer è costoso da raggiungere [DOC + ND]. Il B2B2C di HomeZada è nato come rimedio a un problema di acquisizione, non come canale dimostrato.
2. **Le app mobili sono ferme dal 2022 (iOS) e dal 2024 (Android), con voti 2,9 e 2,2** [DOC]. Il prodotto descritto dai dossier è in larga parte web; l'uso "sul campo" che Dimora punta a catturare (foto di documenti e targhette dal telefono) è proprio dove HomeZada è più debole.
3. **Il "regalo" PRO è un canale di marketing**: banner a ogni login, 2 email al mese, tracciamento acquirenti, copia read-only all'agente [DOC]. In UE va riprogettato da zero su consenso e minimizzazione.
4. **Il vantaggio AI di Dimora è stretto, non assente**: HomeZada ha OCR e riconoscimento con conferma; Dimora punta sull'estrazione strutturata e sul collegamento automatico a impianto, intervento e garanzia [DOC + INF]. Va dimostrato con la misura B65 in alpha, non dichiarato.
5. **Il forecast dei costi di sostituzione** (29/04/2026) è l'unica funzione nuova di HomeZada coerente con ADR #77: trasforma lo storico della casa in un'informazione che interessa a chi finanzia lavori [DOC + IPO].

---

## 15. Le 3 migliori opportunità da validare

### O1 — Primo valore senza intermediario
Usare l'alpha già prevista per verificare che "documento → conferma → ritrovamento" produca un secondo caricamento entro 7 giorni (soglia `mvp-v1.md`: 40%) e misurare l'estrazione da targhette (B65).
- **Perché prima**: se il proprietario non torna da solo, nessun canale lo farà tornare. È la lezione principale di HomeZada, condivisa da Copilot ("verificare il primo aha moment").
- **Rischi**: campione piccolo (15–20); utenti molto motivati; vantaggio AI meno netto di quanto creduto (evidenza 4).

### O2 — Previsione costi di sostituzione impianti, dentro il filone ADR #77
Mostrare "quando e quanto" potrebbe costare sostituire caldaia, climatizzatore, ecc., con dati già confermati. Validare prima con colloqui B74 se banca o impresa userebbero questa informazione.
- **Perché**: coerente con la decisione già presa, riusa dati esistenti, HomeZada l'ha appena lanciata.
- **Rischi**: costi italiani affidabili non disponibili; falsa precisione e responsabilità (Copilot); WTP del partner non provata.

### O3 — Test agenzie leggero, solo dopo una decisione su ADR #77
Esperimento sul modello proposto da Copilot e dall'Agente 3: 20–30 compravendite, onboarding assistito subito dopo il rogito, branding discreto, **nessun accesso dell'agente ai dati domestici**, misura di attivazione e documenti caricati entro 60 giorni.
- **Perché**: unico canale con un momento di bisogno chiaro.
- **Rischi**: contraddice ADR #77; Immodoc e Faloosa già presenti; il geometra di fiducia come vero concorrente; trasferimento del record non implementato (B39).

---

## 16. Conclusione: HomeZada è un buon benchmark B2B2C per l'Italia?

**Come architettura di riferimento, sì; come prova di mercato, no.**

Copilot conclude che HomeZada è utile "non tanto per la singola feature, quanto per la sua architettura strategica: la casa come record vivo, trasferibile lungo il lifecycle immobiliare". Dopo la lettura integrale concordo su questa parte: HomeZada è il catalogo più completo di **come** si può collegare inventario, manutenzione, forecast e passaggio di proprietà, e di **come** si prezza un canale professionale.

Ma tutto ciò che servirebbe per usarlo come prova (utenti, rinnovi, conversione dei regali, uso delle app) manca, e i pochi segnali pubblici vanno nella direzione opposta: app ferme, voti bassi, marketplace quasi vuoto, organico minimo, FAQ con prezzi di 11 anni fa. Il rischio maggiore, come scrive anche Copilot, è "assumere che il regalo dell'agente produca automaticamente utilizzo e loyalty".

Per Dimora: usarlo come **lista di controllo** di funzioni e meccaniche, non come **argomento** per scegliere il canale agenzie. Per il mercato italiano i confronti decisivi sono Immodoc e Faloosa. Qualunque passo sul canale agenzie richiede prima una decisione esplicita su ADR #77.

---

## Fonti consultate o riaperte (12/10/2026)

**HomeZada**
- https://www.homezada.com/homeowners/pricing
- https://www.homezada.com/buyers-sellers/pricing
- https://www.homezada.com/professionals/pricing
- https://www.homezada.com/professionals/real-estate
- https://www.homezada.com/professionals/real-estate/buyers-agent
- https://www.homezada.com/professionals/builders
- https://www.homezada.com/faq
- https://www.homezada.com/homeowners
- https://www.homezada.com/homeowners/home-maintenance
- https://www.homezada.com/homeowners/home-finances
- https://www.homezada.com/homeowners/home-document-management
- https://www.homezada.com/listings
- https://www.homezada.com/press/homezada-launches-ai-powered-major-asset-forecasting-to-help-homeowners-predict-future-replacement-costs
- https://www.homezada.com/press/homezada-launches-home-inventory-video-recognition-ai
- https://www.homezada.com/press/homezada%E2%80%99s-home-fintech-app-integrates-with-plaid-for-home-finances
- https://www.homezada.com/press/first-all-in-one-digital-home-platform-for-the-homeowner-lifecycle
- https://www.homezada.com/press/homezada-launches-homeowner-lifecycle-platform-for-real-estate-agents
- https://homezada.com/press/homezada-closes-a-two-million-seed-round-of-investment
- https://www.homezada.com/press/homezada-launches-homeowner-marketing-mobile-app-for-pros
- https://zen.homezada.com/2025/10/16/how-realtors-can-stay-top-of-mind-during-slow-seasons-and-give-the-gift-of-homezada/

**Store, aggregatori, stampa**
- https://play.google.com/store/apps/details?id=com.homezada.mobile&hl=en-US
- https://apps.apple.com/us/app/homezada-mobile/id473722482
- https://chrome-stats.com/d/com.homezada.mobile
- https://pitchbook.com/profiles/company/64889-11
- https://www.trustradius.com/products/homezada/reviews
- https://www.inman.com/2013/04/04/homezada-pro-offers-agents-digital-home-profiles-for-buyers/
- https://carriermanagement.com/news/2019/06/26/194912.htm
- https://thetechtribune.com/elizabeth-dodson-of-homezada/
- https://home.agetechcollaborative.org/blogs/scott-axelrod/2022/01/13/spotlight-on-homezada

**Italia (concorrenti e contesto; le fonti normative sono quelle citate da Copilot)**
- https://www.immodoc.it/fascicolo-digitale
- https://faloosa.it/
- https://www.notariato.it/it/casa/latto-pubblico-di-compravendita-o-il-rogito/
- https://www.fiaip.it/agente-immobiliare/
- https://www.ivass.it/pubblicazioni-e-statistiche/pubblicazioni/quaderni/2019/iv13/Quaderno_13.pdf
- https://www.edpb.europa.eu/topics/ai-and-technology/privacy-by-design-and-by-default_en

**Interni**: `docs/mvp-v1.md`, `docs/roadmap.md`, `docs/backlog.md` (B12, B18, B23, B39, B43, B65, B74), `docs/product-backlog.md` EPIC 11, `docs/decisions.md` #72–#77, `docs/competitive-intelligence/strategy/channel-cross-analysis-v0.1.md`, dossier Agente 3.

**Originali analizzati**: `homezada-copilot-original.pdf` (20 pagine), `homezada-gemini-original.txt`, ricevuti da Vincenzo il 12/10/2026 e non versionati in questo repository.
