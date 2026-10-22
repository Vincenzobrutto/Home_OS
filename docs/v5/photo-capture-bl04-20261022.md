# BL-04 — Scatta una foto, 22 ottobre 2026

Implementazione Claude su richiesta diretta del committente, branch `claude/bl02-garanzia`. Perimetro del piano `home-release-piano-20261016.md`: acquisizione e archiviazione, **non** OCR o lettura automatica delle foto. Solo frontend: il caricamento documenti (document-intake, M2) accettava già JPEG/PNG; nessuna migrazione, nessuna modifica backend.

## Decisione del committente (22/10)

- Costruire e provare **sul computer**; la prova su telefono reale resta da fare con un accesso di sviluppo concordato (nessuna apertura di rete/firewall implicita).

## Comportamento

- In Documenti → «Aggiungi documenti» (e nella pagina di caricamento) accanto a «Scegli file» c'è **«Scatta una foto»**: campo immagine con `capture="environment"` (fotocamera posteriore dove il browser lo supporta), una foto per volta, solo JPEG/PNG. Sul computer si apre la scelta di un'immagine.
- Nomi generici della fotocamera («image.jpg», «IMG_20261022_…», «PXL_…») diventano «Foto 22-10-2026 18.10.jpg»; nomi scelti dall'utente restano.
- La foto segue lo stesso flusso dei documenti: elenco «File scelti» con rimozione, nulla inviato prima di «Carica documenti», documento **Solo io** (come ogni caricamento), compilazione manuale o «Precompila con AI» solo su richiesta esplicita.
- Testo sotto i pulsanti: «Le foto si salvano come immagini visibili solo a te. Dimora non ne legge il testo e non le invia all'esterno senza il tuo consenso.»
- **HEIC rifiutato con istruzioni** («Più compatibile»/JPEG nelle impostazioni della fotocamera o esporta come JPEG), anche da trascinamento o selezione multipla: gli altri file validi restano nell'elenco. Prima il formato non supportato arrivava fino al rifiuto del server.
- **Nessuna analisi sulle immagini**: la lettura locale automatica (`local_text_v1`) ora parte solo per i PDF. Prima veniva richiesta anche per JPEG/PNG e il server la rifiutava (`analysis_limits_exceeded`), lasciando un esito di lettura fallita.

## Verifiche

- Frontend: typecheck, lint; `src/intake-integration/photoCapture.test.tsx` 4/4 (nomi, HEIC/formati, analisi solo PDF, pulsante con `capture`, foto in elenco, HEIC spiegato con gli altri file mantenuti, nessun POST prima della conferma). Suite completa 808/822: i 14 falliti sono gli stessi preesistenti in 5 file (già annotati nel backlog).
- Browser sul computer, casa «COLLAUDO V2»: pulsante e attributi, foto sintetica generata nel browser (`image.jpg` → «Foto 22-10-2026 18.10.jpg»), caricamento reale: documento `private`, `image/jpeg`, `stored`, analisi `not_started`, nessuna chiamata a `/analyses` o `automatic-runs`. 390 px senza overflow. La foto sintetica resta nella casa di collaudo.

**Non verificato (gate del piano ancora aperto)**: scatto fisico da iPhone/Android, formato prodotto dalle fotocamere reali (JPEG vs HEIC), ripresa dopo errore di rete sul telefono. Serve una sessione su telefono con accesso di sviluppo concordato.
