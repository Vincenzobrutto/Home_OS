# Handoff per Codex — consolidamento Home e guida · 15/10/2026

Incarico: `Dimora-V5-incarico-Claude-Home-uso-reale-e-guida.md`. Ho consegnato solo documentazione e demo: **nessuna modifica** a `frontend-v5/src`, backend, contratti, migrazioni, documenti condivisi, mockup ufficiali o main. Nessun push.

Il precedente incarico «Agenzie preparazione» non è stato avviato in questa sessione, come richiesto.

## File

- `frontend-v5/docs/HOME-CONSOLIDAMENTO-AUDIT-20261015.md`: sintesi, 11 scenari, rilievi HOME-CONS-001…016, rosa di 10 interventi, confronto con l'audit del 14/10.
- `frontend-v5/docs/HOME-GUIDA-PRIMO-ACCESSO-20261015.md`: scelta, testi, comparsa, comportamento, criteri.
- `frontend-v5/docs/proposta-home-guida/dimora-home-guida.html`: demo standalone.
- `frontend-v5/docs/screenshots/home-consolidamento-20261015/`: 5 `reale-*` e 3 `demo-*`.
- Questo file.

## Prove

- **Prodotto reale locale** (5174 → 3001, master `5528bb7`). Chrome headless con profilo separato e CDP, clic e tasti reali. Due account sintetici registrati via UI; casa, oggetto, documenti, attività, costi e condivisione creati via UI. Select e campi data impostati con setter nativo più evento, come già dichiarato da Codex in `spese-verifica-percorso`.
- **Proposte** solo con `test_fixture_v1` sui PDF sintetici del progetto. Il provider Anthropic risultava disabilitato e non l'ho toccato.
- **Codice del frontend** confrontato col master: identico salvo i fine riga.
- **Demo:** 23 controlli OK.
- Nessuna suite eseguita: non è cambiato codice.

## Da correggere per primi (rilievi confermati)

1. **HOME-CONS-003:** `DocumentDraftPages.tsx:322` mostra `disabledReason` grezzo (`ai_provider_disabled`). È un difetto della mia consegna S1c: mappare come fa `ActivityPage.tsx:360`. Il testo M3 sul budget («sei chiamate del collaudo…») arriva dal servizio e non va mostrato all'utente.
2. **HOME-CONS-002:** testi caldaia nelle attività create da oggetti (`activities/components.tsx:332`, `ActivityDetailPage.tsx:128-153,328`, `lib/activities.ts:105`).
3. **HOME-CONS-005:** refusi in `review/components.tsx:427`, `SpesePage.tsx:626`, `economy/components.tsx:264`, data ISO in Spese, «Condivisi nella casa» nel filtro Documenti.
4. **HOME-CONS-004:** focus su `body` dopo «Conferma completamento» e «Salva decisione».

## Decisioni di prodotto da presentare al committente

- **HOME-CONS-006:** ordine di Casa con «Da fare ora» e Dettagli della casa in fondo. Allinea il runtime al mockup consolidato del 14/10.
- **HOME-CONS-001:** scheda «Hai ricevuto un codice?» nella pagina senza case.
- **Guida:** pannello in pagina di 3 passi, contro alternative più invasive; persistenza locale ora, lato server in seguito.
- **HOME-CONS-010:** TTL di 15 minuti del codice esterno (sicurezza contro usabilità).

## Possibili API (nessuna inventata, solo da valutare)

- Lettura inversa dei collegamenti G1 attività/documento → oggetti (002, 014).
- Filtro `state` sugli elenchi delle condivisioni, per segnalare i confronti in attesa (007). Facoltativo: basta la prima pagina.
- Preferenza account lato server per la guida, multi-dispositivo.
- Etichetta privata per le consegne esterne (015).

## Dati sintetici lasciati nel DB locale

Li ho conservati per riesame, senza toccare altri record:
- account `audit-home-…@example.test` e `audit-dest-…@example.test`;
- «Casa Audit Sintetica» (`8ad3e2a7-16bc-4831-be05-7787bb829b31`) e «Seconda casa sintetica»;
- PDF `libretto-caldaia-demo.pdf` e `gas.pdf`;
- oggetto «Lavatrice (sintetica audit)», promemoria completato, scheda caldaia con una verifica aperta;
- quattro costi, tra cui la «Bolletta gas settembre» con il PDF collegato, e una condivisione revocata.

Le credenziali stanno solo nello scratchpad della sessione, non nei file consegnati. La password dell'account mittente è comparsa una volta nel log di lavoro per un errore della mia sonda. Se serve, considerare l'account da disattivare.

## Note per i documenti condivisi (aggiornamento a cura di Codex)

- **backlog:** HOME-CONS-001, 003, 006 come «prima di estendere Home».
- **decisions:** scelta della forma della guida, dopo l'arbitrato.
- **changelog:** nessuna voce, perché il runtime non è cambiato.
