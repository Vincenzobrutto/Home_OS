# Dimora — Selezione esperienze da prototipare v0.1
**Data:** 12 ottobre 2026 · **Stato:** proposta di priorità esperienze da sottoporre a conferma, non roadmap né specifica tecnica.
**Fonti:** MASTER_FUNCTIONAL_CATALOG_v0.2_20261012.md; DIMORA_HOME_FUNCTIONAL_SCOPE_v0.1_20261012.md; DIMORA_ADMIN_QUESTIONNAIRE_USER_20261012.md; decisioni Agenzie A1–A16 e A16.1–A16.5.
**Principio:** un ecosistema, tre accessi narrativi distinti, stessi fondamentali (documenti, AI assistita, origine, permessi, memoria).

## 1. Raccomandazione di copertura del prototipo

### Essenziali — 3 percorsi end-to-end
**P1 — Home: dalla documentazione alla casa viva**
- Utente: proprietario che attiva Home Free (via invito partner oppure autonomamente).
- Trigger: riceve fascicolo precompilato oppure carica un gruppo di fatture/manuali/certificazioni.
- Passi: vede record casa iniziale → importa documenti/foto → AI classifica, propone asset e interventi → conferma/corregge → consulta inventario/documenti/scadenze → fa domanda con citazione → vede suggerimento contestuale.
- Prova valore: non deve ricominciare da capo né ricordare i documenti.
- Evidenze UX: diff prima/dopo import; provenienza; stato suggerito/confermato; documento recuperabile; azione fattibile.
- Non fingere: ricerca email esterna in tempo reale, conformità garantita, notifiche push, stima mercato certa.

**P2 — Agenzia: dall'incarico al dossier e al regalo**
- Utente: agente / responsabile pratica, più proprietario che contribuisce via link.
- Passi: apertura scheda preliminare (gratuita in concept) → attivazione fascicolo operativo → checklist e caricamento batch → AI estrazione e controllo **completezza+coerenza** con fonti → richiesta documenti via link o caricamento manuale agente → dossier digitale per prospect con livelli accesso → creazione Home Free precompilata per acquirente con selezione esplicita → accettazione/attivazione facoltativa.
- Prova valore: meno lavoro manuale, evidenza di documenti mancanti, dossier condivisibile, differenziazione regalo.
- Mostrare confine: non fare certificazioni urbanistiche/catastali, non CRM, non auto-pubblicare annunci.
- Casi alternativi: incarico senza vendita, venditore riceve Home se lo vuole; altrimenti archivio.

**P3 — Amministratore: documenti A → memoria tecnica B → Home C**
- Utente: amministratore di studio medio.
- Passi: crea scheda preliminare edificio → carica fascicolo misto in batch (verbali, libretto impianto, rapporti, fatture, certificazioni) → AI propone classificazione e collegamento a impianti/interventi → revisione/validazione umana → inventario tecnico e storico → segnala lacune (**completezza**, non verifica sistematica di coerenza) → suggerisce manutenzioni contestualizzate e fonti → pubblica selettivamente documenti comuni e informazioni di competenza di unità → invita massivamente proprietari a Home Free, attivazione volontaria.
- Prova valore primaria: costruzione memoria tecnica senza ricopiare l'archivio. Prova valore secondaria: diffusione Home.
- Casi alternativi: amministratore senza portale può attivare modulo opzionale; cambio amministratore: export strutturato e eventuale presa in carico verificata.
- Nessuna promessa di sincronizzazione con Danea/altro gestionale senza integrazione reale.

### Trasversali — da dimostrare con episodi brevi, non come prodotti separati
- **Fonte e fiducia:** AI propone, user conferma; evidenziare fonte/documento e differenza fra dichiarato, dedotto, verificato da documento, stimato; stato «da verificare».
- **Permessi e condivisione:** mostrare cosa resta privato e cosa passa; accesso progressivo al dossier acquirenti; comune/unità/studio edificio.
- **Memoria e continuità:** timeline interventi, nuove informazioni che non cancellano le precedenti, export e handover selettivo.
- **Portafoglio:** riepilogo essenziale per più case, incarichi o condomini, con account distinti.
- **Free→Pro:** mostrare una singola occasione d'upgrade genuina (es. forecasting di costi Home) senza impedire lettura, aggiornamento o export dei documenti Free.

