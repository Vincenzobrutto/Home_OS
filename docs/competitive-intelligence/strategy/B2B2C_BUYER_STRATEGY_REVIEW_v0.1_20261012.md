# Dimora — Revisione strategia B2B2C e confronto buyer v0.1
**Data:** 2026-10-12
**Stato:** working paper per decisione umana, NON sostituisce ADR #77 e non autorizza sviluppo.
**Obiettivo:** distinguere buyer, distributor, homeowner e data provider; verificare se Renovation + Financing deve restare un'unica strategia o due separate, confrontandola con agenzie e amministratori.

## 0. Fonti e regole
- ADR #77 `docs/decisions.md` (16/09/2026): seleziona Renovation + Financing come wedge prioritario, scarta Transaction Readiness come acquisizione primaria; software+referral, nessuna rete di esecuzione fisica; B74 colloqui banca, impresa, installatori prima di sviluppo.
- `docs/vision.md`: record strutturato e owner-controlled; AI propone e l'utente conferma; nessun claim certificazione/trasferimento attuale.
- `docs/mvp-v1.md`: private alpha solo documento → AI → conferma → collegamento asset → retrieval; non ci sono B2B workflow o transfer.
- Ricerca Copilot+Gemini+Claude su HomeZada e red team v1.1 PR #2; Agenzie Agente 3 + red team PR #3; Condominiums prima ricerca + red team PDF in chat (schede sul research branch). Evidenze dei venditori ≠ prova di uso/revenue; nessuna WTP primaria raccolta per Dimora.

## 1. Unità d'analisi: buyer ≠ channel ≠ user
**Owner:** crea/usa la memoria della singola abitazione; può pagare un premium, ma nessuna evidenza WTP.
**Buyer:** paga per un job economico misurabile nel suo workflow. 
**Distributor:** presenta Dimora al proprietario; può non pagare.
**Data contributor:** fornisce eventi o file, con basi giuridiche e autorizzazioni; non implica diritto di riuso.
**Service executor:** fornisce interventi fisici; Dimora non lo diventa secondo ADR #77.
È possibile che la stessa organizzazione svolga più ruoli, ma bisogna dimostrarne l'incentivo distintamente.

## 2. Buyer-by-buyer e proposta di valore testabile
### A. Imprese di ristrutturazione e operatori multi-sede
- **Job:** qualificare richieste, ridurre sopralluoghi inutili e raccogliere dati/documenti della casa prima del preventivo.
- **Value hypothesis:** owner autorizza un 'property brief' su impianti, epoca, condizioni e documenti; il professionista sa cosa serve e può valutare interesse per un lavoro.
- **Payer plausibile:** impresa/installatore per lead qualificato, workflow o check-in proprietario. Non assumere commissioni per lavori finché economia e contratti non sono verificati.
- **Rischi:** il dato non sostituisce sopralluogo, falso positivo su opportunità di intervento, rischio trasformarsi in lead-generation/marketplace, difficoltà di acquisire volume.
- **Status:** ALTA priorità per discovery, NON GO prodotto. Test: 5–8 interviste (operatori strutturati e piccoli), 3–5 brief anonimi/consensuali e richiesta di impegno concreto (paid pilot).
- **KPI da registrare:** tempo di qualificazione prima/dopo, dati che eliminano chiamate, completezza documentale, conversione brief → preventivo, WTP.

### B. Reti installatori e manutentori
- **Job:** sapere che cosa è installato, modello/seriale, storico interventi, garanzie e documentazione prima della visita e dopo averla effettuata.
- **Value hypothesis:** fascicolo asset condiviso con accesso temporaneo dal proprietario; documenti dell'intervento ritornano nel record con conferma.
- **Payer:** network o service provider per meno richieste di informazione, miglior servizio e visite preparate; potenziale sponsor owner onboarding.
- **Rischi:** frequenza bassa per singolo cliente, offerta gestionale esistente, oneri di accesso e sicurezza, condivisione B12 non implementata.
- **Status:** ALTA priorità discovery distinta da renovation enterprise. Test: 5–8 operatori, percorsi di 3 visite reali, tempo ricerca e numero richieste mancanti; no sviluppo accesso partner prima del test.

