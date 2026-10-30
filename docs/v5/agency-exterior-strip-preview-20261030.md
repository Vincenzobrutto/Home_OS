# Balcone: recupero della fascia esterna — 30 ottobre 2026

## Esito
Aggiunto un contorno candidato della fascia lunga lungo la facciata, coerente con il balcone indicato dall'utente.10contorni totali,0overlap. I nove contorni dell'anteprima archi/bagni sono identici punto per punto e nei vuoti. Originale byte-identico allo SHA registrato; nessun ricalco, punto interno o coordinata del balcone forniti da Codex nel replay finale. Immagine privata: outputs/Dimora-vani-con-balcone/planimetria-con-balcone.png nella cartella della chat.

## Metodo riusabile
Nuovo exterior-strips, solo pixel locali: censisce componenti bianche chiuse senza contatto col bordo immagine, usa minRegionPixels già configurato, asse principale PCA e rapporto lunghezza/larghezza almeno3 con occupazione rettangolo orientato almeno55%. Scarta centri dentro vani esistenti e ogni geometria sovrapposta. Contorno estratto dalla stessa segmentazione sui pixel, senza riempire muri o alterare la fonte.

Una fascia deve risultare vicina ad almeno due vani, tutti sullo stesso lato dell'asse lungo: un passaggio interno fra vani su lati opposti resta escluso. Vicinanza dipende dalla larghezza della fascia, limitata6–30pixel, per comprendere facciate disegnate con spessore e serramenti; è un criterio geometrico sperimentale, non una misura fisica universale. Campione: una componente9115pixelquadrati, vicina a tre regioni della stessa facciata. Le altre componenti lunghe piccole (serramenti/segni) restano escluse dalla soglia esistente1500pixel. Nessun numero atteso di balconi nel codice.

Output source pixel_component, classification exterior_strip_candidate, association unverified, requiresReviewtrue. La geometria non prova destinazione, appartenenza o coefficiente commerciale: in questo caso il significato balcone è indicato dall'utente, non riconosciuto mediante OCR o nuova AI. Nuova verifica exterior_use_and_association_require_review. Nessuna metratura, confirmedfalse e totalM2null.

## Verifiche e integrazione
101/101mirati e630/630backend ordinari, build/lint mirati verdi. Casi sintetici: fascia esterna con due vani sullo stesso lato, corridoio con vani su lati opposti, apertura verso bordo esterno e fascia accanto ad un solo vano. Prova reale dei nove contorni invariati, SHA immutato e zerooverlap. Nessuna AI o spesa aggiuntiva, credenziale o nuova libreria; budget prudenziale4,4985EUR e ricevute0,62295USD invariati.

Funzione di dominio e replay tecnico non persistente; non ancora agganciata al final canonico worker/accettazione workspace. Niente nuove route, DB, browser reale,375px, deploy o merge dichiarati. Demo Alessio invariata. Fonte, seed, coordinate e risposte restano fuori Git. Il laboratorioHTML precedente non viene sostituito con un risultato fittizio.

## Residuo
Validare su planimetrie indipendenti: logge aperte, balconi corti o collegati a un solo vano, parapetti interrotti, facciate spesse, corridoi comuni esterni. Questi casi possono restare omessi o ambigui; il filtro non copre tutti i balconi. Integrare insieme alle altre proposte di superficie con accettazione atomica fonte/versione/SHA/CAS e conferma della destinazione; conservare vani interni e perimetro. Separazioni semantiche degli spazi comunicanti ancora aperte. Non dichiarare completa la casa o generalizzazione dimostrata dal campione noto.
