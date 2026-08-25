# Vision

## Identità di prodotto e fonti di verità

**Dimora** è il nome e il posizionamento del prodotto destinato a utenti, partner e investitori. **HomeOS** resta il nome tecnico storico del repository e del prototipo applicativo. Non sono due prodotti distinti: HomeOS è la base software con cui viene costruita Dimora.

La promessa centrale di Dimora è il **Property Digital Record**: la memoria digitale strutturata dell'immobile. Il Digital Twin, la planimetria, Home Score, manutenzioni, consumi e futuri agenti sono esperienze alimentate da quel record, non prodotti paralleli.

Questa separazione evita due equivoci:

- il documento venture `Dimora` è la fonte della verità su problema, posizionamento, segmenti, modello di business e ipotesi da validare;
- repository, schema Prisma e documentazione tecnica sono la fonte della verità su ciò che è implementato, parziale o futuro.

Nessun materiale esterno deve presentare come disponibile una capacità classificata qui o nel backlog come futura. In particolare, trasferibilità tra proprietari, record "verificato", accesso a fonti regolatorie e marketplace non sono funzionalità attuali.

## Obiettivo del prodotto

HomeOS crea il **"digital twin" di una casa**: raccoglie i documenti che la riguardano (fatture, certificati, manuali, planimetrie) e li collega agli elementi fisici della casa — non li archivia genericamente in una cartella.

Nel linguaggio di prodotto Dimora, questo nucleo è il **Property Digital Record**: `Property` + ambienti/piani + asset e impianti + eventi + documenti e relativa provenienza. Il termine "digital twin" descrive la rappresentazione navigabile che emerge dal record; non implica oggi un modello 3D, telemetria IoT continua o certificazione legale dei dati.

Il centro del sistema è l'**Asset** (caldaia, impianto elettrico, climatizzatore, elettrodomestico...), non il documento. Un documento esiste per arricchire la conoscenza su un Asset o sulla casa nel suo insieme; non è mai un fine a sé stante.

## Utenti

- **Proprietario di casa** (utente primario, unico profilo implementato oggi): vuole sapere cosa ha in casa, quando è stato installato, quando scade una garanzia, chi l'ha riparato l'ultima volta, senza tenere a mente o cercare tra email/cartaccia.
- **Futuri** (non ancora implementati, ma il modello dati li prevede — vedi `domain-model.md` su `HouseMembership`): coniuge/conviventi con accesso alla stessa casa, amministratore di condominio, artigiano con accesso limitato a un intervento.

## Proposta di valore

1. **L'AI legge i documenti al posto tuo.** Carichi una fattura o una foto di un'etichetta, l'AI estrae marca, modello, date, numeri di serie — tu confermi, non trascrivi.
2. **Niente inserimento a mano di ciò che è già scritto altrove.** Gmail e Google Drive possono essere collegati per scansionare automaticamente documenti già ricevuti via email o già archiviati, proponendoli in Inbox invece di richiedere un caricamento manuale.
3. **La casa si vede, non solo si elenca.** Planimetria interattiva con ambienti disegnabili a mano libera e icone degli asset trascinabili nella stanza giusta, ruotabile per adattarsi all'orientamento reale.
4. **Niente dato è mai perso o sovrascritto per errore.** Ogni campo si popola solo se vuoto (mai sovrascritto da un documento successivo), ogni scrittura importante passa da una conferma esplicita dell'utente — vedi il principio "l'AI propone, l'utente conferma" in `decisions.md`.
5. **Accessibile da telefono**, non solo da scrivania — utile nel momento in cui serve davvero (in piedi davanti alla caldaia, con l'etichetta sotto gli occhi).

## Funzionalità principali (stato: implementate)

- **Asset**: creazione, modifica, dismissione/riattivazione, campi strutturati (marca, modello, seriale, date di installazione/acquisto/garanzia con default di 24 mesi) + campi liberi per dati specifici del tipo di impianto.
- **Ambienti**: vista a blocchi e vista planimetria (disegno forme libere o rettangoli, ritaglio automatico sull'area utile, rotazione a 90° con asset che restano nella stanza assegnata).
- **Inbox documentale**: upload manuale, scatto foto da cellulare, scansione automatica di Gmail e Google Drive, estrazione AI (Claude), proposta di asset esistente o creazione di uno nuovo (con scelta dell'ambiente), rilevamento di documenti correlati allo stesso intervento, arricchimento dati via ricerca web su richiesta. Fatture e rapporti di lavori già eseguiti possono inoltre proporre il completamento di piani di manutenzione su uno o più Asset, sempre previa selezione e conferma dell'utente.
- **Documenti casa**: documenti/impianti non legati a un ambiente specifico (es. APE, impianto elettrico condominiale), con ricerca per parola chiave.
- **Rubrica**: contatti (tecnici, aziende) collegabili agli interventi in cronologia.
- **Dashboard**: promemoria (garanzie scadute, asset senza documenti) cliccabili per andare dritti all'asset.
- **Genesis e Home Score**: onboarding guidato verso il primo Digital Twin, score trasparente su cinque dimensioni, Home Detective e andamento storico ricalcolabile sui dati correnti.
- **Consumi elettrici**: bollette trasformate, previa conferma, in periodi interrogabili; confronto mensile con l'anno precedente e contesto degli Asset installati nello stesso periodo, senza attribuzioni causali inventate.
- **Manutenzione programmata**: piani una tantum o ricorrenti per Asset, preavviso configurabile, tecnico abituale, sospensione/riattivazione, completamento con documento e storico; scadenze imminenti o superate visibili in Dashboard.
- **Mobile**: sidebar a scomparsa, layout responsive, planimetria utilizzabile a touch.

Per lo stato dettagliato di cosa è fatto/in corso/pianificato vedi `roadmap.md` e `backlog.md`.

## Confine della promessa Dimora

| Capacità | Stato attuale |
|---|---|
| Asset, ambienti, documenti, eventi e manutenzioni collegati alla casa | Implementata |
| Estrazione AI con conferma utente e acquisizione Gmail/Drive | Implementata nel prototipo; da rendere production-grade |
| Home Score, Issue e Recommendation | Implementata in versione MVP |
| Property Profile catastale/energetico strutturato | Parziale: alcuni dati casa e documenti house-level esistono, manca il profilo completo |
| Entità `System` distinta dagli Asset | Da decidere e modellare; oggi gli impianti sono rappresentati come Asset/tipi di Asset |
| Provenienza e livello di affidabilità per singolo dato | Parziale: campo-per-campo per gli Asset da B38 (origine + chi/quando ha confermato + documento sorgente), non ancora per Room/House, nessuno storico multi-versione |
| Autenticazione, ruoli e isolamento multiutente | Autenticazione reale implementata (B2); ruoli/isolamento oggi solo OWNER per casa, manca l'UI di invito multi-utente (B12) |
| Trasferimento del record al nuovo proprietario | Visione futura, subordinata a identità, permessi, separazione dati e verifica legale |
| Record certificato/verificato per banche o assicurazioni | Non disponibile; usare "record strutturato con provenienza tracciabile" finché non esiste una verifica terza |
| Integrazioni catastali, APE e renovation passport | Future e dipendenti da accessibilità normativa/tecnica delle fonti |