### C. Banche / lender per ristrutturazione e riqualificazione
- **Job:** origination/qualificazione finanziamento lavori, verifica documentale e rischio, relazione con partner interventi.
- **Value hypothesis:** brief proprietario confermato riduce frizione nel reperire dati iniziali; **non** equivale a perizia, attestazione energetica o credit scoring.
- **Payer:** lender o ecosistema di finanziamento se accresce conversione, riduce costi acquisizione o processing; ipotesi non provata.
- **Rischi:** procurement e integrazioni, compliance creditizia, affidabilità dei dati user-entered, soglie di volume, tempi vendita, necessità perizie professionali.
- **Status:** discovery mirata, priorità intermedia; 4–6 colloqui con responsabili prodotto/partnership e operations, non solo innovazione; chiedere ruolo del fascicolo nei gate documentali reali. Nessuna previsione economica proprietaria prima di validazione.

### D. Agenzie immobiliari
- **Job:** raccolta documentale dal venditore al rogito; beneficio immediato se riduce follow-up e ritardi.
- **Buyer:** agenzia per fascicolo/pratica o seller; alternativa agenzia come referral.
- **Competitive:** Faloosa già invita clienti e dichiara raccolta AI, ImmoDoc offre fascicolo e servizi, Gestim workflow documentale Platinum. Nessun vantaggio automatico della sola AI.
- **Risk:** bassa frequenza per singola agenzia, responsabilità verso informazioni note, B12 incompleto, esplicita tensione con ADR #77.
- **Status:** TEST conditional solo con time-box e autorizzazione ADR #77; chiedere pagamento dal primo fascicolo, confrontare spesa/tempo della raccolta ad hoc con competitor.

### E. Amministratori condominiali
- **Job:** amministrazione, eventi edificio, richieste ripetute, passaggio titolarità.
- **Buyer:** poco convincente per nuovo abbonamento; competitor incumbent gestiscono timeline, ticket e distribuzione. Al più referral/data partner con consenso e minimo carico.
- **Rischi:** accesso API non provato, dati condominiali non liberamente riutilizzabili, costo doppio lavoro, imitabilità.
- **Status:** NON target pagante prioritario. Soltanto shadow test offline di Building Events se accesso legittimo; owner-driven handover è un test di caso d'uso transazionale, non prova del canale amministratori.

### F. Assicurazioni
- **Job:** underwriting, prevenzione, documentazione sinistri.
- **Ipotesi:** inventario con documenti e storico impianti potrebbe migliorare gestione del rischio o dei reclami.
- **Rischi:** dati non verificati e di sensibilità elevata; nessuna WTP dimostrata, ADR #77 scarta Insurance/Prevention come wedge.
- **Status:** WATCHLIST, non priorità, salvo iniziativa diretta con partner concreto.

### G. Utility / retailer energia
- **Job:** acquisizione e retention clienti, upgrade efficienza.
- **Ipotesi:** asset e dati energetici potrebbero aiutare interventi/servizi, ma Dimora non ha dati di misurazione affidabili come elemento core dell'alpha.
- **Rischi:** mercato competitivo, assenza prove di integrazione/benefici e WTP, deriva dall'identità centrale.
- **Status:** WATCHLIST, non priorità.

### H. Proprietari / abbonamento B2C
- **Job:** documenti e storico recuperabili al bisogno; non corrisponde a buyer B2B2C.
- **Risk:** valore raro, dipendenza dall'onboarding, retention, paywall percepito.
- **Status:** primo test del valore d'uso; monetizzazione solo dopo activation osservata.

## 3. Ranking qualitativo per sequenza di validazione (NON attractiveness provata)
| Ordine | Buyer | Urgenza economica ipotizzata | Prossimità al core | Difficoltà GTM | Evidenza economica Dimora | Decisione |
|---|---|---|---|---|---|
| 1 | Service network / installatori | Ridurre visite inefficaci e dati mancanti | molto alta (Asset + interventi + garanzie) | media | zero dati pagamenti | Interviste + osservazione |
| 2 | Operatori ristrutturazione | Qualificare intervento e richiesta | alta | media-alta | zero dati pagamenti | Interviste + paid pilot intent |
| 3 | Lender / banca | Documenti per credito lavori | media, da dimostrare | alta | zero dati pagamenti | Discovery processuale |
| 4 | Agenzie | Ridurre rincorse documentali | media | media | competitor con offerte, WTP non diretta | Solo test condizionato |
| 5 | Amministratori | Ridurre lavoro di gestione | debole incrementale | alta | zero | Partner opportunistico |
| 6 | Insurance | Prevenzione/sinistri | non provata | alta | zero | Watchlist |
| 7 | Utility | Efficienza/upgrades | non provata | alta | zero | Watchlist |
Questa tabella ordina **che cosa imparare a basso costo**; non quantifica TAM o valore atteso. Service network e operatori di ristrutturazione sono due segmenti distinti.

