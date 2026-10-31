# Integrazione Agenzie nel consolidamento — 31 ottobre 2026

Stato: candidato verificato, pronto all'aggiornamento autorizzato del ramo comune; nessun deploy. Il riscontro remoto è registrato nella sezione Pubblicazione dopo il push.

## Origine e conservazione del lavoro

- Base remota verificata con fetch: `dd52a6af580dedf1641cb2308620c338f2184ae0`.
- Intera PR #71: `7b02700e0e7beb98c8e62d5660ca1bd969f6b903`, 67 commit e 209 file; non solo l'ultimo incremento.
- Ramo candidato `codex/agenzie-integrazione-20261031`, checkout separato `work/agenzie-integrazione-20261031` della chat.
- Nessuna divergenza fra base remota e antenato della PR; merge no-ff senza conflitti. Backend/frontend identici alla punta della PR: nessuna correzione di prodotto necessaria in questa integrazione.
- Checkout consolidato locale `2ab7570` più vecchio del remoto (207 commit indietro), pulito e lasciato invariato. Sorgente Agenzie pulito e lasciato invariato. Alberi legacy `backend/` e `frontend/` identici alla base.
- Aggiornati soltanto documentazione di integrazione, API/architettura, decisione sui rami brevi, roadmap/backlog e avviso sul checkpoint HTTP storico.

## Verifiche post-unione

| Gruppo | Esito | Confine |
| --- | --- | --- |
| Backend ordinari | 658/658, zero saltati | Runner offline standard, build inclusa |
| Frontend completo mock + fixtures | 1743/1743, 172 file, zero saltati | 2 worker, retry 0; 631,93 s; non prova contro un provider reale |
| Sottoinsieme Agenzie del frontend | 169 casi in 19 file | Incluso nei 1743, non sommare |
| DB/API aggregato | 700/700 | 54 HTTP + 644 diretti + 2 dopo riavvio del medesimo cluster nuovo |
| Cestino indipendente | 42/42 | Secondo cluster nuovo, gruppo richiesto separatamente dal runner |
| Typecheck frontend app/config Node | Verde | buildinfo privati |
| Lint frontend Agenzie/review/AppShell/router | Verde | Nessuna asserzione o timeout cambiati |
| Lint backend src/test | Verde | Completo |
| Build frontend | Verde, 7,82 s | Output privato, non pubblicato |

Cluster `QUoNq6` e `jfGXdX` creati dai runner nel nuovo spazio evidenze; migrazioni applicate solo lì. Arresto di entrambi verificato con marker di proprietà e `pg_ctl status` (nessun server, exit 3). Nessun DB/API/storage o processo dell'app esistente modificato. Client Prisma 6.19.3 rigenerato nel checkout privato prima del collaudo DB; nessuna installazione nelle junction condivise. Dipendenze riusate senza modificarle, cache Vite/buildinfo/output privati.

Evidenze locali nella cartella della chat `work/agenzie-integration-evidence-20261031`: backend-unit.log, frontend-full-run.log/results.json, backend-db.log e log dei due run, backend-cestino.log, statici/build. Il primo avvio frontend è fallito prima dei test per l'opzione CLI minWorkers non supportata: rimosso solo quel flag, log iniziale conservato. Warning jsdom scrollTo e PDF legacy osservati e non nascosti. I controlli non attestano accuratezza su nuove planimetrie o completa usabilità browser: nessun nuovo collaudo visuale effettuato in questo lotto.

## Accesso e attivazione separata

Nel codice integrato: menu Agenzie → `/agenzie` → agenzia → pratica (`/agenzie/:agencyId/pratiche/:practiceId`). Pratica con fascicolo/revisione e workspace vani/superficie commerciale distinti; sorgenti/versioni, calibrazione, correzioni e computi rimangono persistenti secondo i contratti della PR.

AppModule usa `agencyApplicationImports`. Capabilities richiedono sessione; modulo completo soltanto con `DIMORA_AGENCY_STORAGE_ROOT` esplicita. L'analisi planimetrie richiede configurazione/credenziali/budget/consenso dedicati, senza fallback simulato nel prodotto. Se non configurato, la pagina lo dichiara. Non è un URL di collaudo aperto ora e non promette che l'app già in esecuzione contenga questo codice: non è stato riavviato o distribuito alcun servizio, né applicata migrazione al database dell'utente.

## Limiti preservati

- Riconoscimento non completo: possibili vani uniti, aree omesse/dubbie e coverage sulle proposte di contrasto ancora da estendere. I tre casi già noti sono sviluppo, non benchmark indipendente.
- Scala da barra/misura nota distinta da foglio A4 presunto: quest'ultimo resta stima, non misura verificata. Coefficienti/muri e superfici richiedono revisione dell'agente; netto e commerciale non equivalenti.
- Candidate proposte, confronto e scarto selettivo separati dai vani adottati; nessuna cancellazione automatica o classificazione di proprietà/destinazione.
- Fatti documentali non equivalgono a proprietà/conferenti attuali o certificazioni. Generazione incarico bloccata senza modello/versione/mapping approvati; orchestrazione AI degli atti ancora da completare.
- Il catalogo AI del31ottobre negli outputs è specifica, non170campi implementati o parte nuova della PR.
- Demo pubblica Alessio invariata. Nessuna AI reale, spesa, originale privato, credenziale o geometria reale aggiunti a Git; nessuna modifica main, force push o deploy.

## Prossimo sviluppo

Il committente ha concordato modulo Agenzie distinto nella stessa architettura, con incrementi brevi dalla base comune aggiornata e integrazione frequente. Prima di nuovo codice verificare remoto e lotti concorrenti. Rilascio/configurazione e modello d'incarico rimangono decisioni separate; questo lotto non li autorizza implicitamente.
