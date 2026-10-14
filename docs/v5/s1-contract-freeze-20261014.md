# S1 — baseline congelata per implementazione

14 ottobre 2026. Congelamento dopo autorizzazione del committente a procedere e consolidamento UX. Non attesta implementazione o superamento di test API/DB. La proposta dashboard Claude è sperimentale e separata: nessuna dipendenza per il backend, nessuna nuova API per un grafico che usa gli stessi riepiloghi.

- `s1-economic-history-spec.md` — SHA256 `6ef5006a2e6c2a1d94443000ebecde959cbb4c45590bc9cf8501e2f3cf12fdd5`
- `economic-history-api-contract.md` — SHA256 `1c5f0423e714699496d9d54f0cfea31423bd9545a92dc8856dc9a78b2c31e45f`
- `economic-history-v1-wire-types.ts` — SHA256 `e7ecea083d7c965087f033998d7a04adcdd9cac9f87ce6f4abede0804ad9ce06`
- `economic-history-v1-examples.json` — SHA256 `8eb4df192f81159105b1ccfd93b6988796888fad73cee6a2e47c849e948c47d0`

Chiusure: un solo ingresso Spese, famiglie derivate, nessuna duplicazione; link S1 discriminati e compatibilità link H3a; nullability confronto definitiva, tipi wire ed esempi; documenti uno principale; lavori senza allocazioni; bozze open/parked/confirmed con park/reopen recuperabili e CAS; conferma solo open; provider/costo disabilitati per nuove chiamate paid. Oggetto/lavoro solo selezione umana nel primo estrattore.

Verifica documentale: esempi summary (vuoto, anno0001, confronto positivo), costo/pagina, lavoro e bozza con fonte revocata controllati con TypeScript strict contro i tipi normativi. Parsing JSON e diff whitespace verificati. Nessun test runtime dichiarato.

Prossimo sviluppo: S1a/b con migrazioni additive e test di compatibilità/privacy sul DB V5 dedicato, poi S1c con fixture offline e integrazione frontend. S1 comprende tutte e tre le parti: non dichiarare completamento dopo solo storico. Nessuna installazione o modifica al DB in questa fase. Ogni variazione successiva al contratto richiede aggiornamento esplicito della baseline, non edit silenzioso.
