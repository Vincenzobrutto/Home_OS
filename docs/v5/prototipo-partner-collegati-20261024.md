# Partner navigabili e passaggi tra i tre profili — 24 ottobre 2026

## Incarico e confini

Completare Agenzia e Amministratore nel prototipo promozionale, rendendoli coerenti con Home e mostrando i passaggi delle informazioni. Sviluppo nel solo `prototypes/dimora-promo`, ramo `codex/prototipo-promozionale-20261024`, PR #25. Base V5 remota verificata con fetch: consolidamento `2ab7570`. Nessun cambiamento a runtime V5, API, database, dati personali o AI. Il concept Partner segue il catalogo funzionale v0.3; non diventa una dichiarazione di disponibilità operativa dell'app reale.

## Implementato nella demo

`partners.js` e `partners.css` estendono Home con un modello di sessione collegato. **31 viste** complessive. Ogni immobile ha fascicolo, memoria tecnica, consegne, pubblicazioni, inviti e segnalazioni distinti. Due immobili iniziali selezionabili; nuove schede e import dimostrativo. Lo stato personale della Home è separato per immobile. Sono superati i precedenti limiti di fixture uniche condivise fra tutte le case, per i dati gestiti dalla demo.

### Agenzia

Panoramica con stato dei fascicoli, scheda preliminare/attivazione senza pagamento, richiesta documentale in anteprima, ricezione simulata, revisione, aggiunta di esempio. Dossier Anteprima/Riservato con selezione dei soli documenti esaminati e autorizzati. Home Gift con scelta dei documenti e delle schede, vincolo di inclusione della fonte, destinatario e conferma dei diritti, manifesto, invito predisposto, revoca e accettazione. Collaboratori, nome studio e import di esempio aggiornano la sessione.

### Amministratore

Edifici, memoria impianti, documenti tecnici, revisione con versione, date delle attenzioni e scenario di budget per edificio. Pubblicazioni con anteprima, destinatario unità, messaggio, versione e ritiro; appunti interni esclusi. Inviti unità con accettazione in Home. Cambio proprietario con data di efficacia simulabile, revoca della vista comune e invito nuovo titolare. All'accettazione del nuovo titolare la demo apre una Home privata vuota, conservando la memoria precedente in un archivio separato del modello: non trasferisce oggetti, spese, contatti o documenti privati. Non è un sistema di identità multiutente reale.

### Passaggi osservabili

1. **Agenzia → Home:** preparare la Gift non cambia la Home. Dopo accettazione, entrano solo le copie del manifesto e le schede selezionate, con provenienza/versione. Garanzia non dedotta; nessuna spesa o Rubrica privata importata. Accettazione ripetuta senza duplicati; invito revocato o di altro immobile non accettabile.
2. **Amministratore → Home:** la pubblicazione resta distinta dall'archivio personale. È visibile dopo il collegamento dell'unità; revisioni e ritiro si riflettono sulla vista comune. Un eventuale promemoria è una proposta, aggiunta alle Attività solo per scelta del proprietario, con data scelta e senza ripetizioni.
3. **Home → Amministratore → Home:** il proprietario collegato predispone una segnalazione; lo studio aggiorna stato e risposta; la Home ritrova l'esito. Il resto dei dati privati non compare nei profili Partner.

Pagina **Passaggi tra profili** presente in tutti i menu, con mappa navigabile, spiegazione di cosa viene selezionato/conservato e traccia degli eventi della sessione. Home ha **Consegne ricevute**, provenienza Gift nei Documenti e memoria **Condominio** collegata. Ogni passaggio include il cambio di prospettiva esplicito.

## Verifica

- Sintassi `partners.js` e diff check.
- **18/18 test**, nessun salto: 7 regressioni Home e 11 test Partner. Coperti rendering di tutte le 31 viste, assenza di record personali Home nelle pagine Partner, rifiuto di documenti privati/non esaminati e schede senza fonte, manifesto immutabile/versionato, accettazione idempotente, revoca, separazione immobili, collegamento unità, pubblicazioni/versioni/ritiro, cambio proprietario e Home nuova separata, segnalazione/risposta e conferma del promemoria.
- Browser locale: revisione libretto → Gift con due documenti e scheda caldaia → manifesto → invito → Home → accettazione → Documenti con provenienza. Dossier riservato con planimetria selezionata osservato.
- Browser locale: invito unità → pubblicazione con proposta → accettazione Home → memoria comune e proposta visibili; segnalazione Home → risposta/stato Amministratore → aggiornamento ritrovato in Home.
- Desktop: ispezione visuale della mappa dei passaggi. Mobile 390×844: menu Partner completo aperto e mappa responsive. Console senza errori nei percorsi osservati. Viewport ripristinato. Nessuna prova su telefono fisico e nessun collaudo esaustivo di ogni combinazione o modale.

## Limiti

Dati fittizi e sessione in memoria: refresh azzera il percorso. Nessuna email, consegna, verifica documentale, permesso, revoca o controllo titolarità reale. Un'unità per edificio nella demo; niente CRM, contabilità, riparti, pagamento o pubblicazione su portali. Solo modello dimostrativo di cambio persona, non account reali; archivio precedente conservato nel modello per illustrare la separazione. I test tutelano coerenza della simulazione, non attestano sicurezza/permessi backend. Restano i limiti Home descritti nel report di allineamento V5 (esempio monoarticolo e niente API/AI/file reali).

Prossimo passo: revisione del committente sull'esperienza promozionale, eventuale iterazione nello stesso lotto. Merge PR #25 al committente.

Controllo finale: collegamenti diretti alle nuove pagine risolti al caricamento (non soltanto da menu). Test aggiuntivo su Agenzia/Amministratore Passaggi e Home Consegne; totale corrente 18/18.
