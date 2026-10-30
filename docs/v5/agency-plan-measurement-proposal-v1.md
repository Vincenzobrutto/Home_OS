# Superfici da ricalco — proposta aggiornata da Vincenzo,30ottobre2026

## Evidenza tecnica e confine

Il legacy contiene `frontend/src/components/FloorPlan.tsx`: sfondo reale PDF/immagine con opacità, rispetto aspect ratio, poligoni punto-per-punto e vertici modificabili. `frontend/src/geometry.ts` contiene coordinate0..1, trasformazioni e geometria delle stanze. La ricognizione non ha individuato calibrazione metrica o calcolo m² in quei percorsi: non considerarli già implementati. Riusare logica e comportamento dopo adattamento V5, non copiare gli endpoint o permessi legacy. Demo Alessio invariata.

## Flusso proposto

1. Selezionare documento/versione/pagina autorizzati; visualizzazione non deformata, opacità e zoom.
2. Calibrare cliccando due punti su una distanza quotata e dichiarando la lunghezza reale in metri; se disponibile, usare una barra grafica. La sola scritta1:100 non è sufficiente per una scansione o immagine ridimensionata. Scala nominale da pagina PDF con dimensioni fisiche affidabili solo come percorso avanzato, da confermare.
3. Controllare una seconda quota indipendente, preferibilmente in altra direzione. Se non coincide, mostrare errore relativo e richiedere verifica del documento: nessuna correzione automatica di deformazioni o prospettiva nel primo rilascio.
4. Ricalcare i vani con poligoni, assegnare nome e tipo; annulla/aggiusta vertici, zoom e snap ortogonale facoltativo. Separare appartamento, balcone/terrazzo, cantina e autorimessa.
5. Calcolare l’area per poligono nel piano metrico. Bloccare forme autointersecanti/degeneri; segnalare sovrapposizioni prima della somma. Zoom, viewport e rotazione della visualizzazione non cambiano la misura.
6. Mostrare tabella degli ambienti e superficie interna ricalcata. Il contorno di una stanza interna non include automaticamente muri, pilastri, perimetro lordo o parti comuni. Per una superficie commerciale occorre un secondo prospetto con basi e criteri scelti/confermati dall’agenzia: mai rinominare la somma dei vani come commerciale.
7. Registrare scala, quota di riferimento e controllo, geometrie, metodo di contorno, autore e data, precisione visualizzata, criteri, documento/versione/SHA/pagina. Il dato è una stima misurata sul documento, non un rilievo o una certificazione.

## Dati e verifiche

Coordinate in spazio della pagina, non pixel del contenitore. Se normalizzate0..1, riconvertire usando larghezza e altezza reali della stessa pagina prima di applicare la calibrazione: assi normalizzati non hanno la stessa unità in una pagina rettangolare. Calibrazione specifica per pagina/porzione omogenea: non applicarla indiscriminatamente a più piani o disegni con scale differenti.

Nuova fonte/versione/SHA invalida la conferma della misura. Cambiare calibrazione ricalcola tutte le aree e richiede nuova conferma. Il dato confermato precedente resta nello storico con fonte e criterio. Geometrie di misura distinte dalla mappa indicativa degli ambienti del proprietario: nessuna sovrascrittura implicita.

Test proposti: rettangolo noto, stanza aL, poligono invertito, area nulla, autointersezione, sovrapposizione, doppio clic, zoom/ridimensionamento, pagina non quadrata, scala mancante, due quote discordanti, diversa pagina/versione e fonte revocata. Prima motore geometrico offline, poi UI V5 isolata. AI eventualmente propone contorni in seguito; l’agente li controlla. Desktop/tablet come esperienza primaria di disegno; smartphone almeno consultazione e correzioni semplici, da verificare in uso.

## Priorità concordabile

Inserire come estensione del fascicolo dopo fatti/fonti/revisione, senza bloccare il nucleo atto→incarico. Primo incremento: motore di calibrazione e area con test sintetici e contratto di persistenza. UI di ricalco successiva, senza promettere OCR metrico o riconoscimento delle pareti automatico.

## Prima prova autorizzata — lezioni per lo sviluppo

Due prove su un documento reale, conservato solo fuori dal repository. Prima su PDF intero: riconoscimento semantico plausibile ma estremi della scala sbagliati e contorni sovrapposti. Seconda su dettaglio ingrandito con trasformazione alla pagina e calibrazione verificata localmente: nessuna sovrapposizione evidente nel controllo semplice, ma contorno centrale e altri bordi ancora da correggere; tutte le geometrie dichiarate a bassa certezza. Non è una misura di accuratezza, manca una verità di riferimento annotata. Nessuna metratura utilizzabile automaticamente.

Conclusione implementativa: estrarre e controllare la calibrazione separatamente; AI propone contorni, agente corregge; controlli geometrici bloccano somme inappropriate ma non verificano da soli l’allineamento alle pareti. Balcone ad anello richiede fori/poligoni multipli o ricalco manuale: un poligono pieno comprenderebbe erroneamente l’appartamento. Prototipo privato standalone confronta le risposte e permette correzione, ma non è integrato nel prodotto. Nessun originale, screenshot o coordinate reali committati.

## Correzioni manuali e completezza — nuovo requisito

L’agente deve poter inserire un punto su qualunque lato, compreso quello ultimo→primo, per spezzarlo e seguire rientranze. Il nuovo punto iniziale giace sul segmento e non modifica l’area finché non viene spostato; evitare duplicazione dei vertici. Eliminazione con minimo3punti, undo, denominazione vani e modifica dei vuoti interni. Gli interventi manuali devono restare distinguibili dalle proposte AI.

Un poligono valido e senza sovrapposizioni non prova che tutta la casa sia stata coperta. Il feedback segnala corridoio e balcone omessi: il prodotto deve aiutare a individuare parti non assegnate e chiedere revisione, senza chiamare “superficie della casa” la somma parziale. La bozza privata attuale segnala i tipi mancanti noti di questo caso e propone ricalchi manuali separati; non implementa ancora segmentazione automatica degli spazi residui. Balcone concavo aC o anello con fori: rappresentazione capace di escludere l’interno e calcolo distinto dalle superfici interne. Copertura, validità geometrica e coerenza con l’originale sono tre verifiche separate.
