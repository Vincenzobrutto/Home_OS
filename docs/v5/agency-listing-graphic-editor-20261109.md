# Editor grafico della pianta per annuncio — 9 novembre 2026

In Planimetria → Pianta per annuncio → Modifica pianta per l’annuncio si parte dall’illustrazione proposta. Selezionando un vano si possono trascinare i vertici del suo perimetro; le frecce spostano il punto con il focus. Si può sovrapporre la planimetria originale come riferimento. Lo zoom parte con la mappa interamente visibile.

Selezionando un vano, trascina un lato per spostare l’intera parete perpendicolarmente, mantenendola parallela e portando con sé le aperture agganciate. Con Orto attivo, il trascinamento di un vertice aggancia le coordinate dei vertici adiacenti quando sono vicine, per ottenere lati orizzontali o verticali. Gli spostamenti incompatibili con i contorni sono respinti.

Durante il trascinamento, le guide tratteggiate collegano il vertice o la parete a un altro lato quasi allineato sulla stessa orizzontale o verticale. Tieni premuto Shift per attivare temporaneamente Orto anche a trascinamento iniziato. Le guide scompaiono al rilascio.

Porte e finestre si aggiungono con due clic lungo un muro. Il simbolo si trascina per spostarlo, gli estremi per ridimensionarlo. Le proposte rilevate si controllano direttamente sulla mappa e soltanto quelle confermate entrano nel PNG. Gli allineamenti salvati con il comando precedente rimangono applicati.

Il salvataggio aggiorna soltanto l’illustrazione associata alla revisione geometrica corrente. I contorni illustrativi non cambiano i vani, le superfici o la mappa del proprietario. L’anteprima e il PNG usano gli stessi contorni salvati; il PDF resta un riferimento dell’editor e non viene esportato.

Verifica del 10 novembre: 14 test di geometria, controllo TypeScript e lint mirato. Nel browser sulla pratica sintetica sono stati verificati l’aggancio Orto, lo spostamento della parete con una finestra e la riapertura delle posizioni salvate.

Verifica del 9 novembre: suite planimetrie backend 134/134 e frontend Agenzie 124/124. Browser desktop su pratica sintetica: trascinamento di un vertice, aggiunta e spostamento di una finestra, riapertura con gli stessi contorni/aperture e confronto del PNG con l’anteprima. Non è un collaudo sulla pratica reale; nessuna chiamata AI, migrazione o deploy.
