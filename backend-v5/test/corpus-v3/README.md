# Corpus v3 - prova offline dell'estrattore onboarding

Solo documenti sintetici. Le foto sono simulazioni procedurali di targhette, non fotografie di prodotti reali. I marchi e i recapiti sono fittizi; i domini `.invalid` non sono servizi. I codici fiscali, POD/PDR e IBAN non sono destinati a uso operativo. Le P.IVA di collaudo hanno checksum valido per esercitare il validatore, senza attribuzione a soggetti reali.

`cases.py` contiene le specifiche e le annotazioni attese, scritte prima di osservazioni AI. `generate.py` stampa HTML locali con Edge, normalizza i metadati, crea JPEG/PNG e rasterizza copie scansionate senza testo. `manifest.json` lega ogni originale al suo SHA-256 e alla versione del gold. `audit.py` controlla aritmetica, contenuti del PDF e checksum separatamente dal generatore. `gold-review.json` registra quali hash sono stati riesaminati da Codex con audit e tavole visive; non è una conferma umana del gold e non misura accuratezza AI.

Comandi dalla cartella `backend-v5` (Python locale con Pillow, numpy, pypdf e pypdfium2; Edge già installato):

```powershell
& $env:DIMORA_CORPUS_PYTHON test/corpus-v3/generate.py --stage priority
& $env:DIMORA_CORPUS_PYTHON test/corpus-v3/audit.py
node --test test/quality-v3-corpus.test.cjs
```

`--stage all` materializza tutti i 52 casi. Rigenerare cambia gli hash se cambia il contenuto: riesaminare il gold e versionarlo prima di qualsiasi misura, mai adattarlo a posteriori per migliorare un risultato. Il prototipo `templates/bolletta-luce.html` è conservato come ricevuto; non fa parte degli originali misurati. Il generatore nuovo corregge i dettagli fiscali e le esenzioni del prototipo.

La taratura reale è separata e richiede consenso esplicito: `calibrate-local.cjs --consent-local-aggregates --output <file locale>`, avviato con `node --env-file=.env`. Legge in transazione read-only, esclude account `@example.test` e case `COLLAUDO`, passa solo percorsi locali a un processo locale e salva esclusivamente conteggi aggregati. Nessun testo, nome documento, identificativo, credenziale o originale è copiato nei risultati. Lo script non chiama AI, email o endpoint di rete. Non autorizza alcuna campagna AI.

Le pagine lunghe arrivano a 20 dopo la taratura autorizzata (34 originali reali: mediana 2 pagine, quartile superiore 8, massimo 20), mantenendo i quattro casi lunghi e i conteggi dei gruppi approvati. Le statistiche di una raccolta piccola ed eterogenea orientano la varietà del generatore: non ne dimostrano la rappresentatività semantica.
