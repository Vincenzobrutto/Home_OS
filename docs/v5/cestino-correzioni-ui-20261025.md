# Correzioni indipendenti frontend cestino — 25 ottobre 2026

Incarico diretto del committente dopo la revisione delle PR #9/#16. Branch `codex/cestino-correzioni-ui-20261025`, nuovo worktree dalla PR #29 (`4ca48b9`), registrazione `397e2c6` prima del codice. Nessuna modifica ai checkout/branch Claude; solo frontend e documentazione. Nessun merge, AI/email, DB/API/storage reale, `.env`, migrazione o salvataggio nell'app.

## Implementazione

- **E1:** il provider scarta lo stato dell'avviso quando cambia pathname, anziché nasconderlo soltanto. Tornando a Documenti non rimonta il vecchio Annulla e non riannuncia uno spostamento già annullato. Non viene rimontato l'intero albero della pagina; chiavi/versioni delle mutazioni restano invariate.
- **D2, completamento frontend coordinato:** useTrash segue nextCursor fino all'ultima pagina prima di pubblicare l'elenco/conteggio. Compatibile con il vecchio backend senza nextCursor. Deduplica per id/lifecycle; un errore nelle pagine successive o un cursore ripetuto fa fallire la query, senza esporre un conteggio parziale alla conferma di svuotamento. Account context e AbortSignal restano comuni a tutte le richieste; nessun retry automatico. Dipende dalla correzione backend D2.
- Le cinque riproduzioni indipendenti precedenti, compresa E1, sono lasciate invariate. Quattro nuovi test del caricamento paginato: 501 elementi, cursore codificato, deduplica per versione; errore della continuazione; cursore ripetuto; compatibilità legacy.

## Verifiche

**Mock completa 882/882 in 108 file**, nessun salto e retry0, un worker; typecheck, lint e build superati. La completa include le 19 prove mirate originali, le cinque riproduzioni indipendenti (5/5, E1 ora verde) e le quattro nuove di paginazione (4/4). Codice a4ada4e. Asserzioni precedenti invariate.

Due esecuzioni mirate iniziali erano 26/28 e 27/28: attese scadute sul link del documento sintetico durante il setup della prima navigazione, prima di verificare E1; nel primo tentativo anche il caso 503 si fermava nello stesso setup. Causa non dimostrata, nessun timeout o asserzione modificati. La completa successiva passa tutti i casi, incluso E1 in 2983 ms e i due AppShell in circa 1500 ms ciascuno. Diagnostica locale conservata, nessun fallimento escluso dalla suite finale.

Dipendenze installate dalla sola cache locale con script/audit/fund disabilitati; harness con ambiente depurato, preload di rete offline ed envDir vuota. Le suite complete frontend non vengono avviate durante i cluster DB di regressione backend.

Browser indipendente ancora bloccato per il permesso salvato dell'origine mock 5186. Nessun tentativo su origini o browser alternativi; il collaudo automatizzato non viene presentato come una prova fisica mobile.

## Consegna prevista

PR verso `claude/cestino-frontend-20261023`; dipendenze backend e successivo aggiornamento dal consolidamento da coordinare prima del merge. Nessuna modifica alla scelta approvata `aiAnalysisSucceeded` della nota sul fornitore AI. Integrazione del cestino al committente; OCR distinto: PR #26 integrata a 69d9f00 e frontend5174 attivato su successiva autorizzazione basata sui test offline, senza attribuire un esito verde al browser bloccato.
