# Market Strategy — sintesi

**Stato:** documento vivo, punto di ingresso primario per il contesto di mercato.
**Ultimo aggiornamento:** 16 settembre 2026.
**Fonti grezze:** [`market-landscape.md`](market-landscape.md) (panorama competitivo consumer + precedente CIL francese + EPBD IV, raccolto 2026-09-16) e [`market-research-funding-2026.md`](market-research-funding-2026.md) (funding scan Home/Property ultimi 12 mesi, Property Graph, buyer B2B2C, raccolto 2026-09-16). Questo file non li sostituisce: li concilia e li tiene aggiornati come un'unica tesi di lavoro. Per il dettaglio (numeri, fonti, tabelle) si torna sempre ai due originali.

**Quando va riletto obbligatoriamente** (obbligo ereditato da `market-landscape.md`, ora centralizzato qui):
- prima di modificare `docs/vision.md`
- prima di aprire un nuovo canale o un nuovo segmento di utenza
- prima di decidere l'ordine della roadmap oltre la Fase 4
- prima di preparare materiale per investitori o partner
- quando si valuta se una feature è un differenziale o una commodity

---

## 1. La tesi conciliata: il cuneo non è il moat

I due documenti di partenza, letti da soli, sembrano dire cose diverse:

- `market-landscape.md` conclude che il differenziale verificato è **lo strato normativo territoriale** (nessun concorrente mappato sa dire che in Lombardia il controllo caldaia è biennale e in Piemonte quadriennale) — vedi ADR #72.
- `market-research-funding-2026.md` conclude che il moat reale è **la storia privata longitudinale** (eventi, manutenzioni, evidenze accumulate negli anni) — e nello stesso documento valuta la Compliance come il più debole dei quattro wedge B2B2C testabili ("segnale emergente, WTP consumer incerto", §19).

Non sono in conflitto: sono due livelli diversi, già distinti in `market-landscape.md` §4 criterio **C4 — il cuneo non è la promessa** (ADR risalente, coerente anche con `compliance-spec.md` §1.1, documento non ancora scritto ma già citato in entrambe le fonti).

**Come si conciliano:**

| Livello | Cosa | Perché | Rischio se scambiati |
|---|---|---|---|
| **Cuneo** (acquisizione) | Compliance / normativa territoriale | È concreto, urgente, verificabile subito ("la tua caldaia è fuori norma") — genera la prima ragione per aprire l'app | Da solo non basta a trattenere: il CIL francese mostra che l'obbligo normativo non genera adozione nel parco esistente (`market-landscape.md` §2) |
| **Moat** (ritenzione + differenziazione a lungo termine) | Storia privata longitudinale (eventi, manutenzioni, evidenze, garanzie) | È l'unica cosa che un concorrente non può copiare né uno Stato rendere pubblica dall'oggi al domani — si accumula solo nel tempo, asset per asset | Se si insegue solo la normativa come promessa, il prodotto resta commodity nel momento in cui un registro pubblico (EPBD IV) copre lo stesso terreno (`market-landscape.md` §3, `market-research-funding-2026.md` §22) |

