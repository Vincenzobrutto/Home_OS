# Agente 2 — Sintesi multi-canale e Red Team integrato v0.1
**12 ottobre 2026 · Stato: proposta strategica, NON decisione approvata.**
**Non modificare ADR #77, roadmap, backlog o codice.**

## 1. Fonti e limiti
- HomeZada: Copilot PDF 20 pp; Gemini Deep Research 265 righe; Claude red-team v1.1 in PR #2 (`claude/homezada-red-team-v1ld3v`). I dossier originali sono nella conversazione; schede, confronto e sintesi su questo branch.
- Agenzie: Claude Agente 3 dossier + CSV nel branch `claude/project-thread-swk101`; red team indipendente in PR #3 (`claude/red-team-agenzie-20261012`).
- Amministratori: dossier e red team Copilot, ciascuno di 21 pagine, caricati in conversazione; intake files su questo branch.
- Materiali di prodotto: `docs/vision.md`, `docs/mvp-v1.md`, `docs/decisions.md` ADR #77, `docs/backlog.md`, `docs/roadmap.md`.
- Non equivalgono a proof of adoption, WTP o compliance legale. Qualunque nuovo claim vendor ad alta rilevanza richiede riverifica su fonte primaria e data.

## 2. Lettura comune
Dimora è un **Property Digital Record** di singola abitazione sotto controllo proprietario: documenti + estrazione dati strutturati proposta dall'AI e confermata dall'utente + sistemi/asset + interventi + provenienza + accesso recuperabile.
Le tre economie differiscono:
1. **Owner:** beneficiario della memoria, ma retention e subscription WTP non provate.
2. **Agenzia:** beneficio immediato potenziale di gestione pratica; soluzioni sovrapposte Faloosa, ImmoDoc, Gestim; N1 test possibile ma con pagamento reale dal primo fascicolo.
3. **Amministratore:** dati condominiali già nei gestionali, accesso contingentato e lavoro di conferma; incentivo debole. Preferibile partnership futura/referral rispetto a cliente pagante primario.
4. **Renovation + Financing:** l'ADR #77 sceglie questo wedge; resta da validare con partner (B74). HomeZada forecasting asset offre analogia di prodotto, non prova del business.

## 3. Matrice strategie (valutazione qualitativa, non punteggio oggettivo)
| Wedge | Problema + chi paga | Sovrapposizione | Dipendenze / rischi | Verdetto provvisorio |
|---|---|---|---|---|
| Owner first: onboarding documento → conferma → recupero | proprietario usa; payer non dimostrato | vault / HomeZada / ImmoDoc | onboarding e riuso | **priorità alpha già pianificata** |
| Renovation + Financing | owner ottiene previsione; banca/impresa potrebbe pagare, non dimostrato | fintech/servizi/AI asset forecasting | costo dati, risk falsa precisione, procurement | **prima validare ADR #77** |
| Agenzie N1: intake documenti da venditore | agenzia o venditore potrebbe pagare alla pratica | **alta**: Faloosa (anche invito clienti e IA), ImmoDoc, Gestim Platinum | dovere informativo, confronto costo raccolta ad hoc, B12 | **TEST condizionato e time-boxed** solo con decisione esplicita su ADR #77 |
| Agenzie N2: handover al buyer | agency branding o seller/buyer fee non dimostrati | ImmoDoc e HomeZada, MigliorPro | B39 non implementato; privacy, attivazione buyer | **non sviluppare ora**; eventuale prototipo assistito senza trasferimento account |
| Agenzie N3: ereditati/datati | nicchia ipotizzata | Notai, geometri, ImmoDoc successione | problemi successori distinti dai dati tecnici | **solo segmento test** |
| Condo Building Events → Property Timeline | owner valore, admin lavoro; payer non dimostrato | **alta**: Danea/Multidomus; Condeo diario | API/accesso, base giuridica, replica incumbents | **shadow test offline opzionale**, NO sviluppo |
| Condo anagrafe onboarding | nessuno disponibile a pagare dimostrato | gestionali esistenti | privacy, purpose creep | **NO GO standalone** |
| Cambio proprietà owner-driven | seller/buyer/agenzia potenziale payer | ImmoDoc, HomeZada | privacy e legal threat model; B39 | **solo validation test**; non confonderlo col canale amministratori |

