# Aree non censite — confronto su altre due immagini, 31 ottobre 2026

## Protocollo congelato
Codice del rilevatore al commit b16e211b4152d37e4bc3bb44912b120d48637d76, senza modifiche o parametri adattati ai risultati. Due immagini diverse dal PDF usato per sviluppare il controllo, già note ai moduli precedenti: non un corpus nuovo e non una nuova prova AI indipendente. Riutilizzata per ciascun caso la proposta AI salvata, con lo stesso schema di replay usato nei riferimenti precedenti. Raster confrontato tramite hash, profilo raster e due fasi cached invariati; nessun punto o contorno corretto manualmente, nessuna nuova richiesta esterna o spesa.

## A — pianta inclinata con cantina separata
Otto regioni canoniche precedenti, proposta complessiva da10a11 geometrie. Il controllo locale segnala tre candidate: due interferiscono con correzioni già contenute nella proposta e restano coverage_area_conflict; una soltanto viene aggiunta come area da verificare. Quest'ultima appare visivamente come una fascia muraria tra ambienti, non come un nuovo vano: falso candidato probabile da mantenere visibile nella valutazione, non successo di riconoscimento. Componente1761pixel, margine interno massimo8pixel: il solo bianco chiuso fra vani noti non distingue una cavità della rappresentazione del muro da pavimento.

I dieci contorni della precedente proposta e gli otto canonici sono rimasti identici, zero sovrapposizioni. La cantina e il balcone visibili provengono dal procedimento precedente, non dal nuovo controllo v9. Le tre segnalazioni non equivalgono a tre nuove stanze. Tempo locale osservato circa20secondi su questa macchina, non benchmark universale.

## B — pianta con muri chiari
Base canonica0 e proposta9, entrambe identiche al riferimento. Il recupero ottico mantiene visibili due bagni e due balconi, con ingresso/vano adiacente ancora nella stessa regione e issue di classificazione duplicata/apertura irrisolta. Nessuna nuova candidata di copertura, zero sovrapposizioni.

Questo zero non dimostra completezza: il rilevatore cerca componenti separate ed è attualmente applicato alla base prima del fallback di contrasto. Con base vuota non dispone dei due interni necessari; inoltre una zona già unita a un vano riconosciuto non è una componente senza assegnazione. Sono due limiti distinti: copertura sul risultato del contrasto da integrare e separazione semantica di componenti comunicanti. Tempo locale osservato circa1,4secondi, esclusi invii AI che non sono avvenuti.

## Esito e priorità
Il successo sul corridoio del PDF noto non basta a generalizzare. Le candidate restano proposte e non modificano automaticamente i vani; il controllo segnala anche falsi positivi e non separa ambienti uniti. Prima priorità: distinguere fasce murarie/elementi grafici da spazi di pavimento con più evidenze, senza una soglia pixel scelta per questa sola foto. Seconda: applicare coerentemente la copertura alle geometrie proposte dal recupero ottico. Poi: separazione guidata da aperture e distribuzione nei casi di una sola componente per più ambienti, già segnalati dal censimento.

Nessuna regola è stata modificata per far passare questi due esempi. Nuove versioni dovranno mantenere questi risultati come riferimento e confrontarsi anche con documenti ulteriori, annotati da un agente reale. Immagini e verifiche dettagliate solo negli output privati Dimora-aree-confronto. Codice, demo Alessio, budget, servizi/DB, main/merge/deploy invariati. Nessuna nuova suite backend/UI/DB ripetuta: è un benchmark locale di replay, non un rilascio o collaudo web.
