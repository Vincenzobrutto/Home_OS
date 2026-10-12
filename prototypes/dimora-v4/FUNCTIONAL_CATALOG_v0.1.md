# Dimora — Catalogo funzionale esplorativo v0.1
**Data: 2026-10-12 · Ambito: tutte le esperienze ipotizzate, NON specifica di sviluppo.**

## Come leggere il catalogo
Questo è un inventario per **decidere**. Include ciò che è implementato nello stack HomeOS ma nascosto dalla private alpha, le esperienze già simulate in V4, idee discusse in agosto–ottobre e nuove ipotesi esplicitamente etichettate. La colonna Maturità **non è priorità** né promessa di rilascio. Stato `Core` indica evidenze nella documentazione del repo (non test funzionale qui). `Prototipo` significa schermata simulata. `Sospesa` mantiene la precedente decisione di non procedere. `Nuova ipotesi` non era una decisione precedente.

**Vincoli che non cambiano:** la Private Alpha mostra meno del codice esistente (`docs/mvp-v1.md`); ADR #77 approva *Renovation+Financing* come pista strategica prevalente, mentre Agency Transaction Readiness è una candidata da verificare; notifiche B18 in standby; niente marketplace/dispatch professionisti, certificazioni automatiche, dati ufficiali pubblici inventati o trasferimento indiscriminato.

## Dimora Home — memoria e onboarding

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| H01 | Onboarding Genesis a tre ingressi: impianti, documenti, storia casa | Precedente repo B43 | Prototipo |
| H02 | Questionario progressivo per stanza, impianto ed elettrodomestico; foto targhetta/fattura | Conversazioni settembre + Genesis | Prototipo |
| H03 | Dati immobiliari: catastali, superfici distinte, energetici, agibilità, fonte | Repo B36 | Alpha/core |
| H04 | Planimetria interattiva, piano/stanza, collocazione asset | Vision e Genesis | Esistente fuori alpha |
| H05 | Digital Twin 3D/video scan vero | Vision futura; escluso da MVP iniziale | Horizon |
| H06 | Profilo apparecchiatura: marca, modello, seriale, data, scheda, contatti | Core repo | Alpha/core |
| H07 | Catalogo di asset tipici: elettrodomestici, HVAC, elettrico, idrico, sicurezza, fotovoltaico, F-gas | Onboarding/Compliance | Prototipo |
| H08 | Ricevuta/fattura/manuale/garanzia collegati agli asset | Core repo | Alpha/core |
| H09 | Warranty strutturata, decorrenza, scadenza, evidenza e cedibilità da verificare | B50 | Alpha/core |
| H10 | Storico interventi, riparazioni, installazioni, importi e tecnici | B47, B50 | Alpha/core |
| H11 | Rubrica tecnici, contatti e associati ad asset/interventi | Vision e B47 | Alpha/core |
| H12 | Timeline unica di vita dell’immobile e degli asset | Vision | Alpha/core |
| H13 | Ricerca globale semantica/rapida e recupero documenti | B49 + Home Agent vision | Core+idea |
| H14 | Home Score e Affidabilità del record separati | B44, B48 | Core |
| H15 | Home Detective: mancanze, rischi documentali, suggerimenti motivati | Repo | Core |
| H16 | Gestione multi-casa, comproprietari, famiglia, ospiti e permessi | B12; Claude Round4 | Concept |
| H17 | Cassaforte personale indipendente da pratica e condominio | Round4 V3 | Concept |
| H18 | Accesso professionista limitato per singolo intervento | Vision futura | Concept |
| H19 | Home Agent Q&A su cosa possiedo, documenti e scadenze con citazioni | Vision Home Agent | Horizon |
| H20 | Import assistito email Gmail/Drive, Smart Inbox, document discovery | Vision, B4/B10 | Core parziale |
| H21 | Acquisizione da foto e parsing AI con conferma split-screen | Vision e Gemini | Core+UX |
| H22 | Deduplica, versioni documenti, provenienza e qualità evidenza | B38 e Round4 | Parziale |
| H23 | Richiesta recupero documenti ufficiali via partner/tecnico, servizio assistito | Confronto ImmoDoc ottobre/B75 | Esplorazione |
| H24 | Registro dei documenti da ottenere, ente/fornitore e stato richiesta | ImmoDoc inspiration | Esplorazione |
| H25 | Libretto casa / fascicolo PDF/ZIP esportabile | B23, B54, B62 | Export parziale |
| H26 | Inventario valore beni domestici da fatture, utile ad assicurazione, con limiti | B28 | Esplorazione |
| H27 | Polizze casa, premi, coperture, sinistri e prove di acquisto | B27 + settore assicurativo | Esplorazione |
| H28 | Promemoria non impiantistici: APE, polizze, TARI/IMU, contratti | B27 | Esplorazione |
| H29 | Rilevatori sicurezza fumo/CO/acqua e batterie | B26 | Esplorazione |
| H30 | Impianti multi-componente / System universale | B37: sospeso in attesa bisogni | In attesa |