## 2. Esperienze secondarie: mockup isolati o concept cards
| Modulo | Forma di prova consigliata | Motivo |
|---|---|---|
| Home: budget/consumi/forecast, spese condominiali e mutui | 1 schermata/simulazione coerente con fonti e assunzioni | Le funzioni Home Pro sono importanti per la retention, ma non devono sommergere il racconto principale |
| Home: assicurazioni/inventario per sinistro | 1 schermata con bene, prova d'acquisto e dossier esportabile | Riuso diretto della memoria |
| Home: valore di mercato e migliorie | Concept card con stima esplicitamente indicativa e fonti demo | Rischio AVM non verificato |
| Home: scadenze e notifiche | Dashboard delle scadenze; push/email solo simulati e marcati | B18 sviluppo sospeso |
| Home: documenti ufficiali mancanti | Micropercorso «dove richiederlo» | Hub commerciale partner futuro, escluso da base |
| Agenzia: AI marketing | 1 bozza annuncio/brochure approvabile dall'agente | Premium, non processo di pubblicazione |
| Agenzia: KPI e multisede | 1 overview | Non CRM |
| Amministratore: analisi costi edifici | 1 schermata Premium opzionale | No seconda contabilità |
| Amministratore: portale | 1 vista condominio opzionale | Evitare doppio portale |

## 3. Fuori dal prototipo principale, solo visione futura
- Gemello digitale 3D e sensori IoT.
- Agente AI che contatta tecnici, coordina fornitori o prenota operazioni.
- Gestione completa lavori/ordini/pagamenti condominiali.
- Marketplace/dispatch o recupero documenti come servizio transazionale.
- PMS completo della locazione o contabilità bancaria.
- Sincronizzazioni CRM/gestionali simulate come se operative.
- Report di conformità certificata e validazioni urbanistiche automatiche.

## 4. Scenario e narrativa consigliata per test
**Demo proprietario:** «Ho ricevuto una casa digitale utile subito; oggi aggiungo un documento e lei ricorda cosa riguarda e quando mi servirà».
**Demo agente:** «Ho ricevuto un incarico, chiedo documenti in modo semplice, preparo un dossier migliore e regalo la memoria all'acquirente».
**Demo amministratore:** «Carico documenti disordinati → in pochi passaggi ottengo una memoria tecnica ricostruita e controllabile → la collego ai condomini».

Ciascuna demo dovrebbe chiudersi con il momento di beneficio; evitare tour di 30 schermate non collegate.

## 5. Accettazione UX del concept (non test software)
- Ogni utente capisce in pochi passaggi chi deve fare cosa e perché.
- Le informazioni estratte sono verificabili e correggibili.
- Non si richiede un account esterno a proprietario/fornitore per un semplice contributo documentale.
- Proprietario e partner hanno controllo selettivo sulle condivisioni; nessun dato privato esposto.
- Il valore del prodotto non dipende dall'avere dati completi inizialmente.
- La Home ricevuta in regalo funziona permanentemente anche senza Pro.
- L'amministratore non deve ricopiare nei due sistemi lo stesso storico o scadenzario.
- I momenti Premium sono chiari ma non bloccano il recupero dei propri dati.
- Dove una capacità è solo demo, esporre chiaramente i dati simulati e non fingere disponibilità produttiva.

## 6. Rischi di prodotto e domande di validazione
| Ipotesi | Rischio concreto | Verifica proposta |
|---|---|---|
| Batch AI costruisce memoria utile | Documento poco standard, qualità estrazione incostante | Prova con documenti reali eterogenei e misurazione correzioni |
| Agente paga fascicolo | Costo e tempo superiori ai workflow esistenti | Intervista e prova comparativa con incarico reale |
| Amministratore paga memoria edificio | Gestionale già copre quasi tutto | Test competitivo su un edificio concreto |
| Inviti generano Home attive | Proprietari non completano onboarding o non tornano | Misurare invito→attivazione→uso ricorrente |
| Pro monetizza | Free basta a tutti | Test valore di almeno una funzione Pro ricorrente |
| Document sharing legittimo | Permessi e titolarità complesse | Revisione legal/privacy e threat model prima del prodotto |
| Regole normative e prezzi comparabili | Informazioni non verificabili | Usare fonti aggiornabili o mostrare «da verificare» |

## 7. Decisioni NON prese con questo documento
- Non si è approvata la navigazione, lo stile grafico, un layout o un unico dashboard.
- Non si è selezionato un MVP ingegneristico; la lista è **copertura di prototipo**.
- Non si è approvato un pricing finale, una quota Free/Pro o limiti numerici dei piani.
- Non si è mutato ADR #77, backlog o stato notifiche B18.
- Il prototipo V4 attuale è un riferimento di esperienze e dati demo, NON baseline UX obbligata.

## 8. Brief per la fase UX/UI
Richiedere almeno **due alternative di architettura informativa** per ecosistema Home/Partner, tre user journeys end-to-end sopra, wireframe iniziali con casi limite, data-privacy decision points, stati AI (estratto/confidenza/da confermare), una direzione visual istituzionale ed accessibile, e pianificazione di test di comprensibilità. Prima fare revisione flussi, poi UI high fidelity, infine prototipo aggiornato.

**Da confermare con il committente:** mantenere P1, P2, P3 come percorsi essenziali, senza scambiare priorità dimostrativa per priorità di sviluppo.
