# Stato di Dimora
*10 novembre 2026*

Il ramo di riferimento è **`codex/dimora-v5-consolidata-20261023`**. Il ramo comune include le PR 81–84 di Agenzie. L’app sul PC segue il suo rilascio locale e va aggiornata separatamente. Il pilota con utenti reali resta in attesa della prova AI, delle tutele sui dati e della verifica operativa di recupero e ripristino. Le prove sintetiche usano documenti e account di collaudo.

## Cosa c’è oggi

| Area | Funziona e risulta verificato | Implementato, da verificare | Manca |
| --- | --- | --- | --- |
| Casa / Home | Navigazione, riepilogo e schede della casa | Percorso completo con un nuovo proprietario nel pilota | Uscita controllata dalla casa, compresi i dati collegati |
| Documenti | Archivio, ricerca, raccolte, caricamento e revisione delle proposte | Qualità dell’estrazione e della compilazione con un campione reale | Conversione HEIC, rinviata |
| Spese e bollette | Riepilogo e gruppi di spesa, lettura locale di bollette testuali e revisione | Prova BL-04 su telefono, tenuta su formati e immagini diverse | Andamento mensile nel comune, in revisione nella PR 70 |
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

Sul PC già configurato, aprire **http://127.0.0.1:5174** e accedere normalmente. L’API locale ascolta sulla porta 3011. Se la pagina non risponde, far riavviare i servizi dal responsabile del PC usando il rilascio locale già predisposto. Agenzie e Gift sono soggetti ai blocchi operativi di quel rilascio. La configurazione e i dati locali restano separati dal ramo di riferimento. [Scheda di rilascio locale](https://github.com/Vincenzobrutto/Home_OS/pull/80)

## Decisioni aperte

- Concordare perimetro del pilota, campione di documenti e tetto di spesa AI prima di ogni invio.
- Scegliere indirizzo di assistenza e responsabilità per recupero, ripristino e richieste di eliminazione.
- Per Agenzie, fornire il modello d’incarico e decidere quando si applicano i coefficienti balconi del 35% e del 25%. Decidere quando attivare Agenzie e Gift.
- Organizzare la prova BL-04 su telefono e confermare quando riprendere la conversione HEIC.

Il lavoro residuo è ordinato nei [prossimi passi](prossimi-passi.md).

## Appendice tecnica

- Base del ramo comune a inizio inventario `cfff252`. I sei commit della PR 83, da `64ee004` a `9edb30d`, sono antenati della PR 84.

- Pubblicazione Agenzie `9fd85ca`. Backend 955/955, frontend mock e fixture 2.257/2.257, database 857/857, HTTP 54/54, riavvio 2/2. Typecheck, lint e build superati. Il test Condivisione falliva anche sulla base comune per il caricamento iniziale della scheda documento. Il test ora precarica il modulo, con asserzioni e timeout invariati. La prima suite DB sotto carico ha raggiunto il limite del runner e segnalato un errore Gift. La ripetizione isolata e la suite completa eseguita da sola sono verdi. I cluster temporanei sono stati arrestati.
- GitHub mostra la PR 81 integrata. Le PR 82–84 puntano ancora ai rispettivi rami intermedi. Le loro punte sono tutte incluse nel ramo comune.

### Pull request precedenti

| PR | Proposta | Motivo |
| --- | --- | --- |
| [70](https://github.com/Vincenzobrutto/Home_OS/pull/70) | Aggiornare | L’andamento mensile ha prove verdi sul ramo di origine. La PR è in conflitto con il comune e richiede un nuovo collaudo dopo l’allineamento. |
| [67](https://github.com/Vincenzobrutto/Home_OS/pull/67) | Chiudere conservando il rapporto nella PR | Il codice del riepilogo è già nel comune. La PR registra la vecchia preview e confligge con i registri correnti. |
| [63](https://github.com/Vincenzobrutto/Home_OS/pull/63) | Chiudere conservando il rapporto nella PR | Le etichette sono già nel comune. La PR conserva il rapporto operativo dell’epoca e confligge con i registri correnti. |
| [80](https://github.com/Vincenzobrutto/Home_OS/pull/80) | Unire come ricevuta di rilascio quando la base lo consente | Documenta il rilascio locale già verificato. I conflitti con il comune riguardano solo i registri. Riportare la ricevuta in una proposta documentale aggiornata, conservando le registrazioni Agenzie. |

I checkout e i rami già contenuti nel comune sono candidati alla dismissione dopo il controllo delle modifiche locali e delle PR collegate. Le alternative storiche che contengono commit solo locali restano conservate.
