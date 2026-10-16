# Collaudo reale caricamento, apertura ed export

16 ottobre 2026. Esito positivo nel perimetro provato. È possibile iniziare un primo piccolo lotto personale come archivio, con i limiti di conservazione e trattamento già dichiarati. Non è la chiusura della qualità AI o dell'eliminazione dei dati.

## Ambiente e isolamento

Chrome collegato attraverso l'estensione, account sintetico esistente «Collaudo C1 Mittente», casa f375f8f0-96ed-4dfe-a7dd-5d24f7927e7a. Login ordinario con credenziale di fixture già esistente; nessun cookie iniettato, nuova credenziale o modifica dei permessi dell'account. Account storico non soggetto al blocco upload dei nuovi account: la verifica email dei nuovi utenti non è stata ricollaudata qui; il committente l'ha già completata con il proprio account.

Il committente ha collegato Chrome e abilitato nell'estensione l'accesso agli URL dei file. Il browser integrato con il suo account Vincenzo non è stato disconnesso o usato per le scritture di prova. Nessun documento personale, invio email, analisi AI, modifica .env, sicurezza Windows, backend, schema o riavvio servizi.

Le precedenti prove tramite controllo nativo Chrome erano bloccate e non vengono conteggiate come collaudo. Dopo il collegamento, la modifica dell'opzione estensione ha interrotto temporaneamente la connessione; riconnessa la stessa scheda. Nessun invio incerto ripetuto.

## Verifiche osservate e risultati

| Percorso reale | Risultato |
|---|---|
| Upload PDF desktop | invoice.pdf, 820 byte, titolo modificato, Solo io selezionato di default; stato «Caricamento e controllo del file…», poi «Documento caricato», focus sull'esito e nuovo elemento in archivio |
| Apertura PDF | Dettaglio, metadati e anteprima Chrome leggibile della fattura sintetica; nessuna conferma automatica di dati estratti |
| Download originali | Nuovo PDF, PDF sintetico preesistente e PNG scaricati dai rispettivi pulsanti; byte e SHA256 identici ai tre campioni locali |
| ZIP desktop | Due PDF selezionati; messaggio ZIP pronto; file fisico con esattamente due originali e manifest.json, hash e nomi originali attesi |
| JSON desktop | Download personal-home-export v1, casa/account sintetici corretti, due documenti privati con hash corretti; altri insiemi vuoti coerenti con questa fixture |
| Upload PNG mobile 390×844 | Fixture PNG da 68 byte, titolo e Solo io, salvataggio riuscito; dettaglio con immagine caricata (complete=true, naturalWidth/Height=1). È un pixel sintetico, non una prova di leggibilità di fotografie reali |
| Download/export mobile 320×740 | Originale PNG scaricato; ZIP con PDF+PNG e manifesto verificati; JSON con tutti e tre i documenti presenti, hash corretti |
| Invio mobile senza file | Messaggi «Scegli un file da caricare» e «Inserisci un titolo», focus sul file; nessun successo apparente |
| Reload della pagina | I tre documenti rimangono in archivio; selezione ZIP azzerata, nessun nuovo caricamento automatico |

Due nuovi documenti soltanto, entrambi sintetici: PDF 9af48e0a-9e1b-497c-801b-e39b012a7cd5 e PNG f729ac94-7102-43bf-a272-d93cd29858c3. Fixture precedenti preservate. Nessuna cancellazione.

Il listener download dello strumento è scaduto per il primo originale anche se Chrome aveva già scritto il file in Download. Il risultato è verificato sul file fisico appena prodotto e sul suo hash, non dedotto dall'assenza di errore della UI. Per gli altri download si sono usati pulsante, esito visibile e verifica dei file effettivi, senza ripetere il download per recuperare un evento mancante.

## Difetto trovato e corretto

A 320 px, con scrollbar classica Windows, body min-width:320px imponeva 320 px contro un clientWidth di 305: scorrimento orizzontale di 15 px. Corretto soltanto frontend-v5/src/styles/global.css con min-width:0; non nascosto l'overflow.

Verifica browser dopo aggiornamento: body e documentElement scrollWidth=305, clientWidth=305 nel dettaglio e nell'archivio/export, e nel modulo upload a 320 px. Titolo e collegamento indietro vanno a capo; comandi disponibili. Viewport390 osservato e screenshot acquisito, nessuno smartphone fisico utilizzato. Override dimensioni ripristinato al termine.

Build frontend e lint completi verdi dopo il fix. Nessuna nuova suite JS ripetuta per una modifica CSS: la verifica rilevante è quella del layout reale. Nessuna dichiarazione WCAG.

## Evidenze ripetibili

Nel workspace outputs/fase0-browser-20261016/:

- verify-downloads.cjs: lettura dei soli file sintetici individuati in Download, confronto binario, contenuto ZIP/manifesti, formato e documenti JSON; esecuzione riuscita.
- verification.json: tre originali identici, due ZIP con hash corretti, due JSON v1 con due e tre documenti rispettivamente.
- desktop-final.jpg, mobile-upload-390.jpg, mobile-original-390.jpg, mobile-original-320.jpg (prima), mobile-original-320-after.jpg, mobile-export-320.jpg, mobile-upload-320-after.jpg. Screenshot intermedi a pagina intera; desktop-final è viewport normale.

I nomi dei download includono il suffisso assegnato da Chrome per evitare di sovrascrivere file precedenti: documenti-dimora (1).zip e (2).zip, invoice (1).pdf, JSON iniziale e (1).json. Non eliminati o sovrascritti file precedenti. Nessuna credenziale o token nel rapporto.

## Conseguenza per la prova personale

Il requisito di collaudo visivo reale upload/apertura/export è soddisfatto per il primo lotto come archivio locale, con account QA separato e viewport desktop/mobile. JPEG e guasti di rete/storage/revoca restano coperti dalle precedenti prove API/harness, non nuovamente eseguiti nel browser. JSON provato qui su soli documenti; dati complessi/storie/privacy già coperti dai test API/DB del personal export.

Prossimo: nel browser integrato, account Vincenzo, creare la propria casa e iniziare con 2–3 PDF non delicati in Solo io, conservando gli originali. Dopo il primo lotto occorre un nuovo punto di backup con la procedura verificata: quello precedente non contiene questi futuri caricamenti. Nessun backup automatico dichiarato.

Analisi AI personale ancora separata: raccogliere e verificare corpus/scorer di Claude, poi campagna sintetica con nuovo budget e consenso prima dei documenti personali. Eliminazione tecnica e ciclo delle copie rimangono aperti come in prova-personale-conservazione-20261016.md; non diventano funzioni disponibili grazie a questo collaudo. Nessuna Fase0 complessivamente conclusa, guida/BL04/Agenzie non avviati.
