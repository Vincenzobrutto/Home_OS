# Vani riconosciuti: dettaglio automatico e ricerca locale — 30 ottobre 2026

## Esito visivo corrente
Recuperata automaticamente la componente che comprende ingresso e stanza ovest.8regioni proposte,0sovrapposizioni, geometrie delle7regioni precedenti identiche. Nessun seed, stipite o contorno inserito/corretto da Codex nella prova. Freccia e posizione approssimativa provengono dalla risposta AI già registrata; il motore determina la soglia alternativa sui pixel. Non significa8vani semanticamente separati: ingresso/stanza ovest e vestibolo/altro vano mantengono conflitti di classificazione. Servizi ancora erosi/incompleti, balcone non ricostruito; arco interno ancora da completare in automatico. Nessuna metratura o certificazione, nessun salvataggio nel trial reale scaduto.

Originale invariato. Immagine finale privata negli output della chat Dimora-vani-riconosciuti/planimetria-vani-riconosciuti.png: verde contorni, viola soglia proposta. Non sono state recuperate le coordinate della correzione umana precedente né riutilizzati i suoi involucri dei servizi.

## Implementato nel software
review-focus genera fino3ingrandimenti3x delle osservazioni AI e dei vani irrisolti/servizi; finestre limitate, origine/scala esplicite, pixel nearest-neighbor senza deformare l'originale. La risposta resta in coordinate originali. Diagnostica testuale compatta (seed, bounding box, issue e simboli), contorni completi nell'immagine overlay: evita migliaia di vertici nel prompt. Nessuna terza chiamata obbligatoria: crop inclusi nella revisione già prevista.

L'ingrandimento da solo non ha corretto gli stipiti in questa prova. Aggiunta ricerca geometrica locale quando la prima coppia non chiude il vano: ROI derivata dall'osservazione AI, scansione multiorientamento con ponti su brevi segni grafici fra tratti forti. Nessun pixel della freccia cancellato. I candidati devono rispettare gli assi murari dominanti sostenuti dalla maggioranza dei bordi lunghi delle regioni già ricostruite. Stipiti, appoggi, punti sui lati opposti e varco libero restano obbligatori.

Ogni alternativa viene provata con le stesse guardie: target isolato, punto esterno escluso, nessun seed escluso inglobato, geometrie preesistenti identiche, zerooverlap. Deduplicazione coppie, massimo8prove geometriche complessive; ricerca incompleta o più coppie accettabili rimangono ambigue, non si sceglie per numero di vani. Se mancano assi dominanti da regioni precedenti il fallback non inventa un orientamento.

Sul campione sono state provate3alternative raffinate, una sola ha superato le guardie. endpointSource pixel_neighborhood_search e search conservano motivazione iniziale, candidati e numero prove; hintSource resta ai. Provenienza non trasformata in conferma. Fingerprint pipelinev6; metadati nel normale snapshot scoped già esistente, nessuna nuova route o tabella. Il laboratorioHTML precedente non è stato modificato o riavviato.

## Limiti emersi e costo
Esperimento locale senza filtro assi trovava anche falsi tagli trasversali capaci di isolare una componente: sono stati esclusi dal metodo finale, non mostrati come successo. Il vincolo di isolamento da solo non basta per dimostrare il muro. Resta una bozza da verificare su planimetrie nuove: sviluppo e prova sono sullo stesso campione noto, non una misura di generalizzazione.

Una sola nuova revisione AI con cropautomatici e dati precedenti, nessun invio inventory ripetuto e nessun retry.7456input/916output,0,024072USD; preflight massimo1976output,0,034672USD entro cap0,035USD. Bound prudenziale aggregato4,4985EUR entro tetto4,50, ricevute totali0,62295USD. Nessuna riserva storica rilasciata, factor2,5 prudenziale non cambio. Nessun ulteriore invio disponibile nel budget prudenziale residuo. Nuovo benchmark non da zero: riusa le proposte AI precedenti; ricerca dei candidati finale completamente locale senza nuovi messaggi al provider.

## Verifiche
95/95mirati, inclusi crop/pixel mapping e contratto compatto, ricerca da hint spostato con freccia sottile, conservazione stanza estranea ed originale. Backend ordinario completo finale624/624; build/lint mirati verdi. Primo build intermedio segnalava import inutilizzato nella nuova utility, rimosso; nessun assert allentato. Il run622/622 precede gli ultimi due test e il filtro locale: non è il risultato finale. Nessun nuovo DB/HTTP/browser/375px dichiarato: contratti di persistenza e privacy precedenti restano distinti. Nessuna AI aggiuntiva dai test, dipendenza installata, demoAlessio, merge o deploy.

## Residuo
Censire/separare meglio le celle dei servizi ed automatizzare scelta dell'involucro senza includere arredi o vuoti impropri; arco di porta e balcone ancora aperti. Prove su corpus indipendente con scale/qualità/rotazioni diverse e aperture multiple necessarie simultaneamente. Il successo della soglia non autorizza a dichiarare completa la casa. Nessuna correzione manuale nascosta nell'immagine consegnata.
