# Correzione layout mobile Documenti — 17 ottobre 2026

Il committente segnala la vista mobile citando Oggetti; lo screenshot allegato mostra Documenti su iPhone. Intervento mirato sul difetto visibile, senza riprogettazione o modifica dei dati. Usata la casa di collaudo sintetica, non i documenti personali.

## 1. Documenti: riproduzione e correzione

A viewport 390 px: clientWidth 375, scrollWidth 997. Il wrapper mainStack era largo 343 px ma il suo unico track grid implicito misurava 965,3 px, a causa del min-content della riga categorie nowrap. Il risultato coincide con il contenuto tagliato e rimpicciolito dello screenshot utente. Non è un problema risolvibile riducendo ancora i caratteri.

In `frontend-v5/src/components/AppShell.module.css`, mainStack ora dichiara `grid-template-columns: minmax(0, 1fr)`. Il contenuto resta nella larghezza disponibile; il nav delle categorie conserva il proprio overflow-x auto. Non si nasconde il difetto con overflow hidden sull'intera pagina.

Dopo: track 343 px, scrollWidth della pagina 375, nav largo 375 con contenuto 997 che scorre al suo interno. A 320 px: client/scrollWidth 305/305. Selezionata realmente l'ultima categoria Da organizzare: filtro applicato e documento trovato, senza allargare la pagina. CTA Carica, ricerca, reset e schede tornano dentro lo schermo.

Screenshot accettati e ispezionati: `outputs/mobile-layout-20261017/01-documenti-prima-390.png`, `02-documenti-dopo-390.png`, `03-documenti-320-filtri.png` nel workspace.

## 2. Oggetti: verifica mirata

Catalogo della casa sintetica vuoto, con ricerca e filtri: a 320 px client/scrollWidth 305/305, nessun elemento main oltre il viewport. A 390 px 375/375. Screenshot accettato `04-oggetti-320.png`. Non sono state create schede né modificate quelle personali; schede popolate e dettagli oggetto non fanno parte di questa prova. La cattura 05 immediatamente dopo resize era incoerente, scartata come evidenza; la misura DOM a 390 è conservata separatamente.

## 3. Desktop e limiti

Ripristinato il viewport originale: Documenti a 1280 px, client/scrollWidth 1265/1265; layout desktop conservato, screenshot accettato `06-documenti-desktop.png`. Misure in `outputs/mobile-layout-20261017/misure.json`. Build Vite production verde. Nessuna nuova suite speculare alla singola regola CSS.

I controlli sono nel browser integrato con viewport mobile, non su Safari fisico: il committente deve ricaricare la pagina sul telefono per confermare l'esito effettivo. Screenshot mostrano leggibilità e assenza di overflow, non conformità completa accessibilità; lettore schermo e gesti touch reali non provati. Nessuna modifica a backend, autenticazione, launcher Wi-Fi, file segreti o documenti; automazioni restano PAUSED.
