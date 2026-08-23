# Product Backlog — Epiche

12 epiche che coprono la visione completa di HomeOS/Dimora (vedi `vision.md`), dallo stato attuale fino a differenziatori a lungo termine. Non tutte sono pianificate: `stato` indica cosa esiste oggi, `dipendenze` cosa serve prima di poter iniziare le epiche non ancora avviate. Per il lavoro operativo non ancora fatto vedi `backlog.md`; per le decisioni già prese vedi `decisions.md`.

---

## EPIC 0 — HomeOS Genesis (onboarding guidato)

**Obiettivo**: portare una casa appena creata, senza dati, a un primo Digital Twin utile in pochi minuti — informazioni essenziali, documenti, scansione guidata, revisione/conferma, primo Home Score.
**Valore utente**: elimina il "foglio bianco" del censimento manuale casa per casa; il primo risultato utile arriva in minuti, non in settimane di inserimento dati sparso.
**Stato**: ✅ MVP completo (2026-08-04) — wizard 6 step, `HouseScanProvider` mock, Home Score v1, Home Detective con 5 regole, Dashboard aggiornata. Vedi `genesis-architecture.md`.
**Dipendenze**: nessuna verso le altre epiche per l'MVP; dipende da EPIC 1 (Digital Twin Engine) e riusa EPIC 2 (Knowledge Engine) per il caricamento documenti nello step "Documenti".
**Dentro lo scope MVP**: wizard 6 step, scansione dimostrativa (dataset fisso, non vera computer vision), conferma/modifica/scarto delle proposte, calcolo Home Score e Issue al completamento.
**Fuori scope (per ora)**: scansione reale da foto/video. Deduplica assistita e ripresa a grana fine sono state completate con B33/B34 — vedi `genesis-architecture.md`.

## EPIC 1 — Digital Twin Engine (modello casa)

**Obiettivo**: rappresentazione strutturata e navigabile della casa — stanze, impianti, planimetria, posizione degli asset.
**Valore utente**: un inventario vivo e consultabile, non un elenco piatto di oggetti scollegati dal contesto fisico della casa.
**Stato**: ✅ Maturo — `House`/`Floor`/`Room`/`Asset`, planimetria interattiva (disegno stanze, drag asset, rotazione), campi strutturati + campi liberi per asset.
**Dipendenze**: nessuna, è la fondazione su cui poggiano tutte le altre epiche.
**Dentro lo scope MVP**: modello relazionale completo, planimetria 2D con posizionamento manuale.
**Fuori scope (per ora)**: ricostruzione automatica della planimetria da foto/scansione, modello 3D, geolocalizzazione GPS della casa.

## EPIC 2 — Knowledge Engine (documenti e conoscenza)