## Dimora Home — energia e forecast

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| E01 | Storico bollette elettriche via upload, AI propone e conferma | B25: implementazione core | Core |
| E02 | Confronto consumi elettrici anno su anno e stagionalità, correlazione installazioni senza causalità | B25 | Core |
| E03 | Storico bollette gas e Smc, costi fissi/variabili | Richiesta ottobre 2026 | Prototipo V4.2 |
| E04 | Acqua: consumo e bollette | Vision estensione utility | Esplorazione |
| E05 | Budget luce+gas annuo e forecast 5 anni con scenari prezzo e consumi | V4.2 | Prototipo |
| E06 | Forecast manutenzioni e sostituzioni asset su vita utile configurabile | Idea forecasting ottobre | Prototipo |
| E07 | Raccomandazioni risparmio energetico motivate senza fingere misure | Energia consumer e Home | Esplorazione |
| E08 | Import automatico dati contatore intelligente/Chain 2 tramite device terzo | Ricerche consumer energy; distinto dal business retailer | Horizon |
| E09 | Riconciliazione tariffe, oneri, imposte, potenza, offerte e cambio fornitore | Espansione ragionata: non concordata | Nuova ipotesi |
| E10 | Simulatore investimenti efficienza: FV, pompa calore, serramenti, payback con ipotesi visibili | EPBD/energy | Esplorazione |
| E11 | Diagnostica consumi anomali con confronto storico, senza disaggregazione non fondata | Energia consumer | Esplorazione |
| E12 | Pianificazione budget casa aggregato: utenze, manutenzioni, polizze, tributi e CAPEX | Idea V4 forecasting | Prototipo |

## Normativa, manutenzioni e conformità

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| C01 | Piani e occorrenze manutenzione con costi e responsabili | Repo MaintenancePlan | Core |
| C02 | Check-up documentale impianti termici, libretto, RCEE e fonti | Spec v5/v6, repo | Parziale |
| C03 | F-gas: soglie regolatorie versionate e calcoli solo su input confermati | Spec conformità v5/v6 | Parziale/ricerca |
| C04 | APE valido/a rischio/decaduto con condizioni e fonte | Spec v5/v6 | Parziale/ricerca |
| C05 | Regole territoriali con versioni, data e revisione professionale | B41/B42 | Parziale/ricerca |
| C06 | Stato adempimenti documentale separato da Home Score e da certificazione | B44 | Core |
| C07 | Notifiche push/email/calendario manutenzioni | B18 esplicitamente standby | Sospesa |
| C08 | Raccomandazioni assistite con priorità e fonte, non consulenza legale | Vision/Detective | Core+ipotesi |
| C09 | Recupero norme e scadenze regionali aggiornate, con disclaimer revisione | B70, v6 | Esplorazione |
| C10 | Assistente preparazione vendita/affitto: documenti da reperire, nessuna attestazione urbanistica | Strategia transaction readiness | Concept |

