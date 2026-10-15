# S1c — integrazione frontend con backend reale

15 ottobre 2026. Raccolti Claude `1e76d7f` e `afb9897` come `da0135d` e `d3a27dd`. Escluso allineamento `d6bfb28`, già presente. Nessun push/main, modifica al checkout Claude o dirty estraneo.

## Verifiche Codex

- Build/lint integrati verdi; avviso bundle circa 715 kB aperto. Dopo le modifiche ai soli test, typecheck/lint nuovamente verdi.
- 37 test mirati verdi: S1c, client economy e regressioni Spese S1a/b. Log workspace `outputs/Dimora-V5-S1c-frontend-integrazione-test.log`. La suite completa di 283 test è evidenza della consegna Claude, non una nuova esecuzione completa Codex.
- Una prima esecuzione: 35 verdi e un test oggetto fallito perché findByRole restituiva il nodo prima che il refetch lo sostituisse. Aspettata ora l'asserzione sulla query DOM corrente dentro waitFor; nessun aumento del timeout o modifica al prodotto. Ripetizione mirata verde.
- Aggiunto test risposta di conferma ritardata fino a dopo il logout: resta Accedi senza next privato e senza dati precedenti. Già verde sul codice consegnato, nessuna correzione del prodotto necessaria.

## Percorso browser/API/DB reale

Sessione locale sintetica Prova M4/Casa M4, Vite 5174, API 3001, PostgreSQL V5 dedicato 55432. Nessun simulatore HTTP. File gas.pdf sintetico esatto caricato tramite il normale UploadForm come documento privato; nessuna analisi al caricamento. Avvio fixture scelto e confermato esplicitamente.

Job reale terminato; bozza con citazioni pagina/versione/estratto. Tre candidati separati 80 corrente/20 arretrati/100 dovuto, nessun candidato preselezionato. Scelti 80 e data documento. Accantonamento con avviso perdita edit, reload e ripresa persistente: le scelte non confermate non erano state salvate, come dichiarato.

Conferma ha creato il costo canonico da 8000 centesimi, extraction_confirmed, categoria gas, famiglia Bollette, fonte e metadati. Secondo job sullo stesso originale: candidato esistente riconosciuto, dialogo link_existing e conferma portano allo stesso costo. Dashboard passa da 24060 a 32060 centesimi, cinque record, Bollette 8000. Le due bozze confermate non compaiono più fra le aperte. Console senza errori.

Verifica DB separata di sola lettura (`outputs/Dimora-V5-S1c-verifica-persistenza.cjs`): un solo costo collegato al documento, versione 1 invariata dopo link_existing, due bozze confermate sullo stesso costo, prima bozza versione 4 dopo park/reopen/confirm, due job succeeded fixture. Hash originale corrisponde al PDF di riferimento, documentVersion 1. AiAttempt totale 8 come baseline M4 precedente; nessuna chiamata Anthropic.

Evidenze browser nel workspace: `outputs/Dimora-V5-S1c-revisione-reale.png` e `Dimora-V5-S1c-costo-reale.png`. Dati sintetici lasciati navigabili nel solo DB dedicato. Le interazioni sono state UI; nessuno stato applicativo iniettato.

## Stato e limiti

Percorso S1c integrato e verificato con fixture, non estrazione AI generale. Anthropic economico rimane disabilitato e il relativo adapter non è implementato. Lavoro successivo: adapter, consenso/provider/budget e collaudo separato secondo autorizzazioni correnti, senza riutilizzare automaticamente il plafond esaurito della campagna M4.

Fattura lorda/manuale, CAS/retry, privacy e fonte revocata coperti dai test mirati e backend precedenti; non tutti riprodotti in browser oggi. Responsive e screenshot della nuova revisione sono evidenza Claude: non ripetuti per intero da Codex. Nessuna dichiarazione WCAG o collaudo esaustivo. Limiti S1a/b (riepiloghi H3a e aggregati per gruppo) invariati.

Nessun nuovo incarico inviato a Claude; nessun agente/background promesso dopo il turno.
