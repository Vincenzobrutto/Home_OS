# Archi delle porte e due celle servizi — 30 ottobre 2026

## Esito della nuova anteprima
Replay locale delle ultime proposte AI, con ingresso recuperato dal precedente algoritmo.9contorni proposti,0overlap: due celle dei servizi inferiori ricostruite e due archi interni riconosciuti geometricamente. L'area dell'arco torna al vano verso cui apre la porta, sottraendola alle attribuzioni adiacenti errate. Originale e source pixel invariati, nessuna coordinata o selezione di candidati inserita da Codex nel replay finale. Nessuna chiamata AI, credenziale o spesa aggiuntiva: bound4,4985EUR e ricevute0,62295USD invariati.

Immagine privata negli output della chat Dimora-vani-archi-bagni/planimetria-corretta.png. Le celle sono candidati di servizio: la classificazione bagno deriva dal contesto e dalla conferma dell'utente, non da una prova legale di destinazione. Restano sei verifiche: due conflitti di classificazione per spazi comunicanti e quattro revisioni degli involucri/interiori. Nessuna metratura, totalM2null, confirmedfalse.

## Metodo implementato nel dominio
Nuovo door-arcs: semplificazione soltanto per individuare le evidenze, fit di cerchio su catene compatibili con un quarto di circonferenza, controllo della cerniera vicina al centro e continuazione dei muri allineata alla soglia. La riparazione cambia soltanto la catena originale tra gli stipiti, non un bounding box o convex hull della stanza. Tutti gli altri vertici e i vuoti strutturali espliciti rimangono. Due candidati rilevati su due vani, guadagno locale845 e848,5pixel quadrati, non metri quadrati; la parte prima attribuita al vicino viene riallocata senza doppio conteggio. Nessun modello AI ha generato queste coordinate.

Rilevatore di involucri: nuovo parametro minimumDividerBandPixels, default1 mantiene i chiamanti precedenti; nel replay tecnico3 distingue bande divisorie robuste da tratti sottili dei sanitari. Angolo dai muri, ROI centrata sui seed bagno AI,100pixel per semilato, sette candidati sostenuti dai muri. Non è una soglia metrica o universale: risoluzione e spessore dei tratti influenzano il risultato.

Nuovo service-surfaces: esclude candidati che inglobano seed di altri spazi, scarta frammenti contenuti in involucri con supporti murari non inferiori, ordina per supporto minimo e complessivo; non sceglie solo per area. Parte dalla cella sostenuta dai seed bagno e include celle adiacenti non sovrapposte, massimo4senza numero atteso. La seconda cella resta etichettata candidata con destinazione da verificare. Nel campione seleziona due involucri su sette, senza ID o coordinate specifiche nel codice.

PreviewRoomSurfaces già esistente applica su copia, conserva vuoti espliciti, lascia simboli incerti aperti, sottrae dalle regioni adiacenti le porzioni riallocate e rifiuta overlap o frammenti disconnessi. I contorni dei vicini possono quindi cambiare dove prima occupavano impropriamente un arco o una porzione dei servizi; non dichiararli tutti identici. Il resto dei bordi dei vani con arco resta originale.

## Stato di integrazione e verifiche
Implementate funzioni riusabili nel dominio backend; orchestration del replay e dati originali restano privati. Questa nuova selezione superfici è un'anteprima tecnica non persistente, non è ancora collegata al final canonico del worker o ad una nuova route di accettazione nel workspace. L'analisi ingressi precedente resta collegata: non confondere i due livelli di integrazione. Entrambe le viste prodotto e demo Alessio invariate, nessun DB/API/browser reale riavviato o deploy/merge.

98/98test mirati, inclusi quarto di cerchio con vuoti/rientri, recessi rettangolari da non riempire e selezione cella intera/adiacente/esclusione altro vano. Backend ordinario finale627/627, build e lint mirato verdi. Nessun nuovo test DB o375px dichiarato; nessuna libreria installata. Il successo sul campione noto non misura la generalizzazione.

## Prossimo gate
Prove indipendenti su archi parziali, porte scorrevoli, nicchie curve, scan diverse e pareti sottili. Risolvere ambiguità fra elementi sanitari e muri con evidenze ulteriori prima di conferme automatiche. Collegare preview/accettazione atomica sotto fonte/versione/SHA/CAS e invalidazione computo, mantenendo la decisione umana sugli interni. Balcone e separazione semantica delle componenti comunicanti restano aperti. Nessun dato reale/geometria/rispostaAI nel repository.