## 4. Due economie dentro 'Renovation + Financing'
**Renovation/operators:** ricavo eventuale quando un fascicolo fa ottenere un preventivo/prepara una visita/qualifica un incarico. Buyer vicino al problema operativo, ticket potenziale ricorrente, ma piattaforma deve dimostrare flusso di casi reali.
**Financing/lenders:** ricavo eventuale quando il dato riduce attriti di origination o fa emergere domanda di credito. Dati owner-reported non equivalgono a compliance tecnica o underwriting: servono passaggi terzi verificati. Ciclo d'acquisto probabilmente più oneroso e dipendenza da volume.
**Raccomandazione:** scindere le due ipotesi **nella validazione**, lasciando unica la memoria della casa a livello prodotto.

## 5. Shared foundation e packaging
Core owner: documento, asset, intervento, provenienza, conferma.
Futuro output permissioned: property/asset brief, riferimenti alla prova documentale, stato di completezza (NON conformità), scadenze orientative.
Alternative channel packaging:
- Installer pre-visit brief (buyer professional)
- Renovation opportunity brief (buyer enterprise)
- Finance documentation pack (buyer lender)
- Seller document checklist (buyer agency)
- Owner handover pack (buyer/seller)
NON costruire cinque moduli indipendenti: tutte sono proiezioni sul medesimo record, **solo dopo domanda validata**.
Apertura a terzi, B12 e transfer B39 non sono ancora capacità alpha.

## 6. Test e falsification plan
**Gate 0 (0–2 weeks)**: private alpha 15–20 owner secondo `mvp-v1.md` e primi segnali di utilità. Non sospendere B74, ma non ampliare MVP.
**Gate 1 (2–4 weeks exploratory)**: 5–8 interviste installer/servicer; 5–8 renovation operators; 4–6 lender. Qualitative problem interviews su **ultime 3 pratiche/visite reali**, alternative usate, costo minuti/rework. Presentare esempi di report SOLO con dati fittizi/anomizzati, non codice nuovo.
**Gate 2 (after Gate 1)**: scegliere al massimo 1 buyer per paid concierge pilot. Requisiti proposti, da validare: almeno 3 aziende richiedono demo su un caso reale; almeno 2 approvano pilot pagato o impegno con prezzo e owner consenziente; riduzione osservata di tempo/lavoro o nuova conversione. Se fallisce, zero nuovo sviluppo.
**Gate 3 (optional)**: test agenzie N1 se esplicita decisione di riaprire ADR #77; 10 interviste + 3 notai + 3 geometri, costo raccolta ad hoc e pagamento dal primo fascicolo.
**Exclude**: costruzione gestionali, deep integrations, certificazione compliance, marketplace esecuzione, transfer definitivo senza specifica legal.

## 7. Decisioni umane aperte
1. ADR #77 resta priorità **provvisoria** con due filoni di buyer discovery distinti, oppure si riapre l'intera selezione dei canali?
2. Autorizzare ora le sole interviste ai 3 segmenti (installatori, operatori ristrutturazione, lenders) senza sviluppo? Questo non modifica roadmap.
3. Autorizzare il test agenzie low-cost in parallelo ora o più avanti? Quale budget di tempo?
4. Payer: preferire pagamento professional workflow, referral fee o sponsorizzazione user onboarding? Va deciso **dopo** validazione del job, non prima.
5. Quale proprietà del record e permissioning garantiranno che owner rimanga in controllo quando entra il partner?

## 8. Conclusione e raccomandazione
**Non invertire subito ADR #77.** Far emergere con ricerca sul campo *chi ha un job urgente e pagante*. Iniziare da chi usa direttamente Asset, interventi e garanzie (installatori/service network e ristrutturatori), poi lender (funnel più strutturato); mantenere le agenzie come challenge alternativo a tempo limitato e gli amministratori come futuri data/referral partners. Il core è owner-controlled, non un CRM per partner. Nessun cambiamento roadmap senza decisione umana.

## 9. Evidenze richieste per alzare la confidenza
- Buyer reale con ruolo e budget, frequenza job, attuale spesa/tempo e workaround.
- Prova che il report prodotto da Dimora può essere creato dal record che il proprietario effettivamente completa.
- Confronto contro software esistenti usati dal buyer (non solo elenco competitor consumer).
- Impegno economico e adozione reale, non semplici risposte positive a domande teoriche.
- Requisiti di privacy e responsabilità validati da esperti.
