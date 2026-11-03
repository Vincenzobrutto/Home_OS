# Agenzie — candidato integrato documenti e mappa, 3 novembre 2026

## Incarico e risultato atteso

Proseguire in autonomia fino a un candidato coerente e verificato: revisione della mappa PR78 e riunione con analisi documentale PR77, quindi correzioni circoscritte al percorso fonti → proposte citate → associazione → conferma → confronti/finding → preparazione incarico. La generazione resta bloccata senza modello approvato; nessuna AI reale o spesa, deploy/main, demo Alessio, dati personali o servizi/DB esistenti.

Base comune3335ea94af353d8e232508169024e531ab6d22b2; PR78 a89fbd55dd051393e54f583939b377688b4cfd302 e PR77 a7cae566d5d8e60850378eb9ade059e72efb25533. Nuovo ramo `codex/agenzie-documenti-consolidamento-20261103`, worktree separato. I risultati storici dei rami non costituiscono QA di questo candidato.

## Sequenza e criteri di chiusura

1. Riesame indipendente delle due PR complete e registrazione dei difetti reali.
2. Merge dei rami nel solo candidato, conservando entrambi i genitori e risolvendo le sovrapposizioni documentali senza scartare funzionalità.
3. Continuità tra pannelli: nessuna vista derivata mostrata come aggiornata dopo una conferma se contiene ancora una vecchia revisione; nessuna perdita di modifiche locali o retry incerto automatico.
4. Fixture con successione e difformità: fonte/pagina/citazione, persona storica distinta, identificativi discordanti, binding e conferma separati, readiness esplicita e nessuna bozza generabile.
5. Test frontend/backend pertinenti, DB/HTTP e browser desktop/375 su nuovi cluster protetti, poi arresto e verifica. Nessun riuso di collaudi scaduti o servizi reali.
6. Report, guida, commit selettivi, hash remoto verificato e PR draft verso il comune. Candidato revisionabile, nessun merge automatico nel comune o main.

## Avanzamento

Pianificazione registrata prima del codice. Riesame indipendente della PR78 completa senza blocker; riesame del verticale documentale senza blocker di sicurezza nel campione esaminato. PR78 e PR77 riunite nel candidato con due merge che conservano tutti i genitori; conflitti soltanto nelle registrazioni dei test e nella documentazione, risolti mantenendo entrambi i gruppi e verificando il parsing. Nessun backend di prodotto riscritto durante l'integrazione.

## Correzioni di continuità e fonti

Prodotto `06eb1ac2ce95cfb3c5f1d8cee3aeda9a8f492c10`: una mutazione riuscita invalida le viste sorelle della stessa pratica. Il pannello che ha appena salvato mantiene la propria risposta autorevole; gli altri eseguono soltanto nuove letture, senza rimontaggio o POST automatici. Anche la pratica esterna riceve la notifica, aggiornando la revisione per il successivo avvio e la Gift. Un errore o un invio dall'esito sconosciuto non produce invalidazione di successo.

L'aggiornamento è differito in presenza di bozza locale, selezioni, conflitto, richiesta in corso o incerta, con avviso esplicito. Un registro locale delle modifiche protegge le prime modifiche concomitanti al refresh; le chiavi idempotenti vengono conservate. La sola lettura non impedisce un GET sicuro, ma blocca i retry mutativi se il permesso è stato ridotto.

Il riesame ha individuato anche la perdita di una bozza sorella dopo un'associazione: la chiave delle candidate dipendeva dalla revisione globale. Ora dipende dal record/candidato, impronta della fonte e associazioni di quel candidato; un salvataggio non azzera le scelte di un altro candidato.

“Apri fonte” mostra ora un'anteprima locale della pagina fisica richiesta, affiancata alla citazione letterale. Si riusa il renderer PDF già presente, con pagina iniziale opzionale; pagina invalida/fuori intervallo o formato non supportato mostrano un limite esplicito, senza sostituire pagina1. Nessun visualizzatore remoto, nuova estrazione, bounding box o evidenziazione semantica inventata. Download dell'originale e chiusura restano disponibili; scope/versione/SHA, abort e revoca del Blob URL sono conservati. La fonte completa resta immutata.

## Verifiche del candidato

