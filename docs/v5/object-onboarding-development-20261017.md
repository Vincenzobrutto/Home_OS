# Oggetti dai documenti — consegna implementazione, 17 ottobre 2026

## Caso Echo confermato dal committente — consolidamento

Il committente conferma di aver creato la scheda Echo Dot Max e di vedere marca/modello e screenshot collegato. Esito riportato dall’utente, non una nuova verifica DB/browser di questa sessione. Confermato anche che non è stata registrata una spesa: la mail non conteneva il prezzo. Fattura rinviata; al caricamento scegliere la scheda esistente e valutare il costo senza duplicati. Specifica consolidata in `object-onboarding-spec-v1.md`, sezione finale.

Restano separati: prova reale PDF acquisto/costo/garanzia, multiarticolo e foto etichetta; ricerca del riferimento e testo/help campo rinviati. Nessun nuovo test, chiamata AI, documento caricato o dato prodotto modificato in questo consolidamento documentale.


## Aggiornamento: proposte locali dal nome del prodotto

Il committente approva marca/modello ricavati dal titolo, da confermare; recupero del riferimento preciso e chiarezza del relativo campo rinviati. Implementata derivazione locale su prefissi riconoscibili, con origine `derived_from_product_name`, fonte originale e nessun cambiamento a output AI/fingerprint/identificatori. Usata sia in proiezione sia in conferma e ricerca candidati. Nessun valore esplicito o confermato sovrascritto, nessuna unione di identità esplicita contraddittoria con titolo; sconosciuti, accessori/compatibilità, marche multiple e modelli tagliati non completati. Regole iniziali estensibili, non lookup universale di catalogo.

Bozza reale Echo0026cc5d-a3a6-4583-8940-3f6a51156e4f: marcaAmazon/modelloEcho Dot Max da nome già letto; titolo marketing fra parentesi troncato escluso, riferimento vuoto. Nessuna chiamata provider. Salvato il nome corretto già inserito dal committente tramite normale UI, poi reload: nome conservato, proposte visibili «Ricavato dal nome del prodotto · Da confermare», entrambe Usa la proposta. Non confermato articolo né creato oggetto/costo. Screenshot outputs/onboarding-oggetti-20261017/07-identita-dal-nome.png.

11test profilo offline (3nuovi),11DB di regressione e16FE (1nuovo) verdi; build backend/frontend e lint mirati verdi. API registrata aggiornata con launcherTelefono, provider resta disabilitato, nessuna .env/quote/firewall modificata. Backlog: codice esatto da marca/modello con disambiguazione del produttore e revisione del testo di aiuto del campo, da affrontare successivamente.


## Aggiornamento: collaudo reale v3 riuscito

Nuova autorizzazione esplicita del committente per stesso screenshot Amazon Echo Dot Max verso Anthropic, ulteriori0.25USD (massimo complessivo autorizzato0.50USD). Campagna onboarding-live-20261017-amazon-r2, maxCalls1/hash esatto. Un primo preflight è scaduto prima di Messages (job1c89402c-80d3-4d13-b337-6be002288ff2), riserva rilasciata/costo0. Modello GET successivo200 senza documento; secondo avvio nella stessa campagna, nessun reset contatori, unico Messages effettivo di r2.

Job ce123048-70d0-429c-b978-9b1e5d1e8382 succeeded, draft0026cc5d-a3a6-4583-8940-3f6a51156e4f open. sentAt2026-10-17T07:16:36.410Z, responseAt07:16:42.651Z, usage5474input/261output, msg_011Cg7Q9r2oCkW1ijCbPiZ8j. Costo registrato13558microUSD =0.013558USD, inferiore a0.25USD. R1 resta uncertain/reserved250000microUSD: totale prudenziale impegnato0.263558USD, NON costo totale certo.

