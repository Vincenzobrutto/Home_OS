# Prototipo promozionale — 24 ottobre 2026

## Incarico e base

Richiesto un prototipo promozionale navigabile dei tre profili, con funzionalità simulate e massima semplicità. Base remota verificata: consolidamento `2ab757034e268498819fa8d530cf59f2aab00984`. Branch `codex/prototipo-promozionale-20261024`, worktree dedicato `Dimora-promo-20261024`. Riferimenti: architettura/stato V5, mockup V4/V5 e catalogo v0.3. Nessuna modifica ai mockup precedenti o a frontend/backend V5.

## Implementato

`prototypes/dimora-promo/dist/`: presentazione con benefici e tre ingressi, illustrazione SVG, design responsive, 24 viste per proprietario/agenzia/amministratore. Percorsi guidati, modali con conferme, acquisizione e revisione simulate, documenti/oggetti/spese/storia, scenari economici, checklist/dossier/Gift, memoria tecnica/pubblicazione/unità. Vedi README del prototipo per copertura e limiti delle anteprime.

Le bollette propongono solo spese; la garanzia non viene dedotta. Manifesto con email valida, selezione e conferma diritti; pubblicazione con anteprima. Dati fittizi, nessuna AI, API, email o persistenza. Il passaggio tra profili è libero e non implementa autorizzazioni di produzione.

## Verificato

- `node --check` del JavaScript.
- Rendering offline delle 24 viste senza errori tramite harness VM temporaneo del task; non è un test delle autorizzazioni.
- Browser locale: landing, ingresso Home, fattura → proposta modificabile → conferma → archivio aggiornato; cambio profilo; Home Gift e manifesto con selezione/destinatario/diritti; pubblicazione amministratore con versione e destinatari → conferma; attività completata e promemoria; nessun errore JavaScript nei percorsi osservati.
- Ispezione visuale desktop della landing e Home mobile a 390×844. Non provato su dispositivo fisico.
- Pubblicazione Sites privata riuscita, versione 1: https://dimora-esperienza-demo.vincenzo-b.chatgpt.site . Fonte Sites `5f9da5f7bde12d55c61fa7870290f04ac016b32a`; distinta dal commit Home_OS. Nessun cambio di audience pubblica.

## Limiti e prossimo passo

Non tutte le combinazioni o modali hanno collaudo browser. Ruoli/immobili usano fixture comuni, aggiornamenti solo di sessione; team, branding, integrazioni e piani restano anteprime dichiarate. Nessuna promessa di prodotto completo. Prossimo passo: revisione del committente su messaggio, semplicità e copertura, poi eventuale iterazione del prototipo. Merge della PR verso il consolidamento al committente.

PR di consegna: https://github.com/Vincenzobrutto/Home_OS/pull/25 . Browser del sito pubblicato fermo al gate di accesso ChatGPT; il collaudo delle interazioni è stato eseguito sul server locale con gli stessi file. Accesso privato preservato.

## Allineamento menu Home richiesto dal committente
Menu principale ora identico alle SECTIONS di frontend-v5/src/components/AppShell.tsx: Casa, Oggetti e impianti, Ambienti, Attività, Documenti, Spese, Rubrica. Ambienti e Rubrica hanno viste distinte; le voci aggiuntive sono separate sotto Esplora anche - demo. Compatibilità degli URL precedenti preservata. Sintassi e rendering delle 26 viste verificati offline; nessun nuovo collaudo browser in questa correzione.
