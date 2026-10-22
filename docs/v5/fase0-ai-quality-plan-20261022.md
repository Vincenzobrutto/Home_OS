# Fase 0 — Piano della prova di qualità AI, 22 ottobre 2026

Proposta Claude da approvare dal committente. **Nessuna chiamata a pagamento** finché non vengono approvati budget, criteri e corpus. Sostituisce, per il perimetro del prodotto attuale, il passo «congelare la campagna rappresentativa» rimasto aperto in `fase0-corpus-v2-integrazione-20261016.md`.

## 1. Cosa va misurato

Il prodotto oggi usa **un solo estrattore** (object-onboarding, versione con contatti v19): una chiamata per originale che restituisce tipo del documento, oggetti, spesa della casa, professionista e fatti con citazioni; sopra c'è la **politica del caricamento automatico** (`automatic-plan.ts`) che decide cosa creare senza revisione.

Il misuratore esistente (corpus v2, 24 casi P01–P24, `backend-v5/test/pilot-*.cjs`) copre invece il vecchio estrattore economico M4 (17 casi), quello tecnico delle caldaie (4) e il parser (3). È riusabile come base (formato, hash, citazioni verificate sul testo, scorer puro), ma **non misura la pipeline attuale**. Serve un'estensione.

Le domande a cui la prova deve rispondere:

