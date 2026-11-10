# Stato di Dimora
*10 novembre 2026*

Il ramo di riferimento è **`codex/dimora-v5-consolidata-20261023`**. Il ramo comune include le PR 81–84 di Agenzie e l’andamento mensile di Spese. L’app sul PC segue il suo rilascio locale e va aggiornata separatamente. Il pilota con utenti reali resta in attesa della prova AI, delle tutele sui dati e della verifica operativa di recupero e ripristino. Le prove sintetiche usano documenti e account di collaudo.

## Cosa c’è oggi

| Area | Funziona e risulta verificato | Implementato, da verificare | Manca |
| --- | --- | --- | --- |
| Casa / Home | Navigazione, riepilogo e schede della casa | Percorso completo con un nuovo proprietario nel pilota | Uscita controllata dalla casa, compresi i dati collegati |
| Documenti | Archivio, ricerca, raccolte, caricamento e revisione delle proposte | Qualità dell’estrazione e della compilazione con un campione reale | Conversione HEIC, rinviata |
| Spese e bollette | Riepilogo, gruppi e andamento mensile nel comune, lettura locale di bollette testuali e revisione | Prova BL-04 su telefono, tenuta su formati e immagini diverse | Copertura più ampia delle bollette raster |
| Oggetti e Ambienti | Schede collegate alla mappa, trascinamento verificato in collaudo, vista con rotazione e sfondo facoltativo | Touch su telefono, mappe dense e validazione della scala e dei contorni importati | Multipiano e computo Home, da pianificare |
| Attività e promemoria | Creazione e gestione nel prodotto, con prove API | Affidabilità del percorso quotidiano nel pilota | Consegna dei promemoria fuori dall’app da definire |
| Storia della casa | Cronologia degli eventi e collegamenti alle schede | Utilità e copertura nella prova d’uso | Casi ulteriori da scegliere dopo il pilota |
| Rubrica | Schede contatto e collegamenti, con consenso separato per le proposte | Uso reale con più persone e ruoli | Estensioni da scegliere dopo la prova |
| Cestino | Cestino documenti, ripristino e cancellazione definitiva con controlli | Percorso di assistenza su casi pilota | Eliminazione di schede, casa, account e gestione delle copie di backup |
| Condivisione | Inviti e permessi verificati in ambiente di prova | Inviti, revoca e accessi residui nel percorso pilota | Configurazione operativa del canale email |
| Agenzie | Pratica, documenti, mappa, editor planimetrie e percorso di consegna verificati su dati sintetici | Accuratezza AI e OCR con casi indipendenti e prova operativa | Modello d’incarico approvato e criteri per la stima commerciale |
| Gift | Invito, accettazione, copia di documenti e mappa con provenienza, verificati su dati sintetici | Uso con destinatari reali, inclusa la nuova registrazione | Attivazione operativa e produzione automatica degli allegati finali |
| Fase 0 | Cestino documenti, percorsi tecnici di recupero ed export personale con prove isolate | Recupero via assistenza ed email, fruibilità dell’export, ripristino completo da backup | Soglia AI superata, prova con documenti reali ed eliminazione completa |

## Condizioni per il pilota

- **AI.** La campagna v24 non ha superato la soglia. Importo 91%, data 90%, stabilità 87%, due errori critici sullo split payment Q15. La tappa con documenti reali è ancora da fare. [Rapporto v24](v5/fase0-quality-v24-campaign-20261023.md)
- **Eliminazione.** È operativo il solo cestino documenti. Il progetto approvato il 22 ottobre copre anche schede, casa, account e backup. [Progetto approvato](v5/fase0-deletion-design-20261022.md)
- **Recupero, backup ed export.** Il recupero via Brevo e l’export personale della casa hanno prove tecniche. Il rilascio locale ha prodotto un backup controllato di database e originali. Per il pilota servono indirizzo assistenza, una prova di recupero, un ripristino end-to-end e una verifica del pacchetto export. [Recupero](v5/fase0-recovery-design-20261016.md) · [Export](v5/fase0-export-design-20261016.md)

## App sul PC

Sul PC già configurato, aprire **http://127.0.0.1:5174** e accedere normalmente. L’API locale ascolta sulla porta 3011. Se la pagina non risponde, far riavviare i servizi dal responsabile del PC usando il rilascio locale già predisposto. La ricevuta registra l’attivazione locale di Agenzie e Gift il 4 novembre, con AI a pagamento ed email disabilitate. Il registro del 5 novembre documenta un aggiornamento locale successivo. La configurazione e i dati locali restano separati dal ramo di riferimento. [Ricevuta del rilascio locale](https://github.com/Vincenzobrutto/Home_OS/blob/codex/dimora-v5-consolidata-20261023/docs/v5/local-common-runtime-20261103.md)

## Decisioni aperte

- Concordare perimetro del pilota, campione di documenti e tetto di spesa AI prima di ogni invio.
- Scegliere indirizzo di assistenza e responsabilità per recupero, ripristino e richieste di eliminazione.
- Per Agenzie, fornire il modello d’incarico e decidere quando si applicano i coefficienti balconi del 35% e del 25%. Decidere quando attivare Agenzie e Gift.
- Organizzare la prova BL-04 su telefono e confermare quando riprendere la conversione HEIC.

Il lavoro residuo è ordinato nei [prossimi passi](prossimi-passi.md).

## Appendice tecnica

- Base del ramo comune a inizio inventario `cfff252`. I sei commit della PR 83, da `64ee004` a `9edb30d`, sono antenati della PR 84.

- Pubblicazione Agenzie `9fd85ca`. Backend 955/955, frontend mock e fixture 2.257/2.257, database 857/857, HTTP 54/54, riavvio 2/2. Typecheck, lint e build superati. Il test Condivisione falliva anche sulla base comune per il caricamento iniziale della scheda documento. Il test ora precarica il modulo, con asserzioni e timeout invariati. La prima suite DB sotto carico ha raggiunto il limite del runner e segnalato un errore Gift. La ripetizione isolata e la suite completa eseguita da sola sono verdi. I cluster temporanei sono stati arrestati.
- GitHub mostra la PR 81 integrata. Le PR 82–84 sono chiuse. Tutti i loro commit e i rapporti sono nel ramo comune e i rami originali restano disponibili.

### Pull request precedenti

| PR | Proposta | Motivo |
| --- | --- | --- |
| [70](https://github.com/Vincenzobrutto/Home_OS/pull/70) | Integrata | Andamento mensile verificato con 131 test mirati e browser a 1440, 873, 390 e 320 px. Typecheck, lint e build verdi. |
| [67](https://github.com/Vincenzobrutto/Home_OS/pull/67) | Chiusa | Il codice del riepilogo è nel comune. [Rapporto storico](https://github.com/Vincenzobrutto/Home_OS/blob/codex/rilascio-riepilogo-preview-20261026/docs/v5/spese-riepilogo-rilascio-preview-20261026.md). |
| [63](https://github.com/Vincenzobrutto/Home_OS/pull/63) | Chiusa | Il codice delle etichette è nel comune. [Rapporto storico](https://github.com/Vincenzobrutto/Home_OS/blob/codex/rilascio-spese-etichette-20261026/docs/v5/spese-etichette-rilascio-20261026.md). |
| [80](https://github.com/Vincenzobrutto/Home_OS/pull/80) | Integrata | Ricevuta storica del rilascio locale del 3 novembre e dell’attivazione Agenzie e Gift del 4 novembre. |

I checkout e i rami già contenuti nel comune sono candidati alla dismissione dopo il controllo delle modifiche locali e delle PR collegate. Le alternative storiche che contengono commit solo locali restano conservate.
