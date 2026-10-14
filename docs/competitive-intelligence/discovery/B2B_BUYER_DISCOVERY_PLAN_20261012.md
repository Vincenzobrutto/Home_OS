# Dimora — Buyer Discovery Plan v1
**Data:** 2026-10-12 · **Autorizzazione:** solo discovery/interviste, nessuno sviluppo o aggiornamento roadmap/ADR.
**Obiettivo:** decidere quale buyer B2B2C ha un problema frequente, costoso e pagante per l'uso autorizzato di un Property Digital Record owner-controlled.

## Perimetro
Tre segmenti separati: **S1 reti installatori/manutentori (6 interviste)**; **S2 imprese/organizzatori ristrutturazioni (6)**; **S3 banche/lender/finanziamento lavori (5)**. Totale target **17 interviste** (ordine di grandezza 15–20). Evitare un solo interlocutore innovation: includere chi opera il processo, chi ha budget e chi decide.
- S1: installatore individuale, rete manutenzione multi-sede, operatore HVAC/caldaie, azienda servizio condizionamento, service manager, titolare.
- S2: general contractor residenziale, impresa ristrutturazioni medio-piccola, responsabile preventivi, organizzatore interventi, impresa multisede, rete professionisti.
- S3: banca responsabile mutui/prestiti casa, product manager prestiti ristrutturazione, operations istruttoria, responsabile partnership, finanziatore specializzato.

## Regole
1. Chiedere **ultime tre pratiche concrete**, non opinioni astratte sull'app; documentare materiali, tempo, fallback, costo, esiti.
2. Tenere separati `[FATTO OSSERVATO]`, `[INTERVISTATO DICHIARA]`, `[STIMA]`, `[IPOTESI]` e `[NON NOTO]`.
3. Non condividere documenti reali di case/clienti in AI o app senza consenso appropriato e minimizzazione.
4. Non chiamare 'verifica', 'certificazione', 'perizia' o 'due diligence' un estratto generato da Dimora; è un **riepilogo preliminare da dati forniti e confermati**.
5. Non chiedere accesso ai sistemi interni. Usare brief sintetici fittizi o anonimi.
6. Non prendere impegni di integrazione, funzionalità, prezzo definitivo, lead generation o referral; rilevare alternative e costi reali.
7. Il buyer non va confuso col distributore: annotare chi approva acquisto, chi usa, chi inserisce documenti, chi autorizza accesso.

## Calendario suggerito (da avviare quando il reclutamento lo consente)
- **Settimana 1:** reperire contatti, inviti, predisporre tre mini-brief con dati fittizi, reclutamento.
- **Settimane 2–3:** 17 colloqui di 25–35 minuti; note standardizzate dopo ogni incontro.
- **Settimana 4:** codifica tematica, mappa competitor realmente usati, calcolo costi/tempi dai casi, confronto, scelta di **massimo un** concierge pilot a pagamento o NO GO.
Nessuna intervista è stata ancora svolta e nessun contatto è stato inviato.

## Domande comuni (25–35 min)
1. Descrivi le ultime tre pratiche/visite reali: che cosa dovevate sapere della casa e quando?
2. Quali documenti/dati mancavano? Da chi li avete richiesti, quante volte?
3. Mostrami (senza dati personali) come gestite il processo oggi: software, email, Excel, gestionali, WhatsApp, portali.
4. Quando una mancanza provoca un secondo contatto, sopralluogo, ritardo o perdita commerciale? Quanto spesso, nelle ultime tre pratiche?
5. Chi è responsabile di raccogliere, verificare e aggiornare dati? Qual è il costo in minuti e rework?
6. Cosa succede quando il proprietario condivide informazioni non complete o inesatte?
7. Quale informazione minimizzata e verificabile sarebbe abbastanza utile da cambiare il flusso?
8. Chi sarebbe autorizzato ad accedere e per quanto? Chi dovrebbe approvare contratti e spesa?
9. Quale prodotto/fornitore già offre questo? Perché non basta?
10. Se ricevessi oggi un riepilogo strutturato di impianti, manuali, interventi e garanzie, **quale azione concreta fareste diversamente?**
11. Per un pilot sul prossimo caso reale, quale impegno potreste prendere: referente, caso, tempo, e **pagamento**? Chi firma?
12. Quale evidenza ti farebbe rifiutare il servizio?

## Domande aggiuntive per segmento
**S1:** prima uscita vs richiamo; targhetta, modello, ricambi, garanzia, ultimo intervento, impianto su cui operare; costo visita a vuoto; quale documento restituisce il tecnico alla casa; software field-service già presente.
**S2:** qualificazione richiesta e preventivo; foto, metrature, impianti, capitolato, APE e lavori precedenti; che cosa richiede sempre sopralluogo/perito; contratto medio e motivi preventivo perso.
**S3:** quando arrivano documenti proprietà e lavori; screening vs underwriting; documenti minimi, verifica indipendente e perizia; conversione, costo back-office, partner referral; volumi minimi richiesti, compliance e procurement.

## Scheda dell'intervista
Ogni intervista in `interviews/` con ID anonimo; nessun nome/contatto personale nel repository.
- Data, segmento, ruolo intervistato, dimensione indicativa azienda, area.
- Job/scenario e 3 casi recenti, livello prova.
- Dati necessari; chi li possiede; attuale strumento e suo costo.
- Tempo per caso / ripetizioni / errori; prezzo oggi pagato per soluzione alternativa.
- Buyer, budget owner, decisore e processo d'acquisto.
- Quale beneficio concreto è testabile; segni di WTP, non solo interesse.
- Ostacoli legali/privacy.
- Citazione *anonimizzata* se autorizzata.
- Red flags, ipotesi confutate, prossima azione.

## Gate di selezione
**Gate A:** processo reale documentato con casi, alternativa e costo.
**Gate B:** miglioramento ragionevolmente ottenibile da dati Dimora **effettivamente raccolti nell'alpha** (non da dati ideali).
**Gate C:** almeno due operatori dello stesso segmento disposti a un test **a pagamento** con decisore identificato. Soglia proposta, non benchmark industriale.
**Gate D:** base giuridica, consenso e modello di accesso fattibili senza sviluppare piattaforma parallela.
**Gate E:** beneficio unitario atteso compatibile con costo del setup/supporto e potenziale frequenza.
Se nessun segmento supera questi gate, **NO GO a sviluppo B2B** per il momento; continuare core owner.

## Output dopo discovery
- Evidence table interview-by-interview e competitive substitutions.
- Unit economics indicativi (con ipotesi, non inventati), rischi.
- One-page pilot brief per **un solo buyer**, costo/volume, stop criteria.
- Decision memo: GO PILOT / RICERCA ADDIZIONALE / NO GO, da approvare dall'utente.

## Stato delle PR
PR #1 (research branch) draft; PR #2 HomeZada e PR #3 Agenzie draft. Nessun merge implicito su main.
