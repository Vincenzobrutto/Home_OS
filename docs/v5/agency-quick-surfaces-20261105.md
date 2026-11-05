# Superfici immediate dell’agenzia — 5 novembre 2026

## Richiesta e perimetro

Il committente chiede una stima utilizzabile senza compilare tutto il computo tecnico: leggere prima la barra metrica, oppure chiedere il formato del foglio quando è nota solo la scala stampata, mantenendo muri/coefficienti/conferme come dettagli facoltativi. Lotto `codex/agency-quick-surfaces-20261105`, basePR82, checkout separato per preservare i runtime precedenti.

## Implementato

- Percorso embedded Calcola superfici apre una stima locale, senza l’editor geometrico o il modulo tecnico in primo piano. I dettagli sono montati solo al primo accesso esplicito e poi preservati anche da chiusi per non perdere bozze/invii.
- OCR locale sul raster autorizzato, con il worker già distribuito e risorse vincolate alla stessa origine. Limiti3milioni pixel/3000parole/45secondi, cancellazione e distruzione del worker su cambio fonte/scope o abbandono; nessun invio AI o rete esterna.
- Riconoscimento di barre orizzontali o verticali, tramite lettura nelle orientazioni 0/90/270 gradi: servono etichette numeriche coerenti, unità metrica e traccia/tacche effettive nei pixel. Coordinate ricondotte al raster originale dopo eventuale ridimensionamento. Le sole cifre OCR non diventano una misura. Barre discordi non vengono scelte arbitrariamente.
- Scala 1:N stampata letta separatamente; se la barra non è affidabile, si chiede formato A4/A3/A2/A1. Nessun A4 o 1:100 assunto per default. Il foglio deve essere intero e le proporzioni corrispondere entro3%; altrimenti si propone una misura nota con due punti grafici e lunghezza reale. DPI da soli non bastano.
- Superficie netta per vano dai contorni salvati, sottraendo i vuoti e applicando la scala due volte all’area. La somma riguarda i soli vani presenti, non certifica che la casa sia stata riconosciuta interamente.
- Commerciale provvisoria = contributi ponderati dei vani + maggiorazione dei muri. Proposte iniziali: interni100%, balconi/terrazzi e cantine25%, garage50%; altri vani al100% da controllare, esclusi0%. Muri10% dei vani al100%: ipotesi modificabile0–30%, non regola normativa né perimetro lordo misurato. Percentuali modificabili nei dettagli, nessuna conferma obbligatoria per visualizzare la stima.
- Metodo e assunzioni restano leggibili; il risultato è sempre «stimato», mai misura verificata o conformità. Le verifiche irrisolte non sono cancellate o risolte automaticamente.

## Confine dei dati

Questa stima è in memoria e si ricalcola nella schermata; non modifica il computo salvato e non viene consegnata a Gift, fatti confermati o annuncio come metratura verificata. Scala/modifiche ai coefficienti provvisori restano nella sessione del workspace e non sono salvati al reload. Per conservare una configurazione completa resta il calcolo dettagliato facoltativo, con le sue regole server precedenti. Nessun nuovo endpoint, schema, migrazione o cambiamento al calcolo rigoroso. La persistenza di stime esplicitamente marcate come tali potrà essere un lotto separato.

## Verifiche

93/93 nei moduli scala/stima/workspace/navigazione e OCR/bollette/cancellazione. Barre con pixel/tacche, testo senza barra, scale discordi, sottrazione vuoti/scalatura quadratica, coefficienti/muri, risultati senza flag obbligatori, formato non assunto e OCR non avviato prima del Calcola. Calcolo rigoroso ancora raggiungibile esplicitamente.

Typecheck app, lint e build verdi. Primo giro: alias del worker PDF nella junction mancante per due suite bollette; corretto il solo config di test privato, senza cambiare asserzioni. Il workspace aveva un doppio canvas nascosto per il calcolo avanzato: montaggio differito al primo accesso, preservato dopo. Nessun test di sicurezza ridotto. Adapter OCR condiviso esteso con layout grezzo, mentre recognize continua a passare dallo stesso validatore delle bollette; regressioni e protocollo/abort coperti dalle suite.

Riconoscimento universale non garantito: testo illeggibile, unità assenti o scale multiple restano fallback espliciti. La prova sintetica non misura l’accuratezza su un benchmark indipendente. Originali personali e OCR grezzo non vengono aggiunti a Git. Attivazione e riscontro sulla pratica reale completati come descritto sotto.

## Seguito finale e prova reale

Codice finale `ba984f6`, con riconduzione delle coordinate OCR ruotate all’originale e distinzione tra lettura non disponibile e riferimento non trovato. Dopo i 93/93 del gruppo iniziale, rieseguiti i due moduli modificati: 10/10, incluso il nuovo caso di coordinate ruotate. Typecheck app, lint mirato e build finale verdi. Non rieseguite suite invariate o DB/backend (nessun codice server modificato).

Sulla stessa pratica reale, senza nuovi invii AI o salvataggi, la lettura locale ha rilevato scala **1:200**, senza barra sufficientemente affidabile. La UI precompila quindi 200 e chiede soltanto il formato del foglio. Selezione A4 effettuata esclusivamente per verificare il rendering dei risultati: il formato reale non è stato confermato, quindi è stato rimesso su «Scegli formato». Nessuna metratura di prova va interpretata come superficie della casa. Due vani salvati dall’utente e sei verifiche aperte preservati. Nessun OCR grezzo, originale o screenshot personale in Git.

Verificati desktop e 375px: risultati, netto per vano, dettagli chiusi, nessun overflow pagina (viewport375/scrollWidth360), tabella scorrevole, console senza errori. Viewport ripristinato. Screenshot privati soltanto negli outputs della chat. Frontend attivo nel profilo locale `app-agency-quick-surfaces-final-20261105`, sorgente ba984f6; API/PG esistenti preservati, nessuna migrazione.

Riconoscere una barra valida non garantisce accuratezza della scansione. Foglio tagliato o deformato richiede una misura nota. Restano stime, coefficienti proposti e completezza della mappa da controllare. Il formato e la scala temporanei non vengono salvati al reload; persistenza della stima semplificata non implementata in questo lotto.