## Partner — agenzie immobiliari

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| A01 | Pipeline pratiche con stato, immobili, responsabili senza sostituire CRM | V3/V4 | Prototipo |
| A02 | Link mobile venditore/tecnico per upload guidato e checklist | Gemini/Copilot/Claude | Prototipo |
| A03 | Inbox massiva con classificazione AI, rilevamento duplicati e conferma | Round4 | Prototipo |
| A04 | Property readiness: presente/mancante/incoerente/da verificare + fonte | Round4 | Prototipo |
| A05 | Richiesta documenti mancanti, assegnazione a soggetto e follow-up | ImmoDoc benchmark | Concept |
| A06 | Workspace a permessi differenziati per venditore, acquirente, notaio, tecnico | Round4 | Concept |
| A07 | Scheda tecnica immobile riutilizzabile e vista dati confermati | Round4 | Concept |
| A08 | Esportazione dossier strutturato PDF/ZIP per attori professionali | B23/Gemini | Concept |
| A09 | Preparazione Gift Home prepopolata per acquirente dopo rogito | V3/V4 | Prototipo |
| A10 | Manifesto selettivo e consenso: solo dati consentiti, mai pratica completa | Claude Round4 | Prototipo |
| A11 | Co-branding controllato del Gift senza brand permanente obbligatorio | Gemini, controanalisi | Concept |
| A12 | Status Gift emesso / aperto / riscattato / usato, senza tracking invasivo | Round4 | Prototipo |
| A13 | Prezzo per pratica, free Partner+Gift, canone: comparatore commerciale non billing reale | Round4 | Concept |
| A14 | Raccolta documenti presso enti e professionisti come servizio aggiuntivo | ImmoDoc inspiration | Esplorazione |
| A15 | Commissioni/referral su rinnovo del proprietario, se economicamente e legalmente giustificate | Discussione B2B2C | Esplorazione |
| A16 | Integrazione export/import con Gestim/Getrix e altri CRM | Round4; API non verificate | Esplorazione |

## Partner — amministratori e fabbricato

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| M01 | Anagrafica fabbricato e collegamento autorizzato unità immobiliari | V3/Claude | Prototipo |
| M02 | Documenti parti comuni, categorie e diritto di pubblicazione selettiva | V3/V4 | Prototipo |
| M03 | Impianti comuni: ascensore, centrale, sicurezza, fotovoltaico, contatori | Building Asset Intelligence | Prototipo |
| M04 | Contratti fornitori, scadenze, documenti e responsabili | Gemini + BAI | Concept |
| M05 | Interventi comuni e relativo storico solo come esperienza di consultazione | BAI/Danea benchmark | Concept |
| M06 | Forecast OPEX manutenzione ordinaria e rinnovi contratti | Richiesta V4.2 | Prototipo |
| M07 | Forecast CAPEX pluriennale con scenario anno/importo e accantonamenti | Richiesta V4.2 | Prototipo |
| M08 | Riepilogo spese per assemblea e fabbisogno per unità, con cautele millesimali | Evoluzione forecasting | Esplorazione |
| M09 | Rubrica emergenze/fornitori rilevanti visibile al proprietario | Gemini Round4 | Concept |
| M10 | Pubblicazione 1→N delle parti comuni nelle Home, con fonti e revoca | V3/V4 | Prototipo |
| M11 | Import passivo da Danea/Multidomus, solo se export/API e consenso disponibili | Gemini/Copilot | Esplorazione |
| M12 | Gift o sponsorizzazione Home tramite amministratore, opzionale | Tesi B2B2C | Concept |
| M13 | Bacheca condominiale generale, ticket e contabilità | Competitor benchmark: duplicazione da non prioritizzare | Da contestare |
| M14 | Piano pluriennale di manutenzione dell'intero edificio (BAI avanzato) | Claude BAI Round2 NO GO breve | Horizon |

## Altri partner e canali

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| P01 | Installatore/manutentore: passaporto impianto post-intervento, con foto/targhetta e garanzia | Round3 Claude; aderenza asset core | Concept |
| P02 | Impresa ristrutturazione: handover documenti e impianti a fine lavori | B71, ADR #77 | Concept |
| P03 | Banca/mutuo: raccolta dati documentali previa autorizzazione, nessuna attestazione | ADR #77 renovation+financing | Esplorazione |
| P04 | Compagnia assicurativa: dossier beni/coperture/sinistri e prevenzione | Venture/benchmark | Esplorazione |
| P05 | Property manager/fondi: unit-level record, non full PMS | Benchmark HappyCo/RealPage/BuildingMinds | Esplorazione |
| P06 | Studi notarili/tecnici: destinatario selettivo dossier, non sostituto lavoro tecnico | V3/benchmark | Esplorazione |
| P07 | Agenzie/partner come sponsor di accesso premium o passaggio Owner | Tesi B2B2C | Concept |
| P08 | Acquisto documenti/APE o marketplace e rete tecnici | Vecchie idee, esplicitamente fuori scope prodotto | Sospesa |