**Obiettivo**: trasformare documenti grezzi (fatture, manuali, planimetrie, certificati) in dati strutturati collegati agli Asset giusti.
**Valore utente**: non serve trascrivere a mano garanzie, numeri di serie o date di installazione — basta caricare il documento.
**Stato**: ✅ Maturo — estrazione via Claude, matching tipo+nome verso Asset esistenti, creazione automatica di nuovo Asset se non riconosciuto, principio "l'AI propone, l'utente conferma" applicato ovunque. Nota: la specifica Genesis prevedeva solo le "fondamenta" di un `DocumentProcessor` mock — qui è già superato, l'estrazione documentale reale esisteva prima di Genesis e viene riusata così com'è nello step "Documenti" del wizard.
**Dipendenze**: EPIC 1 (serve un Asset a cui collegare l'estrazione).
**Dentro lo scope MVP**: estrazione reale (non mock) per documenti caricati manualmente e via Gmail/Drive.
**Fuori scope (per ora)**: OCR dedicato per documenti manoscritti a bassa confidenza, riconoscimento planimetrie da foto (oggi solo import raster come sfondo).

## EPIC 3 — Home Score & Health Monitoring

**Obiettivo**: un punteggio 0–100 trasparente (5 dimensioni pesate, ogni scostamento spiegato) che riassume lo stato di salute informativa/manutentiva della casa.
**Valore utente**: un singolo numero da tenere d'occhio, con il "perché" sempre visibile — non una scatola nera.
**Stato**: ✅ MVP v1 (2026-08-04) — `common/home-score.ts`, versionato, testato, persistito come `ScoreSnapshot` ad ogni ricalcolo.
**Dipendenze**: EPIC 0 (calcolato al completamento Genesis) e EPIC 1/2/6 (legge dati Asset, documenti, manutenzioni).
**Dentro lo scope MVP**: 5 dimensioni (documentazione, manutenzione, sicurezza, efficienza, completezza), nessuna stima di valore immobiliare o risparmio.
**Fuori scope (per ora)**: confronto con case simili (benchmark). Il trend storico è disponibile in Dashboard con ricalcolo manuale (B35, 2026-08-04).

## EPIC 4 — Home Detective (rilevamento proattivo)

**Obiettivo**: segnalare problemi concreti (documentazione mancante su impianti critici, elementi non confermati, percorso incompleto) senza che l'utente debba cercarli.
**Valore utente**: la casa "parla" quando manca qualcosa di importante, invece di richiedere un controllo manuale periodico.
**Stato**: ✅ MVP (2026-08-04) — 5 regole deterministiche, idempotenti, mai un LLM. Vedi `genesis-architecture.md` §5.
**Dipendenze**: EPIC 0/1/2/6.
**Dentro lo scope MVP**: le 5 regole descritte in `genesis-architecture.md`.
**Fuori scope (per ora)**: regole configurabili dall'utente, predizioni di guasto, notifiche push/email sulle Issue (si appoggerebbe a B18, oggi in standby).

## EPIC 5 — Smart Inbox (acquisizione documenti multi-canale)

**Obiettivo**: far confluire documenti da più fonti (upload manuale, Gmail, Google Drive) in un'unica coda di revisione.
**Valore utente**: non serve cercare manualmente le email con le fatture — HomeOS le trova e le propone.
**Stato**: ✅ Maturo — upload diretto, scansione Gmail e Drive via OAuth, deduplica tra scansioni ripetute, vista candidati unificata.
**Dipendenze**: EPIC 2.
**Dentro lo scope MVP**: le tre fonti esistenti.
**Fuori scope (per ora)**: integrazione PEC, altri provider cloud (OneDrive, iCloud), inoltro email dedicato a un indirizzo HomeOS.

## EPIC 6 — Maintenance & Timeline

**Obiettivo**: pianificare, tracciare e ricordare la manutenzione degli impianti, con uno storico immutabile degli interventi.
**Valore utente**: sapere sempre "quando è stata fatta l'ultima manutenzione" e "quando è la prossima", senza tenerlo a memoria o su un foglio a parte.
**Stato**: ✅ Maturo — piani ricorrenti/una tantum, completamento da documento (anche multi-asset), suggerimenti da linee guida verificate, dismiss persistito.
**Dipendenze**: EPIC 1.
**Dentro lo scope MVP**: tutto quanto sopra.
**Fuori scope (per ora)**: notifiche esterne (B18, in standby), integrazione calendario.

## EPIC 7 — Autenticazione, Multi-utente e Condivisione

**Obiettivo**: isolamento reale per utente e possibilità di condividere una casa con altre persone (coniuge, amministratore di condominio, tecnico).
**Valore utente**: prerequisito di fiducia per qualunque uso oltre il singolo utente locale — oggi chiunque raggiunga il backend vede tutte le case.
**Stato**: ⛔ Non iniziato — `HouseMembership` esiste nello schema (predisposto) ma senza UI/logica di autorizzazione, nessuna autenticazione sulle API. Blocco esplicito e accettato per Genesis (vedi `decisions.md` #25).
**Dipendenze**: nessuna verso le altre epiche, ma **è dipendenza bloccante** per EPIC 0 (isolamento per utente), EPIC 9 (multi-dispositivo) e qualunque esposizione oltre la LAN locale.
**Dentro lo scope MVP**: —
**Fuori scope (per ora)**: tutto — è la prossima epica architetturale prioritaria (B2 in `backlog.md`).

## EPIC 8 — Agente conversazionale (AI Agent)

**Obiettivo**: un'interfaccia conversazionale che risponde a domande sulla casa ("quando scade la garanzia della caldaia?") e propone azioni, oltre alle viste strutturate esistenti.
**Valore utente**: accesso più naturale ai dati già raccolti, specialmente per chi non vuole navigare menu/viste per trovare un'informazione puntuale.
**Stato**: ⛔ Non iniziato — nessun codice, solo menzionato come differenziatore nella visione di prodotto.
**Dipendenze**: EPIC 1/2/3/4 (serve un Digital Twin popolato e motori di score/detective su cui l'agente possa "ragionare"); EPIC 7 (un agente con accesso ai dati personali richiede autenticazione).
**Dentro lo scope MVP**: —
**Fuori scope (per ora)**: chatbot generativo completo, esecuzione di azioni autonome senza conferma esplicita (violerebbe "l'AI propone, l'utente conferma", vedi `decisions.md` #2).

## EPIC 9 — Continuous Learning & Orchestrazione (scansione reale, IoT)

**Obiettivo**: sostituire progressivamente i componenti mock con equivalenti reali — scansione da foto/video con vera computer vision, stato letto da dispositivi smart-home reali invece che da un calendario fisso.
**Valore utente**: il Digital Twin smette di essere "quello che l'utente ha dichiarato" e diventa "quello che si osserva davvero", aggiornato nel tempo senza reinserimento manuale.
**Stato**: ⛔ Non iniziato — esplicitamente fuori scope per lo sprint Genesis MVP (vedi `genesis-architecture.md` §10 per il percorso previsto). Idea correlata già in backlog: B30 (integrazione IoT).
**Dipendenze**: EPIC 0 (il confine `HouseScanProvider` esiste già, va solo implementato per davvero), EPIC 7 (dati da dispositivi personali richiedono autenticazione).
**Dentro lo scope MVP**: —
**Fuori scope (per ora)**: tutto — è la direzione a più lungo termine, non pianificata con una data.

## EPIC 10 — Dimora Property Record & Provenance

**Obiettivo**: portare il modello esistente da digital twin operativo a Property Digital Record esplicito: profilo immobiliare strutturato, eventuale livello `System` validato e provenienza/affidabilità per i dati critici.
**Valore utente**: comprendere non solo cosa il sistema sa della casa, ma da quale fonte lo sa e quanto il dato è affidabile.
**Stato**: 🟡 Parziale — `House`, Asset, Document, timeline, `source` e `confidence` esistono; mancano Property Profile completo, provenance campo-per-campo e livelli di affidabilità. `System` non è oggi un'entità.
**Dipendenze**: EPIC 1/2; EPIC 7 prima di esporre dati a terzi.
**Dentro il prossimo discovery tecnico**: inventario dei campi Property, casi reali multi-asset per decidere `System`, tassonomia `DECLARED`/`EXTRACTED`/`CONFIRMED`/`ATTESTED` senza attribuire valore legale improprio.
**Fuori scope (per ora)**: certificazione legale del record, accesso garantito a catasto/APE/renovation passport, blockchain o firma digitale introdotte senza un caso d'uso validato.

## EPIC 11 — Ownership, Sharing & Record Transfer

**Obiettivo**: consentire, in futuro, che la parte trasferibile del record accompagni l'immobile nel cambio di proprietario, separandola dai dati personali.
**Valore utente**: ridurre la ricostruzione documentale in vendita e preservare lo storico utile della casa.
**Stato**: ⛔ Non iniziato — `HouseMembership` è solo una predisposizione e non equivale a trasferimento.
**Dipendenze**: EPIC 7 obbligatoria; EPIC 10 per provenienza e classificazione dei dati; assessment legale/GDPR prima del design definitivo.
**Dentro il primo scope**: matrice dati `property-bound`/`owner-bound`, ruoli, consenso, audit trail, revoca e handover controllato.
**Fuori scope (per ora)**: trasferimento automatico al rogito, accesso di notai/banche/assicurazioni, dichiarazioni di record certificato o verificato.
