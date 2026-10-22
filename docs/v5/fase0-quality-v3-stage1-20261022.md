# Fase 0 - prima consegna offline, 22 ottobre 2026

Branch `codex/fase0-ai-quality-v3`, base `df68f44` di dev aggiornata dopo fetch. Primo commit `eee8733`: piano approvato e prototipo ricevuto, preservati senza modifiche. `main` non modificato.

## Implementato

- Generatore locale HTML/Edge con quattro impaginazioni, denominazioni fittizie, contabilità in centesimi, IVA ordinaria/ridotta/forfettario e aliquote multiple, bollo, ritenuta, split payment, conguagli, arretrati, rate, periodi e scadenze separati.
- Primi 30 originali: 10 bollette, 8 fatture tecniche, 8 acquisti, 2 targhette e 2 casi difficili. Alcuni originali degli altri gruppi sono ulteriormente scansionati per variare il supporto. Foto procedurali con prospettiva o riflessi, scansioni raster con rotazione/rumore e senza strato testuale.
- Gold versionato, manifest SHA-256, collegamenti ai casi v2 riutilizzati come scenari, audit contabile e test con il parser PDF di produzione. Le specifiche dei 52 casi sono già censite; restano da materializzare i 22 successivi.

## Verificato

30 audit fonte/gold, controllo dei checksum P.IVA di prova, somme di imponibile/IVA/bollo/canone e riconciliazione di saldo, ritenuta e righe. Contenuti attesi verificati nel testo effettivamente estratto; scansioni senza testo e dimensioni delle immagini verificate. Tavole visive delle prime pagine dei 30 casi esaminate; testi, importi e marca/modello leggibili negli esempi previsti. Il parser di produzione legge tutte le pagine testuali e rifiuta correttamente le scansioni come `pdf_text_unavailable` (2 test corpus verdi). Questo verifica gli artefatti e le annotazioni, **non l'accuratezza del modello**.

Taratura locale autorizzata esplicitamente dal committente in questa chat: letti 34 originali già nell'archivio, nessun mancante/illeggibile, nessuna scrittura DB. Solo statistiche aggregate: pagine 1-20 (mediana 2, quartile superiore 8); densità mediana 1.253,5 caratteri/pagina, quartile superiore 2.238; presenza di immagini in tutti gli originali. Nessun contenuto o identificativo reale trasferito nel repository/log. Non servono altri documenti per questa prima taratura; la futura campagna reale richiederà comunque scelta e consenso separati.

Correzioni del generatore prima del congelamento: dettagli economici coerenti, P.IVA fittizie con checksum valido, grafica raster anche sui PDF testuali, densità variabile, copie scansionate aggiuntive. I quattro casi lunghi saranno di 6/8/12/20 pagine per coprire la coda osservata, senza aumentare il numero di casi. Il confronto aggregato finale sarà ripetuto sui 52.

## Limiti e prossima consegna

Il codice attuale è `document-understanding-v21`, non v19: il piano contiene una fotografia storica. Le conformità restano documenti della casa senza creazione di oggetti; il nuovo lavoro non deve reintrodurre quella vecchia logica. Nessuna chiamata AI/email, nessun consumo di budget, nessuna variazione a `.env` o dati dell'app. Foto simulate e statistiche strutturali non dimostrano realismo fotografico o qualità sui documenti reali.

Prossimo: tipologia esplicita con certezza, cache delle sole istruzioni fisse, confronto delle modalità di lettura, misuratore onboarding con politica automatica reale. Seguono corpus 52 e runner simulato. Nessun budget è autorizzato: proposta 12 USD/150 chiamate sintetiche solo dopo il report di prontezza. Con circa 52 casi le soglie sono un cancello per il pilota, non affidabilità statistica generale.