## Trasversali, privacy, economia e UX

| ID | Funzionalità / esperienza | Origine | Maturità indicativa |
|---|---|---|---|
| T01 | Un'unica Home, contributi multipli con origine e proprietario in controllo | V3 | Principio |
| T02 | Separazione Pratica/Casa/Fabbricato e privacy per soggetto | Claude Round4 | Principio |
| T03 | Ruoli, grant temporanei, revoche, log condivisioni | Claude Round4 | Concept |
| T04 | Copia autorizzata di dati, mai trasferimento indiscriminato dell'account | Claude Round4 | Principio |
| T05 | Vista ciò che l’AI legge, fonti e livello conferma; nessun claim certificato | ADR/vision | Principio |
| T06 | Export dati e file originali, controllo portabilità e cancellazione | B53/B54/B62 | Alpha/core |
| T07 | Multi-lingua e accessibilità mobile/tablet | Valutazione nuova, non concordata | Nuova ipotesi |
| T08 | Subscription owner / freemium / paywall analisi AI | B24 + B2B2C | Esplorazione |
| T09 | Gift per immobile e riscatto owner, brand partner controllato | Round4 | Prototipo |
| T10 | Dati e feedback di utilizzo (attivazione, retention, rinnovo), privacy by design | Business discovery | Concetto |
| T11 | Forecast con etichette storico/ipotesi/stima, confidenza e fonti | V4.2 | Principio |
| T12 | Interoperabilità futura con registri pubblici/EPBD se accessibili e autorizzati | B70 e scouting | Horizon |
| T13 | Assistente AI con fonti, ricerche, promemoria e suggerimenti contestuali | Vision future | Horizon |

## Griglia di decisione per il prossimo round

Asse A — **desiderabilità**: forte beneficio cliente osservato / plausibile / incerto / nessuno.
Asse B — **distribuzione e business**: acquisizione partner / partner paga / rinnovo owner / sola retention / ignoto.
Asse C — **fattibilità solo qualitativa**: demo facile / dati mancanti / compliance-privacy / integrazioni / professionisti necessari. **Non trasformare questa valutazione in stima di sforzo.**

Per ogni ID registrare decisione `INCLUDERE NEL PROTOTIPO`, `SPOSTARE A ESPLORAZIONE`, `SOSPENDERE`, `SCARTARE`, con motivazione e fonte del feedback. **Nessuna modifica a backlog/roadmap/ADR/code senza richiesta esplicita.**

## Sorgenti esaminate
- `docs/vision.md`, `docs/backlog.md`, `docs/domain-model.md`, `docs/genesis-architecture.md`, `docs/decisions.md`, repository main.
- Analisi multi-agente ottobre Round3/4 e concept V3/V4 sul ramo `research/dimora-four-agent-intelligence-20261012`.
- Discussioni precedenti su Genesis, Dimora/HomeOS, conformità v5/v6, ImmoDoc, HomeZada, HomeBinder, Casavi, energia e forecasting.

## Punti da riconciliare quando selezioneremo
1. In alcune conversazioni vecchie Smart Home IoT/marketplace/3D erano brainstorming; erano esplicitamente **fuori scope MVP**, non roadmap approvate.
2. `UtilityBill` ed estrazione bollette **elettriche** risultano nel codice, anche se schermate Energia sono nascoste in alpha. Gas v4.2 è **solo mock**.
3. Il sistema universale `System` non fu approvato dopo un solo caso: resta in attesa (B37).
4. Per property managers istituzionali abbiamo benchmark di funzioni, non evidenza che sia un buyer Dimora; non costruire un PMS.
5. Forecast CAPEX basato su vita residua non è calcolabile da semplici dati documentali: servono verifiche e ipotesi esplicite.
6. Le cifre dei concorrenti e modelli Gift non sono willingness-to-pay del nostro cliente.