**Regola operativa derivata:** una feature di conformità è benvenuta se allarga il cuneo (fa aprire l'app, fa registrare il primo asset), ma non va mai presentata come "il" vantaggio competitivo di Dimora nel lungo periodo. Il vantaggio di lungo periodo si misura in quanta storia reale e verificabile dell'immobile Dimora ha accumulato — non in quante regole normative conosce.

Vedi ADR #74 per la versione formale di questa decisione.

---

## 2. Panorama competitivo — sintesi e un gap da colmare

Sintesi (dettaglio completo nelle due fonti):

- **Consumer maturo, nessun vincitore in 15 anni**: HomeZada (2011), Homer (~5$/mese, copre già gran parte del perimetro Dimora), HomeVaultHQ, Hint (~10M$ seed, "AI Home OS" generico), Casa (~27M$, spinge fino al servizio umano/handyman).
- **Il capitale premia il canale, non l'app**: Digs (25,3M$, canale costruttore), HomeDLBX (handover digitale UK/Irlanda), Zero Homes/DSB/VARM/RenoFi (canale ristrutturazione+financing), Nomos/Axle Energy (canale energy).
- **Normativo europeo**: Digital Building Logbook (progetto Demo-BLog, 4,5M unità coperte) ed EPBD IV (passaporto di ristrutturazione, recepimento italiano in ritardo) — entrambi rischiano di rendere pubblica una fetta del "database della casa".
- **Italia**: gestionali B2B esistenti (AP-Evolution, MaintenUP...) sono sia canale potenziale sia concorrente laterale; nessun operatore consumer italiano rilevante mappato finora (ma vedi B69, da riverificare periodicamente).

**DomiKeep — verificato e ridimensionato (2026-09-16, B73).** `market-research-funding-2026.md` §6 lo segnalava come il concorrente con "sovrapposizione molto alta". Verifica diretta (non solo lettura del sito): è una **landing page pre-lancio** (waitlist/early access, nessun prodotto funzionante, nessun link ad app o dashboard), con **zero presenza web indipendente** (nessuna stampa, Crunchbase, LinkedIn, app store) e un Business ID dichiarato (FI25488174) che **non corrisponde** a quello reale della società finlandese citata come parent ("Positive Productions Oy", Y-tunnus reale 2355279-9). Non va trattato come concorrente operativo reale, solo come segnale che l'idea attrae altri builder — con lo stesso vocabolario normativo EU (EPBD, DBL, BRP) usato in queste due ricerche, il che conferma che quel linguaggio risuona, non che DomiKeep sia una minaccia. Da monitorare, non da temere. Nessun'altra azione finché non emergono segnali concreti di lancio reale.

**Giro di verifica esteso a tutti gli altri (2026-09-16, ADR #76).** Su richiesta dell'utente, verificate con fonti indipendenti altre 16 aziende citate nelle due ricerche: Homer, HomeVaultHQ, Hint, Digs, Smart Bricks, Casa, Zero Homes, RenoFi, Nomos, Dwelly, Deutsche Sanierungsberatung, VARM, Axle Energy, Faura, Neural Earth, ScyAI, Struck, Uniti, Sesame, HomeDLBX. **14 confermate accurate** (round, importi e modello coerenti con stampa/fonti indipendenti). Due correzioni:
- **Smart Bricks** (usata in ADR #73 come prova che "il capitale segue il canale"): raccolta reale, ma è underwriting immobiliare istituzionale — categoria sbagliata, non appartiene a questo confronto. Rimossa dal conteggio "canale" in `market-landscape.md` §1.2.
- **ScyAI**: reale, ma è risk intelligence per portafogli enterprise/industriali, non per il singolo immobile residenziale — sfumatura da tenere presente, non un errore da correggere.

Nessun'altra azienda mostra segnali come quelli di DomiKeep (landing page pre-lancio, business ID incongruente). Il quadro competitivo delle due fonti regge, con le due eccezioni sopra.

---

## 3. Criteri operativi unificati

Da `market-landscape.md` §4 (invariati, restano il primo filtro):

- **C1 — Test di commodity**: se una funzione rientra nel perimetro già coperto da Homer/HomeVaultHQ/DomiKeep, non è un differenziale.
- **C2 — Test di canale**: prima di investire in acquisizione consumer diretta, verificare se la stessa funzione può essere consegnata da chi già entra in casa (impresa di ristrutturazione, agenzia, manutentore).
- **C3 — Test di sopravvivenza al pubblico**: se una funzione diventerebbe inutile quando lo Stato attiva il registro digitale degli edifici, non può essere il fulcro del prodotto.
- **C4 — Il cuneo non è la promessa**: vedi §1 sopra.

Da `market-research-funding-2026.md` §24 e §27, **assunzioni da non dare per validate** (le più rilevanti per le decisioni correnti):

- il proprietario pagherà una subscription mensile solo per organizzare la casa;
- una banca/assicuratore pagherà semplicemente per accedere ai dati Dimora, senza che questi cambino una decisione economica concreta;
- maggiore completezza del Property Graph produce automaticamente maggiore valore economico;
- un DBL proprietario resta differenziato anche se lo Stato offre un'infrastruttura analoga.

E, simmetricamente, **da evitare per ora** (§27): marketplace proprietario di tecnici, promessa di certificazione automatica, dipendenza da subscription consumer come unico modello, integrazioni pubbliche non realmente disponibili, stime di valore immobile non supportate.

---

## 4. Wedge B2B2C — scelto: Renovation + Financing (2026-09-16, ADR #77)

`market-research-funding-2026.md` §19/§25 proponeva quattro wedge B2B2C da testare (renovation+financing, insurance+prevention, energy upgrade, transaction readiness). Con il quadro competitivo verificato (§2 sopra, ADR #74-76), l'utente ha convergito su **Renovation + Financing** (modello RenoFi) come unico wedge prioritario per l'Italia — motivato dal contesto italiano (mutui verdi già spinti da Intesa Sanpaolo/UniCredit, eredità ecobonus/superbonus, canale costruttore assente in scala) e dal pattern verificato senza eccezioni sui 20 competitor analizzati: nessun prodotto puramente consumer monetizza, chi monetizza vende a un buyer con soldi concreti in gioco.

Decisa anche l'assenza di un layer di esecuzione fisica (niente rete tecnici propria come Casa): Dimora resta software + referral.

**Resta comunque non ancora validato, solo scelto come priorità**: prima B74 (colloqui con banca/lender, operatore di ristrutturazione, rete installatori), poi eventualmente un "renovation opportunity model" — non un secondo prodotto da costruire ora. Insurance/Energy/Transaction restano scartati per l'Italia, non necessariamente per un'espansione europea successiva — da riprendere quando si aprirà davvero quel mercato, non un'ipotesi da fissare oggi.

---

## 5. Domande aperte — indice unico

Le domande aperte delle due fonti sono già tracciate in `backlog.md`, per non duplicare uno stesso lavoro in due liste:

| Origine | Backlog | Tema |
|---|---|---|
| `market-landscape.md` §5 (M1) | B68 | Modello e clienti di Hint e Smart Bricks |
| `market-landscape.md` §5 (M2) | B69 | Ricognizione periodica operatori consumer italiani |
| `market-landscape.md` §5 (M4) | B70 | Monitoraggio recepimento EPBD IV |
| `market-landscape.md` §5 (M6) | B71 | Canale "impresa di ristrutturazione" |
| `market-landscape.md` §5 (M7) | B72 | Disponibilità a pagare di un proprietario italiano |
| `market-research-funding-2026.md` §6 | B73 | ~~Analisi approfondita di DomiKeep~~ — fatta e chiusa: non è un concorrente operativo verificabile, solo una landing page pre-lancio, vedi §2 sopra |
| `market-research-funding-2026.md` §19/§25/§26 | B74 | Eseguire i test di validazione dei 4 wedge B2B2C prima di ulteriori pivot (nuovo, da questa sintesi) |

Non tracciate a parte perché già coperte da B72/Fase 0 esistente: `market-research-funding-2026.md` §26 Test 1 ("Value of Data") e Test 4 ("Distribution") si sovrappongono rispettivamente a M7/B72 e a M6/B71.

---

## 6. Come mantenere questo documento

Quando arriva una nuova ricerca di mercato: aggiungerla come fonte grezza datata (stesso pattern di `market-landscape.md`/`market-research-funding-2026.md`), poi tornare qui e aggiornare **solo le sezioni che la nuova fonte cambia davvero** — non riscrivere la tesi da zero ogni volta. Se una nuova fonte contraddice la tesi conciliata di §1, il conflitto va esplicitato qui prima di correggere silenziosamente, con la stessa logica usata per riconciliare le prime due fonti.
