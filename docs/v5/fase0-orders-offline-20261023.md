# Fase 0 — ordini Samsung e macchina da caffè: verifica e correzioni offline

23 ottobre 2026. Branch `codex/fase0-ai-quality-v3`. Nessuna chiamata AI, rete provider, email o accesso al DB reale. Originali letti localmente, esclusi dal repository; nessuna trascrizione di destinatari, identificativi ordine, indirizzi o coordinate di pagamento inclusa nelle fixture.

## Evidenza reale e comportamento atteso

| Caso | Oggetto e prezzo | Spedizione e totale | Date e pagamento |
|---|---|---|---|
| Samsung, due pagine dello stesso ordine | Un frigorifero combinato da incasso Samsung, prezzo stampato 849,15 €. Modello oscurato: assente. «Altro Incasso» non identifica un secondo apparato: da chiarire, senza inventare costo o oggetto. | Spedizione 75,00 €; totale ordine 924,15 €. Subtotale 1.099,00 € e sconto 249,85 € sono ruoli distinti: nessun prezzo ricavato sottraendoli. | Data ordine 13/10/2024. PayPal è metodo, non prova/data di pagamento. Nessuna consegna effettiva documentata. |
| Macchina da caffè, una pagina | De’Longhi Rivelia, riferimento EXAM440.35.B, prezzo stampato 499,00 €. Una scheda da confermare; stanza non documentata. | Spedizione 0,00 €; totale 499,00 €. Subtotale IVA esclusa 409,02 € e IVA 89,98 € non diventano prezzi alternativi o ulteriori spese. | Ordine del 14/06/2026; stampa del riepilogo 01/08/2026 distinta. «Consegnato 16 giugno» non riporta l’anno: non viene completato. Metodo bancario e termine di reso non provano data di pagamento o garanzia. |

Entrambi i PDF sono raster: il worker PDF reale restituisce `pdf_text_unavailable`. I numeri sopra sono lettura visiva locale, NON estrazione automatica verificata. Le prove del validatore usano osservazioni manuali deidentificate: alcune fixture aggiungono dichiaratamente una etichetta di ruolo normalizzata per isolare la regola di prezzo. Un test separato con righe visive prive di tale ruolo impone che il prezzo resti manuale. Nessun risultato viene presentato come OCR o risposta AI.

## Implementato

- Campo JSON/profilo `orderDate` e relativa UI, distinto da `purchaseDate` e `deliveredDate`, con anno e ruolo espliciti, fonti/versione/SHA. Nessuna migrazione. Ordine futuro respinto; stampa, reso, consegna prevista e pagamento non riempiono l’acquisto.
- Le proposte di vecchie bozze che citano un’intestazione d’ordine come acquisto sono riclassificate in lettura come ordine; non propongono inizio garanzia. Nessun backfill di schede già confermate, nessuna sostituzione silenziosa dei dati salvati.
- Ordini e vecchie bozze con date d’ordine richiedono revisione economica nel planner e nella conferma server. La UI lascia vuota la data della spesa. In assenza di prezzo di riga non precompila il prezzo oggetto dal totale ordine. Un costo resta inseribile dichiarando esplicitamente importo/data, con provenienza `user_declared`; questo non certifica un pagamento.
- Fatto documentale `shippingCost` per ordini, soltanto con ruolo completo, valuta ed evidenza; zero esplicito ammesso. Nessuna ripartizione, somma, spesa aggiuntiva o uso come prezzo oggetto. Intestazione totale `PREZZO TOTALE` ammessa con la stessa verifica monetaria e della citazione; imponibile/sconto/IVA/spedizione/recap pagamento respinti come totale.
- Prodotto ripetuto su pagine diverse dello stesso ordine bloccato per revisione, senza due schede. Accessori/servizi incerti non promossi ad apparati. Esportazione del nuovo campo con le stesse verifiche di accesso/versione/SHA.
- Prompt candidato v28 aggiorna i ruoli; NON eseguito su provider. Gold, soglie, scorer, campagne storiche e ledger invariati.