Output: delivery_notice,1articolo/quantità1, solo nome visibile troncato con avviso. Nessuna marca/modello/dato tecnico/date/garanzia inferiti, purchaseTotal null. Browser reale mostra proposta compilata da Anthropic, non fixture o inserimento manuale; fonte originale privata invariata, decisions{}, binding0, nessun oggetto o spesa creati. Screenshot outputs/onboarding-oggetti-20261017/06-amazon-proposta-reale.png senza originale personale visibile. Proposta conservata per revisione del committente; provider nuovamente disabilitato con launcher registrato.

Per rispettare la nuova autorizzazione senza azzerare r1, guard delle analisi incerte ora limitato alla stessa campagna; nuova campagna/hash/budget operatore + consenso nuovo richiesti. `canStartAnalysis` rende esplicita la disponibilità del nuovo avvio in UI.11DBtest rieseguiti, esteso caso incerto a nuova campagna con riserva precedente invariata;10FEtest (1nuovo) e lint/build verdi. Nessuna automatizzazione di retry. I paragrafi sotto descrivono la consegna precedente e i suoi limiti storici.


## Comportamento disponibile

Modulo reale registrato, route lazy Documenti → «Riconosci gli oggetti» dal caricamento per foto e documenti prodotto, oppure dettaglio documento → oggetti. Un originale può proporre più articoli, quantità e schede; creazione/collegamento/rinvio/esclusione separati, conferma parziale e ripresa. L’analisi non crea oggetti o costi. Il percorso manuale resta disponibile quando il provider non è abilitato.

Dati confermati nella scheda: marca/modello/riferimento/seriale, potenza/tensione/frequenza/capacità, acquisto/consegna effettiva e garanzia, ciascuno con origine. Default garanzia da consegna effettiva o acquisto, +24mesi di calendario modificabili; nessuna data ricavata da una semplice etichetta o da «in arrivo oggi». Nessuna sovrascrittura implicita dei valori esistenti: confronto e mantieni/rinvia. Date manuali verificate anche nel browser dopo correzione dell’evento input.

Costo facoltativo solo da ricevuta di acquisto con un articolo/una unità e totale EUR provato; costo canonico riusabile senza duplicati. Ordini/consegne/etichette e totali multiarticolo non creano spese né ripartizioni automatiche. Documento collegato una sola volta a ogni scheda.

Manuali: link esterno ufficiale Moulinex con riferimento esatto, pagina nota AL4018F0 riscaricata e verificata; altri riferimenti richiedono URL produttore. Altri marchi: link dichiarato manualmente. Arricchimento tecnico solo quando il dato è presente e attribuibile nella fonte ufficiale, senza inventare nome/capacità. Non è una ricerca universale di manuali.

## Dati, protezioni e compatibilità

Migrazione26 additiva applicata esclusivamente a dimora_v5_product_dev su127.0.0.1:55432. HomeObject.profile, bozze/job/richieste/binding/campagne/tentativi/confronti dedicati. Conferma transazionale con key/body/versioni/snapshot e recupero ricevuta; una risposta persa non provoca un secondo invio o doppioni. Fonti/target ricontrollati e dati revocati rimossi dalle proiezioni, candidati, revisioni salvate ed export personale. Receipt V1 resta accessibile come percorso precedente.

PDF testuali tramite parser reale; scansioni con PDF visuale, JPEG/PNG originali con limiti e SHA. Consenso e budget ricontrollati prima di count_tokens e Messages. Nessun modello finto nel runtime; trasporti finti solo nei test. Worker isolato per campagna/modello/SHA correnti, evitando che l’API reale reclami un job del collaudo offline. Prenotazione conservativa, nessun reinvio automatico.

## Verifiche

Build backend/frontend e lint mirato verdi. Base verificata:66test BEoffline,23DB/HTTP e40FE distinti (inclusi contenitori, non sommare le riesecuzioni). Dopo lo schema v3:29test mirati provider/dominio/profilo (2nuovi) e11DB di integrazione rieseguiti verdi. Dopo l’ingresso inline foto:41FE su5file verdi (2nuovi e18regressioni di DocumentIntakeAssistant non comprese nel run precedente). Non sommare i run sovrapposti:69BEoffline/23DBHTTP/60FE distinti. I test con provider sostituito non dimostrano la qualità dell’analisi reale.

