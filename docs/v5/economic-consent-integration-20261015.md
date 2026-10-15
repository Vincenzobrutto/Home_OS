# Consenso Anthropic economico — integrazione finale senza invii live

15 ottobre 2026. Claude `0c3db1b` e `55aec7f` raccolti come `d8c5e0b` e `a6b7497`. Escluso l'allineamento `4e7fdd9`, già rappresentato nel master. Nessun push/main o modifica a dirty estraneo/check-out Claude.

## Risultato

Consenso locale per documento/provider/account/Home, provider reale solo da capabilities, distinzione dalla prova sintetica, retry esplicito con consenso nuovo e navigazione al nuovo job, body di riprova idempotente dopo perdita risposta, modello/billing in USD separati dai costi della casa. Nessun avvio automatico o consenso in storage/URL. Stato di fatturazione incerto non equivale a zero o rimborso.

Correzione Codex emersa dal confronto col backend: `jobRetryUseful` ora esclude billing.state=uncertain anche con error.code=analysis_timeout (o altro codice transitorio). Prima la UI avrebbe proposto un nuovo tentativo che il backend rifiuta per evitare un doppio invio a pagamento. Aggiunta prova UI esplicita timeout+fatturazione incerta, nessun pulsante retry né POST retries.

## Verifica

- Build/typecheck e lint integrati passati dopo la correzione; avviso bundle circa 721 kB ancora aperto.
- 48 test mirati verdi, tre file (consenso, S1c e client economy), log workspace `outputs/Dimora-V5-consenso-integrazione-test.log`.
- Test nuovo `frontend-v5/tests/integration/economy-consent.int.test.ts` passato contro API reale 127.0.0.1:3001: trasporto del client con cookie/CSRF/Origin/contesto, capabilities realmente disabilitate, upload PDF sintetico, consenso assente rifiutato con 422 validation_error, consenso presente rifiutato con 503 ai_provider_disabled, client riconosce il rifiuto come definito e nessuna bozza creata. Log workspace `outputs/Dimora-V5-consenso-api-reale-test.log`. Il test fallisce PRIMA di ogni analisi POST se il provider risulta inaspettatamente abilitato. Account/casa/documento sintetici lasciati nel solo DB locale dedicato.
- Verifica DB separata: EconomicAiAttempt=0, EconomicAiCampaign=0, AiAttempt M4=8. Nessuna chiamata Anthropic, nessun budget o flag attivato.
- I 311 test completi e le prove browser desktop/mobile del consenso sono evidenza della consegna Claude, non rieseguiti integralmente da Codex. Non ripetuta una navigazione simulata identica. Le 96 prove offline/21DBHTTP backend rimangono evidenza del precedente incremento.

## Risposte ai punti Claude

1. Rifiuti noti come ai_provider_disabled/budget/quota mantengono esito definito, anche 503. Un errore di trasporto non conclusivo conserva la stessa chiave/body; non autorizza un nuovo job a pagamento. analysis_outcome_unknown resta distinto; la UI ora considera anche billing uncertain.
2. Campo server retryable utile ma differito: il contratto congelato non viene ampliato. Lista client conservativa più controllo billing; il server resta autorità e blocca gli invii incerti.
3. Il retry crea un nuovo job e conserva il precedente; il nuovo client segue la risposta, senza aspettare aggiornamenti del vecchio.
4. Testo del consenso adeguato alla funzione tecnica prevista, senza autorizzazione globale o inferenza da spunta fixture. Non è una valutazione legale di termini/privacy.

## Prossima autorizzazione concreta

Campagna economica nuova, separata da M4: proposta massimo 1 USD e massimo tre chiamate Messages su soli PDF sintetici gas/fattura; nessun documento personale. Provider disabilitato fino ad approvazione. Riserva tecnica 0,25 USD per chiamata; il tetto autorizzato è un massimo, non una previsione di costo effettivo. Nessun aumento o reset del plafond durante la prova. Metadata/count con consenso; uso effettivo persistito; errori/esiti incerti mantengono contatore conservativo e non provocano reinvii automatici.

Modello da verificare nel catalogo della chiave prima di invii Messages. Tariffe Sonnet 4.6 della tabella locale confrontate con la [documentazione ufficiale dei prezzi](https://platform.claude.com/docs/en/about-claude/pricing), senza interrogare il provider con la chiave in questa sessione. Non usare un modello non coperto dal tetto della riserva.

Nessun incarico ulteriore per Claude finché si collauda questa integrazione. Nessuna chiamata live svolta e nessuna conformità WCAG dichiarata.