## Verifiche

- Backend build e lint superati; onboarding **212/212** (12 nuovi controlli di ruoli ordine oltre ai 200 precedenti), ordinari **214/214**, infrastruttura qualità/runner/adattatore offline **24/24**. Nessun risultato live o promozione del gate.
- DB isolato: ordini + acconto/saldo + Q48 **63/63**. Per ciascun ordine: privati negati all’altro owner; una scheda senza spesa/garanzia dalla sola data ordine; replay concorrente e da altro client; costo dichiarato solo con scelta esplicita; terzo caricamento respinto se tenta il secondo costo; versione/SHA/revoca e cambio del payload protetti.
- Regressioni HTTP/DB **98/98** e Q15/Q22/Q48 **38/38**, API/DB temporanei poi fermati. I test HTTP includono contatti, onboarding, attività, oggetti, documenti e automatic intake. Nessun dato dell’app usato.
- Frontend typecheck e lint superati; mirati **73/73**; mock completa **838/838 in 102 file**, dopo i fix, due worker e retry massimo 1 per i timeout noti. Avvisi jsdom scrollTo non bloccanti; nessuna asserzione indebolita.
- Worker PDF reale eseguito localmente sui dieci originali già autorizzati: nove senza testo, uno con testo. Per i due ordini: **2/2** SHA256 e dimensioni invariati tra le verifiche, entrambi `pdf_text_unavailable`. Nessun originale o dato personale inserito nel repository.

I test DB usano solo PostgreSQL temporaneo `127.0.0.1:55433/dimora_v5_quality_v3_test`, ruolo `quality_test`. API HTTP temporanea 3109; fetch esterno bloccato, chiave AI rimossa solo dall’ambiente del processo. Nessuna lettura di `.env`. Cluster/API fermati a fine esecuzione; nessuna rimozione di worktree o dati preesistenti.

Riproduzione: `npm run test:object-onboarding`, `npm test`, `npm run test:quality-v3`, build/lint nel backend. Per i nuovi test DB: `test/installment-offline.ps1 -PgBin <binari PostgreSQL locali> -ScratchRoot <directory temporanea>`: inizializza un cluster nuovo e lo ferma in finally. Include ordini, acconto/saldo e Q48. I PDF reali non servono a riprodurre questi test di decisioni manuali. Frontend: typecheck, lint, `node node_modules/vitest/vitest.mjs run --project mock --maxWorkers=2 --retry=1`.

## Limiti e seguito

Nessun miglioramento di OCR locale dimostrato: le scansioni richiedono revisione manuale nel perimetro senza AI. Prezzi non attribuibili secondo i validatori rimangono da dichiarare, senza allentarli. Spedizione mostrata come evidenza dell’ordine, non nuovo sistema di ripartizione o contabilità dei pagamenti. Non dedurre pagamento dal costo registrato, stanza dalla categoria né garanzia dall’ordine. Samsung: modello e natura della voce aggiuntiva restano ignoti. Caffè: anno della consegna da confermare.

L’estensione autonoma della verifica comprende: ripetizioni multipagina, righe senza ruolo, IVA/subtotali/sconti, copie e terzo ricaricamento, privacy anche tra owner, versione/SHA/revoca e replay da un altro client, esportazione e regressioni Q15/Q22/Q48/acconto-saldo. Nessuna nuova campagna o deployment pianificato. Il prossimo passo sui reali è la revisione dei documenti già autorizzati, offline, mantenendo separati risultati osservati e capacità automatiche effettivamente misurate.

Non toccati main, DB/API/storage reali, 104 StoredFile, `.env`, file legacy sporchi e documentazione estranea preesistente. Il codice è pubblicato sul branch di Fase 0; l’API reale non è stata riavviata.
