# Anthropic economico — primo collaudo reale autorizzato

15 ottobre 2026. Il committente ha approvato massimo 1 USD e tre analisi su PDF sintetici. Nessun consenso esteso a documenti personali o campagne successive.

## Perimetro e protezione aggiunta

Campagna persistente `economic-live-20261015-r1`, tetto 1000000 microUSD, massimo tre Messages. Modello `claude-sonnet-4-6`: disponibilità verificata con metadata GET prima di qualunque Messages; tariffe già confrontate con documentazione ufficiale nell'integrazione precedente.

Prima di attivare, aggiunta allowlist server dei due SHA256 dei PDF sintetici `docs/v5/fixtures/s1/gas.pdf` e `invoice.pdf`. Nuovo parametro ECONOMY_AI_ALLOWED_SHA256 obbligatorio per configurare la campagna: un altro originale è rifiutato prima della riserva e il controllo viene ripetuto prima di count_tokens e Messages. In questo modo l'attivazione temporanea non consente invii di bollette personali attraverso il resto dell'app.

La allowlist è una restrizione di collaudo, non una nuova funzione richiesta all'utente normale. Per altri documenti servirà un'estensione esplicita dell'autorizzazione. Nessuna modifica frontend, contratti congelati, schema o dati legacy. Il campo è documentato in .env.example senza chiavi.

## Procedura eseguita

Script monouso nel workspace `outputs/Dimora-V5-economic-live-synthetic.cjs`; rifiuta un rapporto preesistente, non effettua replay automatici pagati. Account/Home sintetici separati, normale autenticazione API con cookie/CSRF/Origin/contesto; nessuna sessione o password salvata nel rapporto. Upload dei due originali esatti, avvio con consenso esplicito, polling, revisione delle alternative e conferma del candidato corrente/lordo via API canonica. Nessuno stato browser iniettato.

Gas: proposti e distinti 8000 centesimi correnti, 2000 arretrati e 10000 dovuti; scelta esplicita richiesta. Confermato candidato corrente da 8000 centesimi.

Fattura: riconosciuti imponibile 10000, IVA 2200 e lordo 12200 centesimi. Confermato il lordo, senza sommare i tre candidati.

Due costi canonici, entrambi extraction_confirmed, totale 20200 centesimi. La spesa API non entra nel registro della casa.

## Esito e consumo persistito

| Caso | Messages | Costo effettivo USD | Esito |
|---|---:|---:|---|
| Gas sintetico | 1 | 0.011919 | bozza e costo confermati |
| Fattura sintetica | 1 | 0.009915 | bozza e costo confermati |
| Totale | 2 | 0.021834 | entrambi settled |

Terza chiamata non utilizzata. Nessun retry o esito incerto. Ledger M4 invariato: 8 tentativi. Audit finale DB ha verificato campagna, costi API, due costi canonici e totale. Rapporto macchina senza segreti: `outputs/Dimora-V5-economic-live-20261015.json`.

Provider economico disabilitato in finally e API registrata riavviata. Verificato ai_provider_disabled a fine prova. Budget/campagna/contatori rimangono persistiti, non azzerati. La quota non consumata non causa riattivazione o un nuovo giro di prove automatico.

## Prove tecniche dell'incremento

Build/lint backend verdi. 16 test mirati adapter/ledger DB verdi dopo la restrizione agli originali; incluso rifiuto di originale non autorizzato senza prenotazione o trasferimento (`outputs/Dimora-V5-economic-synthetic-scope-test.log`). Le precedenti suite 96 offline/21 DBHTTP restano evidenza precedente, non rieseguite integralmente in questo giro. I due casi sopra sono le nuove prove live, distinte da quelle simulate.

Non è una validazione generale su bollette reali o scansioni, né una dichiarazione di accuratezza universale o conformità WCAG. OCR, documenti complessi, note di credito, multivaluta e formati ambigui restano esclusi. Conferma utente sempre richiesta.

## Lavoro parallelo Claude

Preparato `outputs/Dimora-V5-incarico-Claude-caricamento-frontend.md`: riduzione del bundle iniziale circa 721 kB con caricamento differito delle sezioni, senza cambiare grafica/funzioni. Checkout isolato Claude; Codex non modifica frontend durante l'incarico. Non è ancora confermato in questa sessione che Claude sia stato avviato. Nessun invio UI a Claude o lavoro in background promesso dopo il turno.
