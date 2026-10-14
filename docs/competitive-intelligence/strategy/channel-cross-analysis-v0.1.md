# Dimora — Analisi trasversale Agenzie / Amministratori v0.1
**Data:** 2026-10-12
**Stato:** bozza analitica; da sottoporre a challenge; nessuna modifica approvata alla roadmap.

## Fonti
- Claude A3: `docs/competitive-intelligence/channels/agencies/dossier-agenzie-immobiliari.md` sul branch `claude/project-thread-swk101`, con features e opportunities CSV. Analisi di 20 operatori e 7 approfondimenti.
- Dossier condominiale PDF condiviso in chat: `dimora_homeos_mercato_condominiale_italiano_20261012_091857.pdf`, 21 pagine, scheda acquisizione in `channels/condominiums/copilot-report-intake-2026-10-12.md`.
- Copilot HomeZada, 20 pagine, scheda `research/homezada/copilot-intake.md`.
Queste sono **analisi di modelli AI**: i claim esterni richiedono verifica primaria. Gemini non ancora ricevuto.

## Convergenza funzionale (ipotesi)
| Nucleo condiviso | Agenzia | Condominio | Owner | Riserva |
|---|---|---|---|---|
| Property Digital Record unico con provenienza | fascicolo dell'immobile in incarico | correlazione evento-edificio/unità | memoria persistente | modelli dati e diritti diversi |
| Intake documentale e conferma | venditore fornisce file; agente vede stato raccolta | studio conferma evento una volta | archivia documenti pertinenti | evitare attribuire certificazione |
| Condivisione selettiva | accesso pratica per professionisti | soltanto dati legittimamente condivisibili | controlla il vault privato | GDPR, controllo degli accessi |
| Timeline casa | raccolta durante incarico | lavori comuni rilevanti per unità | storico consultabile | precisione unità coinvolte |
| Passaggio di proprietà | possibile servizio di handover | evento cambio titolarità | riuso storia dell'immobile | non implementato; data protection |

## Asimmetrie irrinunciabili
- **Agenzia:** evento monetizzabile plausibile nella raccolta documenti e nel rogito, ma overlap alto con Gestim/Faloosa/ImmoDoc; disponibilità a pagare non provata.
- **Amministratore:** rapporto ricorrente, ma principale valore potrebbe non essere per lo studio; portali/ticket/anagrafe già commodity; referral/attivazione leggerissima più plausibile che nuovo abbonamento.
- Il proprietario è il beneficiario duraturo: se l'attivazione non produce un primo risultato utile, nessuno dei due canali sostiene la crescita.

## Quattro ipotesi prodotto da confrontare
### H1 — Professional assisted activation
Professionista invita il proprietario; quest'ultimo popola un fascicolo personale e conferma ogni informazione privata. Provare 2 flussi separati (mandato agenzia, invito studio) con medesimo record e permessi distinti.
**Rischio:** il distributore non riceve beneficio immediato / bassa activation.

### H2 — Document intake / completeness status per la vendita
Visibilità di **presenza / mancanza documentale** nell'incarico senza promettere conformità; i dati acquisiti rimangono nella casa.
**Rischio:** già vicino a Faloosa, ImmoDoc e workflow Gestim; conflitto segnalato da Claude con ADR #77 (transaction readiness precedentemente scartata). La proposta non supera quel vincolo senza decisione umana.

### H3 — Building Events → Property Timeline
Evento confermato dallo studio (lavori o sinistri comuni) diventa candidato evento per unità interessate; owner vede uno storico utile anche fuori dal gestionale.
**Rischio:** complessità integrazioni e base giuridica, replica incumbent, scarsa frequenza per proprietario.

### H4 — Handover selettivo del record
Passaggio controllato di dati oggettivi e documenti scelti da venditore a nuovo owner, con tracciabilità.
**Rischio:** non implementato, trasferibilità legale/contrattuale e WTP non provata; concorrenti adiacenti già attivi.

## Cosa NON sviluppare sulla base di questi report
Nuovo CRM, publishing annunci, contabilità e riparti, portale condominiale generalista, ticketing, semplici newsletter, firma digitale o gestione pratica tecnica sostitutiva dei professionisti.

## Valutazione dei possibili payer
| Segmento | Valore ipotizzato | Evidenza WTP | Test |
|---|---|---|---|
| Agenzia | meno solleciti/documenti tardivi, differenziazione consegna | non dimostrata | test assistito su incarichi reali con prezzo dichiarato |
| Amministratore | meno richieste ripetute / reputazione, eventuale data contribution | non dimostrata | inviti a proprietari, studio quasi passivo |
| Proprietario | consultazione documenti e storia | non dimostrata | activation e riuso entro 30/60gg |
| Terzo professionale | disponibilità documentazione e prestazioni collegate | non dimostrata | interviste e lettere di intenti / prove di pagamento |

## Punto critico: conflitto strategico da esplicitare
Claude indica che ADR #77 del 16/09/2026 aveva scartato la transaction readiness come wedge prioritario, preferendo Renovation + Financing. Occorre recuperare la voce integrale e verificarne motivazioni prima di considerare H2 prioritaria. **Non modificare il registro delle decisioni** sulla base del solo benchmark.

## Challenge ordinati per impatto
1. Per l'agenzia la raccolta documentale risolve un job realmente doloroso o compete con il suo gestionale e il geometra?
2. Per lo studio condominiale quale evento ha sufficiente frequenza e valore economico da giustificare inviti/conferme?
3. Serve un'interfaccia a due ruoli o bastano accesso minimo e link controllato?
4. Qual è il minimo nucleo comune senza integrazione a pagamento coi grandi gestionali?
5. Il proprietario userà attivamente il record dopo l'handover, e quale azione misurabile costituisce proof?
6. Come si gestiscono dati personali dell'ex owner e record tecnico oggettivo nella stessa timeline?
7. L'attivazione tramite amministratore è in realtà solo referral, privo di WTP?
8. ImmoDoc/MigliorPro/Faloosa hanno già caratteristiche o canali che annullano H2/H4?
9. Quali fonti primarie supportano prezzi, API, permessi e trazione riportati nei dossier?
10. Se nessun canale paga, Dimora va semplificata a prodotto proprietario prima di allargare la distribuzione?

## Decisione provvisoria
**Non scegliere ancora un unico wedge.** Favorire nel breve test del nucleo `documento → conferma → ritrovamento` già presente nella private alpha; parallelamente testare H2 con agenzie e H3 con studi, senza impegnarsi a implementarli. Analisi pronta per A2 dopo verifica fonti e secondo benchmark HomeZada.

## Prossimi passi
- Verifica puntuale di ADR #77, fonte legale e claim competitor ad alta rilevanza.
- Red team indipendente di H2 e H3.
- Confronto con report Gemini HomeZada quando ricevuto.
- Non modificare `docs/roadmap.md`, `docs/backlog.md` né `docs/decisions.md` finché non interviene una decisione esplicita.
