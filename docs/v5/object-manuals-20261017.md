# Manuali online nella scheda oggetto — 17 ottobre 2026

Implementato nell'app locale, per gli oggetti generici personali (non nella scheda caldaia): sezione Manuale e istruzioni accanto ai Documenti collegati, ricerca, proposta da confermare, aggiunta manuale, modifica/rimozione del solo collegamento. Originali e spese invariati.

## Copertura effettiva

Recupero automatico iniziale per **Moulinex Italia**, dalla pagina prodotto ufficiale. Il riferimento AL4018F0 ha una pagina pubblica conosciuta nel catalogo di sorgenti; viene comunque scaricata e verificata a ogni ricerca, nessun dato di test usato come fallback. Altri riferimenti Moulinex richiedono per ora anche l'URL della pagina prodotto. Gli altri produttori sono gestibili con link manuale, NON con riconoscimento automatico universale. Nessun motore di ricerca o download di manuali nel database.

L'adattatore esige un solo Product JSON-LD con mpn esatto e un solo collegamento etichettato Istruzioni per l'uso nel CDN ufficiale. Non prende il primo PDF (sicurezza/guida rapida esclusi), né una variante simile. Riferimento diverso o più manuali→nessun risultato automatico. Trasferisce solo una richiesta alla pagina pubblica del modello, senza foto, seriale, ID di casa o account. Timeout10s, limite2MiB anche durante streaming; no redirect; host/path espliciti prima di fetch. Link inseriti a mano richiedono HTTPS pubblico e non sono etichettati verificati.

Il manuale del caso reale è [IFU ufficiale Easy Fry XL Surface](https://dam.groupeseb.com/m/d8857430f9c924d4/original/1820016013-IFU-pdf.pdf?timestamp=20260906122610), individuato dalla [pagina AL4018F0](https://www.moulinex.it/p/easy-fry-xl-surface-friggitrice-ad-aria-grande-superficie-di-cottura-visore/1510002932). La ricerca live del codice di produzione ha riprodotto lo stesso URL, senza Anthropic/paid o documento personale.

## Contratto e dati

- POST `/api/v5/homes/:homeId/objects/object/:id/manual-proposals`: body `{brand,reference,productUrl?}`, risposta `{candidate:{manual,token}|null,reason}`. È una ricerca, non un salvataggio; nessuna chiamata all'apertura della scheda. Guard sessione/CSRF/contesto/edit e fonte/ruolo/versione riletti dopo fetch. Proposta firmata HMAC, legata ad account/casa/oggetto/versione, TTL15min; un riavvio invalida soltanto le proposte non confermate.
- POST stesso prefisso `/manual`: `{expectedVersion,selection}` e Idempotency-Key. Selezione `candidate+token`, `manual+url+brand+reference+kind` oppure `remove`. Firma ricontrollata dal server: il client non può attribuirsi origin manufacturer_page. Versione/archiviazione/diritti ricontrollati nella transazione comune. Chiave/body identici riusano il risultato anche dopo risposta persa; body diverso409. Rimozione non cancella documenti.
- `HomeObject.manual` JSON nullable, migrazione additiva `20261017080000_object_manual` (25a), applicata solo a127.0.0.1:55432/dimora_v5_product_dev dopo verifica username/host/DB. Metadata: URL, tipo manual/support, marca/riferimento, origine, pagina fonte/data controllo, versione oggetto alla conferma. Nessun token nei dati confermati/storia/export.
- DTO CatalogItem.manual additivo; modifica successiva della scheda segnala needsReview. Export personale include solo i campi manuale consentiti sugli oggetti autorizzati; fonte e link restano esterni, nessun PDF aggiunto allo ZIP degli originali. Storia aggiunge manual_updated/manual_removed.
- Errori principali:422 input/proposta scaduta;409versione/idempotenza;403permesso;503produttore indisponibile. Risposta rete incerta conserva body/key e blocca cambi fino a verifica esplicita.

## Prove

- Backend build e lint mirati verdi.14 test offline verdi (7manuali,7export),7 test HTTP/DB verdi comprendendo il contenitore (6scenari,2nuovi manuali). HTTP con fetch produttore sostituito da stub: conferma separata, CSRF, replay/body diverso, accesso altrui negato, versione, schema cambiato, firma su altro oggetto, ruolo viewer e rimozione. Nuovi account sintetici del vecchio harness ora marcati email verificata nel solo setup; primo tentativo aveva fallito una regressione upload perché la fixture era precedente al requisito email. Nessuna modifica del controllo nel prodotto.
- Frontend prima26 test verdi (6manuali+20schede), build e lint verdi. Aggiunto poi test etichetta origine manuale:7test dedicati rieseguiti verdi, build finale e lint mirato verdi; totale distinto27, non33.
- Browser reale IAB, app/API/DB reali: nella casa sintetica604f1dea-5e33-42ef-8f3f-ae3e75cb88dd creato oggetto f68979f3-74c8-4426-89a7-cf071150719b, nome COLLAUDO — friggitrice Moulinex (non bene reale). Ricerca live AL4018F0→proposta→conferma→reload con URL persistente;0costi/documenti collegati. Oggetto lasciato consultabile, non cancellato. Casa utente reale c8b6c347-c527-43cb-9808-5d22136c83eb non modificata.
- Mobile emulato390:client375/scroll375,320:305/305; editor e scheda ispezionati, screenshot01desktop/02editor390/03scheda320 in outputs/manuali-oggetti-20261017. Viewport ripristinato. Nessuna prova fisica Safari o del motore PDF nel browser: il collegamento ufficiale è stato aperto/letto tramite web, non si dichiara collaudata la visualizzazione del PDF nell'IAB.

API registrata aggiornata e accesso Wi-Fi5175 ripristinato con launcher Telefono; .env e firewall invariati, providerAI spenti. Automazioni restano PAUSED. Nessun push o servizio non registrato terminato.

## Ancora da sviluppare

Questo incremento completa il **manuale nella scheda esistente**, non l'intero onboarding da screenshot/foto. O1 object-onboarding resta isolato: persistenza multiarticolo, worker/budget dedicati, conferma oggetti, OCR/vision reali, campi tecnici/garanzia e loro UI non sono ancora collegati. Una proposta di link potrà essere inclusa nella conferma unica dell'oggetto quando quel flusso sarà integrato. Ampliare gli adattatori produttori e la ricerca della pagina per nuovi riferimenti, mantenendo corrispondenza esatta e fonti verificabili. Nessuna chiamata personale/Anthropic autorizzata implicitamente da questo rilascio.