## 4. Incoerenze da non appiattire
- Red team amministratori promuove l'handover owner-driven a TEST prioritario *rispetto agli altri casi condominiali*, mentre red team agenzie marca libretto buyer N2 **NO GO ora come prodotto autonomo**. **Non sono necessariamente contraddizioni:** test di bisogno e packaging manuale senza piattaforma di trasferimento può essere giustificato; non è giustificato costruire B39 con account migration.
- Claude A3 propone N1 come miglior test agenzie, ma ADR #77 del 16/09/2026 **scarta Transaction Readiness come wedge prioritario**. Necessaria autorizzazione esplicita a riaprire un test limitato; non sostituire la decisione.
- HomeZada è listino/offerta e catalogo UX, **non dimostrazione di successo B2B2C**. Su AI foto/OCR già presenta capacità; il vantaggio Dimora va dimostrato sulla strutturazione e legame documenti–asset–eventi, non sull'esistenza di AI.
- Un canale può distribuire senza pagare; senza prova di activation l'accesso alla platea degli intermediari non è trazione.

## 5. Esperimenti raccomandati nell'ordine
**E0 — Private alpha owner:** osservare documento → estrazione → conferma → recupero, secondo upload a 7/30 giorni e quali asset concludono realmente. Nessuna nuova feature prima di chiudere il ciclo di valore.
**E1 — B74 Renovation + Financing, secondo ADR #77:** colloqui con paganti plausibili (banche, imprese di ristrutturazione, installatori), domanda ancorata a workflow e pagamento, controllando qualità dei costi sostituzione impianto. Evitare sviluppare forecast prima delle evidenze.
**E2 — Agenzie N1 solo su via libera umano:** phase 0: 10 agenzie (5 Gestim, 5 Getrix), 3 notai, 3 geometri, costo raccolta ad hoc su 3 incarichi; chiedere prezzo test **dal primo fascicolo**; poi solo se soglie raggiunte 5 agenzie × 3 fascicoli pagati; nessun claim conformità e nessuna costruzione di B12 prima della soglia.
**E3 — Handover owner-driven:** soltanto test concierge dell'utilità, selezione documenti e intenti di pagamento, con privacy/legal preliminare. Non includere sviluppo trasferimento record.
**E4 — Eventi condominiali:** solo shadow test offline di 20 attività in 2 condomìni; stop se pochi eventi veramente legati all'unità, o se tempo conferma sproporzionato. Nessun connettore strategico ora.

## 6. Decisioni da sottoporre all'utente (NON prese dall'Agente 2)
1. **Strategia base:** confermare ADR #77 come guida finché B74 non valida o aggiornare esplicitamente la priorità commerciale.
2. **Challenge agencies:** autorizzare E2 come esperimento limitato, oppure sospenderlo fino a B74.
3. **Handover:** autorizzare solo proof manuale senza account transfer, oppure tenerlo in backlog.
4. **Amministratori:** declassarli *operativamente* a partnership/opportunità futura fino a nuove evidenze, senza cancellare idee né cambiare roadmap.
5. **Review legale:** prevedere supporto professionale su informativa, documento condiviso, ruolo dell'intermediario, responsabilità e trasferibilità prima di un pilot con dati reali.

## 7. Priorità della prossima settimana
- Concludere owner private alpha setup e metriche del primo aha moment.
- Reclutare interviste B74 partner con agenda guidata.
- Richiedere decisione umana sul test agenzie time-boxed e risorse.
- Conservare i dossier originali in luogo governato con metadati e versioning; i file integrali di ricerca non sono ancora tutti nel repo.
- Tenere PR #2 e #3 in draft finché non completata verifica/documentazione; unione in branch di ricerca solo dopo review, non in main.

## Decision log
**PENDING**. Questo dossier non cambia `docs/decisions.md`, `docs/roadmap.md`, `docs/backlog.md` e non approva nuovi claim.