DB/HTTP: atomicità/rollback, chiavi duplicate e body diversi, replay, fonte/target revocati, filtri prima della paginazione, isolamento account/casa, consenso/hash, nessuna risorsa dalla sola analisi, quantità/multiarticolo, conferma parziale, conflitti persistenti, costo canonico, esito incerto senza retry, worker con campagna diversa non reclama il job. I provider sono sostituiti solo qui.

Browser reale IAB: casa sintetica604f1dea-5e33-42ef-8f3f-ae3e75cb88dd, due articoli compilati manualmente da originale sintetico; revisione→reload→conferma solo A, B rinviato. Oggetto17da33c8-c9b9-4d1e-8973-c1702ba9b97d con originale collegato, dati/garanzia modificati e persistiti, nessun costo. Mobile390:375/375; mobile320:305/305 senza overflow. Screenshot in outputs/onboarding-oggetti-20261017; viewport ripristinato. Non è prova della qualità OCR/visione né Safari fisico.

## Prova esterna autorizzata: risultato NON verificato

Autorizzazione esplicita del committente: solo screenshot Amazon Echo Dot Max allegato, massimo0.25USD e un invio. File privato caricato attraverso normale UI nella casa personale, nessun altro documento personale trasmesso. Documento e4cca478-2424-4a45-921c-3d378d0deb17; job bc2818bc-dd44-49f1-aba3-abf010d41960; campagna onboarding-live-20261017-amazon-r1.

Unico marker Messages sentAt2026-10-17T06:23:04.063Z. Count_tokens/preflight hanno risposto, ma non c’è risposta Messages verificabile, usage o request-id: stato uncertain/analysis_outcome_unknown, riserva250000microUSD trattenuta, costo effettivo sconosciuto. Nessun draft pubblicato, oggetto o spesa creati nella casa personale. Non dedurre costo zero né lettura riuscita.

Successivamente individuata incompatibilità certa dello schema v2: vincoli minimum/maximum/maxLength/maxItems non supportati e troppi campi union annidati. Causa della chiamata precedente non dimostrabile perché mancava diagnostica HTTP. Corretto schema v3 ad array compatto e aggiunti test contro vincoli non supportati/complessità, duplicati e dati inventati; DB con trasporto finto rieseguito verde. Riferimento ufficiale: https://platform.claude.com/docs/en/build-with-claude/structured-outputs . Non effettuato un nuovo invio reale.

Campagna disabilitata riavviando la sola API registrata tramite launcher Telefono senza variabili ONBOARDING_AI; .env e quote precedenti invariati, contatori non azzerati. Browser mostra esito incerto e percorso manuale. Qualunque nuova prova esterna richiede nuova autorizzazione/campagna concreta, non riutilizzare la riserva incerta.

## Prossimi passi e limiti

1. Diagnostica HTTP sanitizzata ora implementata: solo status/endpoint fisso/request-id validato nei log onboarding, mai corpo provider/prompt.47test provider/dominio/regressioni verdi (1nuovo). La chiamata passata resta incerta perché non aveva questa diagnostica.
2. Chiuso nel successivo collaudo r2 descritto in testa: riconoscimento reale dello screenshot verificato; altri documenti personali non ancora testati.
3. Verifica fisica Safari e successivamente casi reali multiarticolo/etichetta/PDF con consenso separato. Nei test questi casi sono coperti con dati sintetici, non dimostrano riconoscimento dei file personali.

Nessun push/deploy, reset DB, cambiamento .env/firewall/sicurezza, automazione riattivata, messaggio a Claude o chiamata email. Originali personali conservati privati. Modifiche estranee lasciate fuori dal commit.
