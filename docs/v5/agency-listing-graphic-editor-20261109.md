# Editor grafico della pianta per annuncio — 9 novembre 2026

In Planimetria → Pianta per annuncio → Modifica pianta per l’annuncio si parte dall’illustrazione proposta. Selezionando un vano si possono trascinare i vertici del suo perimetro; le frecce spostano il punto con il focus. Si può sovrapporre la planimetria originale come riferimento. Lo zoom parte con la mappa interamente visibile.

Selezionando un vano, trascina un lato per spostare l’intera parete perpendicolarmente, mantenendola parallela e portando con sé le aperture agganciate. Con Orto attivo, il trascinamento di un vertice aggancia le coordinate dei vertici adiacenti quando sono vicine, per ottenere lati orizzontali o verticali. Gli spostamenti incompatibili con i contorni sono respinti.

Durante il trascinamento, le guide tratteggiate collegano il vertice o la parete a un altro lato quasi allineato sulla stessa orizzontale o verticale. Tieni premuto Shift per attivare temporaneamente Orto anche a trascinamento iniziato. Le guide scompaiono al rilascio.

Un clic sul muro inserisce una porta da 80 cm usando la scala salvata. Se manca, l’editor cerca la barra metrica direttamente sulla planimetria prima del posizionamento. Dal comando Imposta scala nell’editor si scelgono due punti sull’originale e si indica la distanza reale. La scala si applica subito alle nuove porte e Salva dettagli per l’annuncio la rende disponibile anche in Calcola superfici. Le finestre e le porte senza scala si possono posizionare indicando due estremi. Quando i contorni di due stanze sono affacciati e il tratto comune è sufficiente, la porta crea un solo varco attraverso entrambi i muri, visibile anche nel PNG. Il simbolo si trascina per spostarlo, gli estremi per ridimensionarlo. Le proposte rilevate si controllano direttamente sulla mappa e soltanto quelle confermate entrano nel PNG. Gli allineamenti salvati con il comando precedente rimangono applicati.

Il salvataggio aggiorna soltanto l’illustrazione associata alla revisione geometrica corrente. I contorni illustrativi non cambiano i vani, le superfici o la mappa del proprietario. L’anteprima e il PNG usano gli stessi contorni salvati; il PDF resta un riferimento dell’editor e non viene esportato.

Verifica del 10 novembre: 14 test di geometria, controllo TypeScript e lint mirato. Nel browser sulla pratica sintetica sono stati verificati l’aggancio Orto, lo spostamento della parete con una finestra e la riapertura delle posizioni salvate.

Verifica del 9 novembre: suite planimetrie backend 134/134 e frontend Agenzie 124/124. Browser desktop su pratica sintetica: trascinamento di un vertice, aggiunta e spostamento di una finestra, riapertura con gli stessi contorni/aperture e confronto del PNG con l’anteprima. Non è un collaudo sulla pratica reale; nessuna chiamata AI, migrazione o deploy.

## 10 novembre — editor condiviso e lettura della barra a bordo pagina

In **Modifica pianta → Apri editor grafico** si lavora sui contorni usati per le superfici, con l’originale attivo all’apertura. Condivide con l’annuncio trascinamento di pareti e vertici, Orto/Shift, guide, zoom, calibrazione e revisione delle aperture. Le correzioni in **Pianta per annuncio** rimangono illustrative. Il salvataggio tecnico aggiorna vani e aperture insieme, conserva il lordo e la scala e invalida il computo precedente quando cambiano i contorni. La porta da 80 cm della prova è stata salvata con la scala allora presente e verificata riaprendo l’editor.

**Uniforma muri interni** propone lo spessore mediano dei tramezzi comparabili, lasciando il centro della parete in posizione. Cerca facce quasi allineate e opposte con ampia sovrapposizione; salta coppie ambigue, pertinenze e vani con simboli o vuoti. Correzioni sostanziali, muri obliqui reali e casi irregolari restano manuali. La proposta si vede prima del salvataggio e non certifica lo spessore reale.

Il lettore locale riconosce il segmento evidenziato tra tacche, con una quota in metri centrata anche quando è verticale. Verificati la geometria e l’OCR italiano sul PDF di prova renderizzato localmente; l’originale non è incluso nel repository. **Cambia scala → Rileggi barra metrica** propone gli estremi sull’intero originale senza sovrascrivere la scala già salvata. La lettura può astenersi se geometria e testo non sono leggibili o se le misure sono in conflitto. Nessuna nuova chiamata AI a pagamento.

Verifiche del lotto: 135 test backend, 24 DB/HTTP su cluster isolato poi arrestato, 137 frontend del modulo e controlli statici/build. Nella pratica locale l’editor si apre sui vani di misura e conserva le aperture. Il browser ha riconosciuto i 10 m tra le due tacche del documento associato dopo aver ampliato la finestra OCR per le barre più corte. Prova di lettura senza sostituzione della scala salvata.

Le schede delle verifiche portano al contorno o al punto sulla tavola. Il punto di partenza di un vano non delimitato è indicativo e viene conservato nelle nuove analisi. Per gli esiti già salvati, si usano i riferimenti disponibili oppure si apre la tavola intera. Verificati 59 test frontend mirati, 136 test backend e le build.
