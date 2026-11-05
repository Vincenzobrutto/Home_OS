# Superfici immediate dell’agenzia — 5 novembre 2026

## Richiesta e perimetro

Il committente chiede una stima utilizzabile senza compilare tutto il computo tecnico: leggere prima la barra metrica, oppure chiedere il formato del foglio quando è nota solo la scala stampata, mantenendo muri/coefficienti/conferme come dettagli facoltativi. Lotto `codex/agency-quick-surfaces-20261105`, basePR82, checkout separato per preservare i runtime precedenti.

## Implementato

- Percorso embedded Calcola superfici apre una stima locale, senza l’editor geometrico o il modulo tecnico in primo piano. I dettagli sono montati solo al primo accesso esplicito e poi preservati anche da chiusi per non perdere bozze/invii.
- OCR locale sul raster autorizzato, con il worker già distribuito e risorse vincolate alla stessa origine. Limiti3milioni pixel/3000parole/45secondi, cancellazione e distruzione del worker su cambio fonte/scope o abbandono; nessun invio AI o rete esterna.
- Riconoscimento di barre orizzontali: servono etichette numeriche coerenti, unità metrica e traccia/tacche effettive nei pixel. Coordinate ricondotte al raster originale dopo eventuale ridimensionamento. Le sole cifre OCR non diventano una misura. Barre discordi non vengono scelte arbitrariamente.
- Scala 1:N stampata letta separatamente; se la barra non è affidabile, si chiede formato A4/A3/A2/A1. Nessun A4 o 1:100 assunto per default. Il foglio deve essere intero e le proporzioni corrispondere entro3%; altrimenti si propone una misura nota con due punti grafici e lunghezza reale. DPI da soli non bastano.
- Superficie netta per vano dai contorni salvati, sottraendo i vuoti e applicando la scala due volte all’area. La somma riguarda i soli vani presenti, non certifica che la casa sia stata riconosciuta interamente.
- Commerciale provvisoria = contributi ponderati dei vani + maggiorazione dei muri. Proposte iniziali: interni100%, balconi/terrazzi e cantine25%, garage50%; altri vani al100% da controllare, esclusi0%. Muri10% dei vani al100%: ipotesi modificabile0–30%, non regola normativa né perimetro lordo misurato. Percentuali modificabili nei dettagli, nessuna conferma obbligatoria per visualizzare la stima.
- Metodo e assunzioni restano leggibili; il risultato è sempre «stimato», mai misura verificata o conformità. Le verifiche irrisolte non sono cancellate o risolte automaticamente.

## Confine dei dati

Questa stima è in memoria e si ricalcola nella schermata; non modifica il computo salvato e non viene consegnata a Gift, fatti confermati o annuncio come metratura verificata. Scala/modifiche ai coefficienti provvisori restano nella sessione del workspace e non sono salvati al reload. Per conservare una configurazione completa resta il calcolo dettagliato facoltativo, con le sue regole server precedenti. Nessun nuovo endpoint, schema, migrazione o cambiamento al calcolo rigoroso. La persistenza di stime esplicitamente marcate come tali potrà essere un lotto separato.

## Verifiche

93/93 nei moduli scala/stima/workspace/navigazione e OCR/bollette/cancellazione. Barre con pixel/tacche, testo senza barra, scale discordi, sottrazione vuoti/scalatura quadratica, coefficienti/muri, risultati senza flag obbligatori, formato non assunto e OCR non avviato prima del Calcola. Calcolo rigoroso ancora raggiungibile esplicitamente.

Typecheck app, lint e build verdi. Primo giro: alias del worker PDF nella junction mancante per due suite bollette; corretto il solo config di test privato, senza cambiare asserzioni. Il workspace aveva un doppio canvas nascosto per il calcolo avanzato: montaggio differito al primo accesso, preservato dopo. Nessun test di sicurezza ridotto. Adapter OCR condiviso esteso con layout grezzo, mentre recognize continua a passare dallo stesso validatore delle bollette; regressioni e protocollo/abort coperti dalle suite.

Riconoscimento universale non garantito: barre verticali, testo illeggibile, unità assenti o scale multiple restano fallback espliciti. La prova sintetica non misura l’accuratezza su un benchmark indipendente. Originali personali e OCR grezzo non vengono aggiunti a Git. Attivazione e riscontro sulla pratica reale nel seguito.