- Backend ordinario: **935/935**, zero skip/fail. I precedenti930 e894 dei rami non sono i risultati di questa esecuzione.
- Nuovo cluster protetto `cgnu2w`: **77/77** DB/HTTP, comprendenti entrambi i gruppi originari e il nuovo percorso sintetico. Runner completato, stop PostgreSQL e assenza di processi/listener posseduti verificati; nessun cluster utente riusato o fermato.
- Percorso nuovo: upload/classificazione di due PDF distinti, successione con due eredi e visura sub12/sub13, due job fixture con consenso, citazioni a pagina2 e rifiuto di una citazione inventata. Associazione distinta da conferma, persona storica distinta, confronto senza sovrascrittura, osservazioni manuali di successione/difformità e reload senza invii aggiuntivi.
- Preparazione incarico: helper interno sui fatti confermati persistiti, espressamente distinto da un endpoint di generazione. Valori proposti esclusi, modello mancante e `canGenerateDraft:false`, problemi aperti non certificati automaticamente.
- Registrazione profili aggiornata e controllo diretto2/2; typecheck app e lint mirato finali verdi. Prima verifica app aveva un solo errore di indice opzionale nel MIME dell'anteprima, corretto senza cambiare i controlli della fonte.
- Gruppo revisione122/122 e anteprima17/17 verdi nelle verifiche intermedie. Seguiti fonte/confronto19/19 e ruolo storico19/19; app/node TypeScript, lint e build finale del prodotto e6 verdi, avviso chunk524,10kB preesistente.
- Primo aggregato frontend: **2162/2163** in201file, un solo errore nel primo caso Onboarding, prima dell'apertura del PDF. Lo stack mostra ancora “Caricamento della sezione”, non il renderer (che quel test sostituisce integralmente). Diagnostica del solo caso1/1 verde; introdotto nel solo test il preload del modulo differito, coerente con gli altri harness, senza cambiare asserzioni/timeout/retry. Intero file **74/74** verde. Nuovo aggregato completo sulla fonte congelata ee9ca59 ancora in esecuzione; non è dichiarato verde dal risultato del solo file.

### Collaudo visivo in due fasi

Rn8oFD, fonte06eb: normale accesso dell'agente fixture, successione e visura con due job distinti, citazioni, conservazione della bozza di Sara durante il binding di un altro dato, conferma separata, disponibilità del dato confermato nella preparazione senza ricarica manuale, aggiornamento differito esplicito e ripresa dopo pulizia della bozza, sub13 ancora proposto e confronto con12 confermato. Confronto visibile nel registro automaticamente; osservazione manuale di distribuzione interna senza citazioni inventate, poi due questioni aperte nella preparazione. Reload conserva i dati senza altre fasi provider. Desktop/375px, larghezza375 con scrollWidth360, console senza errori. Due job e quattro sole fasi fixture, costo zero. Runner1/1 e arresto PostgreSQL/pid/listener verificati.

La prova ha evidenziato che l'anteprima era montata correttamente ma fuori dalla vista. Correzione395: focus e scorrimento all'apertura, chiusura con ritorno all'origine ancora presente senza sottrarre focus a interazioni esterne. Corretto anche il testo del confronto che richiedeva una ricarica non più necessaria. Correzione e6: “Proprietario indicato nel documento storico” non presume una vendita in una successione.

Nuovo cluster iiAsNV, fonte e6, senza riusare il primo: anteprima della pagina2 realmente visibile (top15,7px), regione focalizzata, citazione e PDF corrispondenti; chiusura torna al pulsante originale visibile. A375×812 la fonte si apre direttamente, scrollWidth360 anche a zoom200%, nessun errore console; nessun visualizzatore esterno o nuova AI. Un solo job e due sole fasi fixture, costo zero. Viewport ripristinato, solo tab creati chiusi; runner1/1, stop PostgreSQL e assenza di pid/listener verificati. Screenshot sintetici negli outputs, nessun originale personale in Git.

## Limiti preservati

Provider reale non attivato e nessuna chiamata AI o spesa. Fixture limitate al test e vincolate ai byte/SHA; nessun fallback simulato nel runtime. Prima versione solo PDF con testo nativo; OCR, accuratezza di un modello reale e catalogo esteso non sono verificati da questo candidato. Modello incarico approvato ancora assente. UI mappa della casa reale e relativi dati lasciati invariati; screenshot/report sintetici restano negli outputs. Nessun deploy, main o modifica della demo Alessio; pubblicazione del candidato e decisione sul comune sono passi distinti.
