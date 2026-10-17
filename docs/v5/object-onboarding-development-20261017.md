# Oggetti dai documenti — avanzamento 17 ottobre 2026

## O1 — contratto e nucleo offline

Implementati, non registrati nell'app:

- `backend-v5/src/object-onboarding/domain.ts`: output multiarticolo vincolato alla fonte; testo verificato sul parser e immagini esplicitamente osservate dal provider. Quantità etichettate, titoli troncati, consumabili/incertezza, righe duplicate e limiti. Matching per singolo articolo con difesa su account/casa/stato, nessuna preselezione. Piano create/link/skip, conteggio unità esplicito, zero spese, snapshot e versione di conferma.
- `anthropic-provider.ts`: preparazione PDF testuale o JPEG/PNG originali, SHA e formato/limiti; consenso ricontrollato prima del count_tokens. Prompt senza inferenza di proprietà, consegna, pagamento o marca dal negozio; nessun catalogo o ID locale inviato. Preparazione/decodifica senza worker, budget o dispatch Messages proprio. **Il modulo non viene importato da nessuna rotta/worker.**
- `review/anthropic.ts`: sola estensione TypeScript del tipo content per blocchi immagine/testo; i percorsi esistenti continuano a inviare stringhe.
- `npm run test:object-onboarding` per le prove mirate dopo build.

Le immagini non hanno testo OCR verificato indipendentemente. Un riquadro strutturalmente valido non prova che il provider abbia letto correttamente; la UI dovrà esporre originale e «Letto dall'immagine · da controllare». Il riconoscimento formato tramite file-type non è una prova di completa decodificabilità: il provider deve rifiutare immagini corrotte; l'eventuale validatore dimensioni/render è ancora da aggiungere prima del rilascio.

## Prove e limiti

Build TypeScript verde. Prima esecuzione:41/41 test (16 nuovi,10 ricevuta,15 Anthropic già esistenti) e lint mirato verdi, tutte HTTP Anthropic sostituite con stub. Aggiunte poi due verifiche di snapshot/target ripetuto: build e soli18 test del file modificato rieseguiti verdi, lint finale verde. Totale distinto43, non59. Il test PDF usa parser reale su fixture sintetica; il test immagine usa un PNG1px tecnico per il trasporto e output finto per la decodifica. Non dimostra qualità visiva o OCR né riconoscimento dell'immagine personale Amazon. Nessun browser, DB, migrazione, API riavviata o dato personale modificato.

## Da completare prima della prova nell'app

O2: schema e migrazione additiva per job/bozza/righe/scelte/esiti dedicati, autorizzazioni alla lettura e conferma, worker/budget di campagna distinto, origine disponibile/versione e recupero esiti incerti. Non riciclare ReceiptDraft V1 o campagne pagate concluse. Matching SQL deve filtrare provenienze revocate prima di ordinare/paginare; il filtro del nucleo non sostituisce policy DB.

O3: conferma atomica che riusa/crea le unità, collega originale e conserva confronti sui dati già confermati. Mai inserire nuovi costi da questo incremento. Conservare contesto articolo nel link per non associare automaticamente tutti i prodotti dello stesso documento a una sola scheda. Versioni e ricevuta stabili, rollback e anti-duplicazione da provare DB/HTTP.

O4: componenti reali e container dall'upload/rientro in Documenti V2, anteprima e consenso immagini, riga per articolo, ricerca esistenti paginata, scelta delle unità e ambiente facoltativo, rinvio/ripresa. Nessun mock fallback né nuovo pulsante di analisi obbligatorio separato dal caricamento. Collaudo desktop/mobile320/390 con soli sintetici.

O5: prova provider reale separata con campagna/consenso/budget autorizzati e fonte limitata. Richiesta in chat se autorizzare screenshot Amazon personale entro0.25USD; nessuna risposta ancora assunta. Fino ad allora: niente invio, neppure count_tokens. Screenshot non copiato nel repo/fixture.

Specifica di riferimento: `docs/v5/object-onboarding-spec-v1.md`. Lo stato O1 non va presentato come funzione già provabile nell'app.

## Riferimento di implementazione

Formato dei blocchi base64 verificato nella documentazione ufficiale [Anthropic Vision](https://platform.claude.com/docs/en/build-with-claude/vision). Nessuna chiamata reale usata per questa verifica.