1. **Sicurezza del percorso automatico** — quando Dimora crea da sola oggetti, spese o contatti, sono giusti? (domanda principale: un errore qui finisce nei dati senza che l'utente lo veda)
2. **Qualità delle proposte in revisione** — tipo, importi, date, fornitore, periodo, oggetti, professionista: quanto lavoro di correzione resta all'utente?
3. **Prudenza** — quando il documento è ambiguo, l'estrattore e la politica chiedono aiuto invece di inventare?

### Requisiti aggiunti dal committente (22/10)

1. **Tipologia di oggetto o impianto**: l'estrattore deve definirla, o proporla segnalando l'incertezza. Oggi la indica solo per gli impianti delle dichiarazioni di conformità (`systemType`); per gli altri oggetti il client mette «appliance» d'ufficio (`object-onboarding/model.ts`). Da aggiungere allo schema dell'estrattore: tipologia per oggetto tra quelle di Dimora (`objectTypes`), con certezza; il caricamento automatico crea solo con tipologia certa, altrimenti revisione.
2. **Foto dell'etichetta dell'elettrodomestico**: stesse informazioni (marca, modello, tipologia, dati tecnici). Il percorso immagini esiste già (JPEG/PNG, `documentKind` `device_label`) ma non è nel misuratore: entra nel corpus e nelle misure.
3. **Costo dei documenti lunghi**: non far leggere ciò che non serve (es. dettaglio consumi delle bollette). Misura attuale: istruzioni fisse di ogni chiamata ~27.000 caratteri (~7–8.000 token: sistema 20.271 + schema 6.793 caratteri), mentre il testo di una bolletta di 2 pagine vale ~1.000 token. Quindi per i PDF testuali più chiamate pagina per pagina costerebbero di più. Leve proposte, da misurare nella campagna:
   - **memorizzazione delle istruzioni fisse** (prompt caching dell'API Anthropic), oggi non attiva: riduce la parte fissa, che è la voce principale;
   - **selezione locale delle pagine** prima dell'invio, in un'unica chiamata: il testo è già estratto sul PC; si inviano le pagine con intestazione, riepilogo e totale, scartando dettaglio consumi e condizioni generali;
   - **scansioni** (pagine immagine, costose): prima pagina, poi le successive solo se mancano dati richiesti.
   Sui documenti lunghi la campagna confronta **tre modalità** con i costi reali: lettura completa, pagine scelte in locale in un'unica chiamata, e **pagina per pagina con arresto** quando i dati utili sono stati trovati (proposta del committente). Si adotta quella che costa meno senza peggiorare nessuna misura.

## 2. Corpus v3 (sintetico, nessun dato personale)

Circa **52 documenti sintetici** (PDF e foto) generati con il generatore esistente (`test/document-understanding-fixture.cjs`), con gold annotato e versionato. Composizione proposta:

| Gruppo | N | Cosa mette alla prova |
|---|---|---|
| Bollette (luce, gas, acqua, internet) | 10 | importo totale vs quota, arretrati/canoni, periodo di competenza, scadenza, nessun professionista |
| Fatture di tecnici (caldaia, idraulico, elettricista) | 8 | professionista con P.IVA/CF/telefono/email dell'emittente (non del cliente), oggetto citato o assente, spesa |
| Acquisti di elettrodomestici (fattura, scontrino) | 8 | oggetto (nome, marca, modello), quantità > 1, più righe con prezzo, negozio ≠ professionista |
| Dichiarazioni di conformità / documenti tecnici | 4 | installatore, impianto, nessuna spesa inventata |
| Documenti della casa (planimetria, APE, visura) | 4 | solo classificazione, nessun oggetto o spesa |
| Foto di etichette e targhette (elettrodomestici, caldaia, etichetta energetica UE) | 8 | marca, modello, tipologia, dati tecnici da una foto; prospettiva, riflessi, sfocatura |
| Bollette e fatture lunghe (4–6 pagine) | 4 | lettura selettiva: dati utili sulle prime pagine, dettaglio da ignorare |
| Casi difficili | 6 | PDF scansionato senza testo, multipagina, testo che tenta di dare istruzioni all'AI, blocco cliente con P.IVA che sembra l'emittente, valuta estera, totale illeggibile |

Si riusano dove possibile i casi del corpus v2 (P01–P24) convertendone il gold; i gap dichiarati allora (multipagina, istruzioni nel testo, formati numerici, più caldaie, casi tecnici negativi) entrano qui in modo esplicito.

### Realismo dei documenti finti (requisito del committente, 22/10)

Obiettivo: che il comportamento sui finti predica quello sui reali. Il generatore attuale (`test/document-understanding-fixture.cjs`) produce PDF di 5–6 righe di testo semplice: **non adatto**. Nuovo generatore:

- **Modelli HTML stampati in PDF** con il browser in modalità headless già installato (Edge/Chrome, nessuna nuova dipendenza): impaginazione reale con intestazioni, colonne, tabelle, caratteri piccoli, piè di pagina legali, numeri di pagina, riquadri «Totale da pagare», codici a barre/QR come segnaposto grafici.
- **Contenuti tipici italiani**: bollette con POD/PDR, periodo di fatturazione e di competenza distinti, letture e consumi, quota fissa/energia/oneri/accise/IVA, canone RAI, arretrati e conguagli, rate, scadenza e IBAN; fatture con «Spett.le» cliente e relativa P.IVA/CF, emittente con P.IVA/REA/PEC, ritenuta d'acconto, bollo, split payment, sconti, più aliquote; scontrini con righe abbreviate; conformità DM 37/08 con allegati.
- **Varietà**: 3–4 impaginazioni diverse per tipo (fornitori fittizi con stile proprio), documenti di 1–5 pagine, formati numerici diversi (1.234,56 / 1234.56 / € prima o dopo), date in più forme.
- **Copie «scansionate»**: alcune pagine rese immagine (leggera rotazione, rumore, bassa risoluzione) dentro un PDF senza testo, come i documenti fotografati o passati allo scanner.
- **Nessuna imitazione di aziende reali**: nomi, loghi e marchi fittizi; struttura e terminologia realistiche.

**Taratura sui documenti reali, solo in locale.** Con il consenso del committente, un controllo locale (nessuna AI, nessun invio, nessun contenuto copiato nel repository) misura sui documenti reali già nell'archivio solo statistiche aggregate di struttura: pagine, densità di testo, quante cifre e date compaiono, presenza di tabelle o immagini. Le stesse misure sui finti devono stare negli stessi intervalli; dove non succede, il generatore va corretto prima della campagna.

## 3. Cosa si conta

Per ogni documento il misuratore confronta output e gold: campo corretto, sbagliato, mancante, inventato (valore senza citazione nel testo), non pertinente. Poi applica la politica automatica reale e registra la decisione (crea / chiede revisione).

**Errori critici** (uno solo blocca il pilota se avviene nel percorso automatico):

- importo, data o fornitore sbagliati in una spesa creata automaticamente;
- professionista creato da una bolletta o da un negozio, oppure con P.IVA/telefono/email del cliente;
- oggetto creato per un documento che non lo contiene, o quantità sbagliata;
- valore senza citazione verificabile nel testo del documento;
- un'istruzione contenuta nel documento che cambia il comportamento.

## 4. Criteri di accettazione proposti

| Misura | Soglia per il pilota |
|---|---|
| Errori critici nel percorso automatico | **0** |
| Correttezza delle creazioni automatiche (sul totale delle creazioni) | **100%** |
| Tipo del documento corretto | ≥ 90% |
| Tipologia dell'oggetto corretta o segnalata come incerta (mai sbagliata e data per certa) | ≥ 90% corrette, 0 sbagliate certe nel percorso automatico |
| Marca e modello da foto dell'etichetta | ≥ 90% |
| Costo medio per documento (riportato per le tre modalità di lettura) | si adotta la più economica a parità di misure |
| Importo e data della spesa corretti (in proposta) | ≥ 95% |
| Fornitore corretto | ≥ 90% |
| P.IVA del professionista esatta, quando presente | ≥ 95% |
| Casi difficili: richiesta di revisione invece di dati inventati | 6/6 |
| Stabilità: stessa decisione automatica in due esecuzioni dello stesso documento | ≥ 90% |
| Quota di documenti completati in automatico | solo riportata (desiderabile ≥ 50%) |

Con circa 52 documenti queste soglie valgono come **cancello per il pilota**, non come affidabilità statistica generale. Se un criterio fallisce: si corregge politica o estrattore, si versiona e si ripete l'intera campagna (mai ritoccare il gold dopo aver visto i risultati senza versionarlo).

## 5. Costo e budget

- Costi reali osservati per documento: **0,024–0,045 USD** (rapporti del 17 e 18 ottobre, modello Sonnet 5.5, tariffa registrata 2 USD input / 10 USD output per milione di token). Un multipagina può costare di più.
- Campagna: 52 documenti × 2 esecuzioni (stabilità) + ~30 chiamate per confrontare le modalità di lettura sui documenti lunghi = **circa 135 chiamate** → costo atteso **circa 3–6 USD** (meno se la memorizzazione delle istruzioni fisse è attiva).
- **Proposta di tetto: 12 USD e massimo 150 chiamate**, in una campagna dedicata e separata (es. `fase0-quality-v3-…`), con la stessa prenotazione prima dell'invio, nessun nuovo tentativo automatico su esito incerto e blocco al raggiungimento del tetto. Il tetto vale solo per questa campagna.
- Prima tappa solo con documenti sintetici: nessun dato personale lascia il PC.

### Seconda tappa: documenti reali (confermata dal committente, 22/10)

- 10–15 documenti reali scelti dal committente, distribuiti sui gruppi della tabella (almeno bollette, fatture di tecnici, acquisti; se possibile una scansione).
- Consenso separato e specifico all'invio di quei documenti ad Anthropic (contengono dati personali), campagna e tetto propri (stima 0,5–1 USD, tetto proposto 3 USD).
- Gold preparato in locale: Claude propone i valori attesi leggendo i documenti sul PC, il committente li conferma o corregge **prima** dell'analisi.
- Stesse misure della prima tappa e confronto finti/reali per ogni misura. Se su una misura chiave (errori critici, importo/data, P.IVA, decisioni automatiche) i reali vanno peggio di oltre 10 punti, il corpus finto non è rappresentativo: si corregge il generatore e si ripete la prima tappa, e il pilota resta bloccato finché i reali non superano le soglie.

## 6. Lavoro prima di spendere (tutto offline)

| Passo | Stima |
|---|---|
| Generatore realistico (modelli HTML → PDF, copie scansionate) e taratura locale sulle statistiche dei reali | 1,5 giornate |
| Corpus v3: ~52 documenti (incluse foto di etichette e documenti lunghi), gold versionato, hash | 1,5 giornate |
| Estrattore: tipologia con certezza per ogni oggetto; memorizzazione istruzioni fisse; selezione locale delle pagine e lettura progressiva delle scansioni (tutto con test simulati) | 1,5 giornate |
| Adattatore dell'output onboarding + politica automatica nel misuratore; estensione dello scorer agli oggetti, ai contatti e alle decisioni | 1 giornata |
| Runner della campagna (campagna dedicata, ledger, ripresa senza doppie chiamate) e report leggibile | 0,5 giornate |
| Prova completa con provider simulato (nessun costo) | 0,5 giornate |

Totale circa **6,5 giornate**, poi la campagna sintetica (un paio d'ore, budget approvato), la tappa reale e l'analisi dei risultati.

## 7. Decisioni

Approvate dal committente il 22/10: perimetro, criteri di accettazione, realismo dei finti come requisito, seconda tappa con documenti reali.

Ancora da autorizzare, al momento giusto:

1. consenso alla taratura locale sulle statistiche dei documenti reali (nessuna AI, nessun invio);
2. tetto della campagna sintetica (proposta 12 USD / 150 chiamate), quando corpus e misuratore sono pronti;
3. scelta dei documenti reali, consenso all'invio e tetto della seconda tappa (proposta 3 USD).
