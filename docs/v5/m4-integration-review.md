# M4 Anthropic — consolidata in locale

13 ottobre 2026. M4 iniziale chiusa: PDF testuali, una caldaia, proposte marca/modello/potenza, conferme esplicite. API 3001, frontend 5174, PostgreSQL dimora_v5_product_dev su 55432 e storage autonomo. Nessun deploy, push, main o database legacy modificato.

## Lavoro integrato

Codex: PDF.js 6.4.299 in processo figlio senza chiave API, fetch nativo senza retry, JSON strutturato, controllo modello/token, estratti riscontrati sulla pagina fisica, consenso, ledger persistente, heartbeat e recupero della risposta senza reinvio. La separazione del parser non costituisce un sandbox di sicurezza del sistema operativo.

Claude: sette commit frontend da 350a399 a 34c31be, integrati escludendo il sync 4d9205d. Client, scelta provider, consenso, costi/errori, provider misti, pagine, test e handoff. Le sue prove erano mock; quelle reali sono state eseguite da Codex.

Correzioni Codex dopo integrazione: capabilities accetta isSimulation=false; motivi in italiano; zero USD numerico; storico AI distinto dal test; errore di consenso cancellato quando corretto; live test richiede successo e hash del dettaglio originale. Distinti tetto monetario e sei chiamate iniziali. Replay M3 preserva le impronte precedenti. Launcher attende l'API pronta.

## Verifiche

| Livello | Risultato | Portata |
|---|---|---|
| Build/lint backend e frontend | Passano | Progetti V5 autonomi |
| Backend offline | 67 test | Parser reale, evidenze, recovery, idempotenza; trasporto Anthropic simulato |
| API/DB/storage M1/M2/M3 | 45 test | Server, PostgreSQL, originali, privacy, conferme e revoche reali |
| Ledger PostgreSQL | 4 test | Sei richieste concorrenti entro 0.50 USD consentono due sole riserve; nessuna chiamata provider |
| Frontend/mock e fixture | 126 test | 106 regressioni/client + 20 M4, nessuna chiamata live |
| Client/API senza Anthropic | 12 test, 4 live saltati | Contratto reale, consenso e fixture |
| Client/API con live abilitato | 7 test | Tre non-live + quattro live; tre Messages, due fallimenti parser gratuiti |
| Browser reale | Verificato | 320/390/desktop e tastiera; consenso, A+C su scheda M3, nessuna sovrascrittura, chiusura verifica e reload; fonti pagina 2/3 e apertura originale |

## Sei chiamate iniziali

| Prova | Costo USD | Esito |
|---|---:|---|
| A+B, prompt iniziale | 0.006938 | Rifiutata: value includeva kW; nessuna proposta |
| A+B, formato chiarito | 0.009810 | Risposta salvata, poi rivalidata dopo correzione del blocco thinking senza nuova chiamata; tre proposte |
| A via client/API | 0.004844 | Proposte e hash fonte verificati |
| PDF multipagina | 0.008108 | Marca/modello pagina 2, 30/34 kW pagina 3; conferme esplicite, inbox vuota |
| Documento senza dati caldaia | 0.002676 | no_supported_data, nessuna scheda vuota |
| A+C da browser/tastiera | 0.009338 | Solo potenza riaperta; dati conservati; non applicare con nota chiude la proposta |
| **Totale** | **0.041714** | **9.958286 USD residui**, nessun costo incerto |

Scansione e PDF protetto: settled/actualUsd=0.000000, zero Messages. La risposta e usage sono persistiti prima della validazione; blocchi/firme thinking non sono evidenze né dati frontend.

## Risposte al handoff Claude

1. Billing prima dell'invio: riserva all'accettazione; fallimento parser libera la riserva, settled/0.000000. Fixture billing=null. Invio incerto conserva la riserva.
2. Riserva per tentativo: 0.25 USD nel ledger; non è prezzo Dimora. Nessun nuovo campo obbligatorio nel client.
3. disabledReason: codici noti tradotti; testo italiano conservato; gergo sconosciuto non esposto.
4. Consenso assente: HTTP 422 validation_error con messaggio esplicito; nessun job/riserva.
5. multi_assets_unsupported e analysis_outcome_unknown: job failed, nessun risultato parziale o reinvio automatico.
6. Nome nuova scheda: Caldaia, senza nome commerciale inferito.
7. USD: stringhe decimali a sei cifre; confronto numerico dello zero. Sei chiamate utilizzate non significa credito esaurito.

## Limiti e seguito

Due PDF con testo, 10 MiB/file, 20 pagine, 100000 code point, 50000 token. OCR/vision non implementati; scansioni e cifratura rifiutate. Il riscontro dell'estratto attesta corrispondenza alla pagina, non correttezza tecnica o titolarità. Derivati personali e conferme esplicite invariati. Nessuna conformità WCAG dichiarata.

La fase iniziale ha raggiunto le sei chiamate: risultati e conferme restano navigabili, nuove chiamate Anthropic sono bloccate e l'analisi di test rimane selezionabile. Saldo conservato per la fase successiva; non ripetere la suite live o cambiare campagna automaticamente.

Prossimo incremento da scegliere: OCR oppure estensione del verticale. M4 non dichiara operative Agenzie/Admin o Spese reali; hardening prima del pilota resta nel backlog.
