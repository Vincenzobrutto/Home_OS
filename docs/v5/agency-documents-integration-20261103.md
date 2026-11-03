# Agenzie — candidato integrato documenti e mappa, 3 novembre 2026

## Incarico e risultato atteso

Proseguire in autonomia fino a un candidato coerente e verificato: revisione della mappa PR78 e riunione con analisi documentale PR77, quindi correzioni circoscritte al percorso fonti → proposte citate → associazione → conferma → confronti/finding → preparazione incarico. La generazione resta bloccata senza modello approvato; nessuna AI reale o spesa, deploy/main, demo Alessio, dati personali o servizi/DB esistenti.

Base comune `3335ea94af353d8e232508169024e531ab6d22b2`; PR78 a `89fbd55dd051393e54f583939b377688b4cfd302` e PR77 a `7cae566d5d8e60850378eb9ade059e72efb25533`. Nuovo ramo `codex/agenzie-documenti-consolidamento-20261103`, worktree separato. I risultati storici dei rami non costituiscono QA di questo candidato.

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
- Frontend completo finale: **2163/2163 in 201 file**, zero errori o skip, sessione81648 exit0, fonte congelata `0080b6c45e7d6bba52c84da9ad3e1fba75edd1c0`. Durata2576,39s, progetti mock+fixtures con un worker; log privato `.agency-cache/integrated-frontend-closure-v2-full.log`. Gli avvisi jsdom su `window.scrollTo` non sono errori del browser; le due QA nel browser con fixture non hanno errori console.

### Esecuzioni diagnostiche e correzioni dei soli test

| Esecuzione completa | Esito | Evidenza e correzione |
| --- | --- | --- |
| Prima | 2162/2163, 201 file | Primo caso Onboarding ancora nel fallback differito, prima del PDF interamente mockato. Preload del solo modulo nel test (`ee9ca59`), file74/74 verde. |
| Seconda | 2161/2163, 201 file | Spese leggeva il link Riparazione già presente in Casa; routing navigava prima che finisse il redirect del login. Attese della pagina effettiva in due test (`0e0bba7`), file15/15 verdi. |
| Terza | 2162/2163, 201 file | Il messaggio locale di registrazione unità precedeva il GET di refresh del registro. Attesa asincrona delle stesse asserzioni su select e ID server `new-unit` (`0080b6c`), file13/13 verde. |
| Finale | **2163/2163, 201 file** | Intero aggregato sulla fonte congelata comprensiva di tutte le correzioni; nessuna somma di risultati parziali. |

Gli stack finali sono stati letti prima di intervenire. Nessuna asserzione, valore atteso, timeout o retry allentato, nessun test saltato e nessun nuovo mock. Lint e TypeScript app verdi dopo gli ultimi cambiamenti. Il prodotto resta e6b2509: le correzioni successive riguardano esclusivamente la sincronizzazione dei test, quindi non sono stati ripetuti backend/DB/browser/build già verdi senza un nuovo difetto.

### Collaudo visivo in due fasi

Rn8oFD, fonte06eb: normale accesso dell'agente fixture, successione e visura con due job distinti, citazioni, conservazione della bozza di Sara durante il binding di un altro dato, conferma separata, disponibilità del dato confermato nella preparazione senza ricarica manuale, aggiornamento differito esplicito e ripresa dopo pulizia della bozza, sub13 ancora proposto e confronto con12 confermato. Confronto visibile nel registro automaticamente; osservazione manuale di distribuzione interna senza citazioni inventate, poi due questioni aperte nella preparazione. Reload conserva i dati senza altre fasi provider. Desktop/375px, larghezza375 con scrollWidth360, console senza errori. Due job e quattro sole fasi fixture, costo zero. Runner1/1 e arresto PostgreSQL/pid/listener verificati.

La prova ha evidenziato che l'anteprima era montata correttamente ma fuori dalla vista. Correzione395: focus e scorrimento all'apertura, chiusura con ritorno all'origine ancora presente senza sottrarre focus a interazioni esterne. Corretto anche il testo del confronto che richiedeva una ricarica non più necessaria. Correzione e6: “Proprietario indicato nel documento storico” non presume una vendita in una successione.

Nuovo cluster iiAsNV, fonte e6, senza riusare il primo: anteprima della pagina2 realmente visibile (top15,7px), regione focalizzata, citazione e PDF corrispondenti; chiusura torna al pulsante originale visibile. A375×812 la fonte si apre direttamente, scrollWidth360 anche a zoom200%, nessun errore console; nessun visualizzatore esterno o nuova AI. Un solo job e due sole fasi fixture, costo zero. Viewport ripristinato, solo tab creati chiusi; runner1/1, stop PostgreSQL e assenza di pid/listener verificati. Screenshot sintetici negli outputs, nessun originale personale in Git.

## Limiti preservati

Provider reale non attivato e nessuna chiamata AI o spesa. Fixture limitate al test e vincolate ai byte/SHA; nessun fallback simulato nel runtime. Prima versione solo PDF con testo nativo; OCR, accuratezza di un modello reale e catalogo esteso non sono verificati da questo candidato. Modello incarico approvato ancora assente. UI mappa della casa reale e relativi dati lasciati invariati; screenshot/report sintetici restano negli outputs. Nessun deploy, main o modifica della demo Alessio; pubblicazione del candidato e decisione sul comune sono passi distinti.

## Consegna e percorso di prova

Il committente ha autorizzato l'integrazione della [PR79](https://github.com/Vincenzobrutto/Home_OS/pull/79) nel ramo comune, la cui punta precedente è3335ea9. Candidato verificato923a036, prodotto e6b2509 e suite finale sulla fonte0080b6c. La PR conserva i genitori completi delle PR77/78 e Gift72–75. L'integrazione del codice è distinta dall'aggiornamento dell'app locale; nessun deploy o intervento sui servizi esistenti.

Nell'app del candidato: **Area Agenzie → pratica → Dati, fonti e verifiche → Apri dati e verifiche**. Da qui: analisi di atto/visura con pagine e consenso → proposte citate → associazione esplicita → conferma in Dati e fonti → confronto → Punti da verificare → Prepara dati incarico. L'anteprima della fonte si apre sulla pagina citata; la generazione resta disabilitata senza modello approvato.

I due collaudi sintetici sono conclusi e arrestati: i relativi URL temporanei non sono ingressi attivi. Per una nuova prova serve un nuovo nominale isolato previsto dal runner, senza riavviare quelli scaduti o aggiornare l'app reale. Guida e screenshot sintetici nella cartella chat `outputs/Dimora-Agenzie-candidato-20261103`, inclusi `fonte-finale-desktop.png`, `fonte-finale-mobile.png` e il dettaglio desktop. La chiusura non avvia un nuovo collaudo o altro sviluppo.

## Integrazione autorizzata nel comune

Il 3 novembre Vincenzo ha richiesto «Integriamo la pr79». Fetch e riesame indipendente: comune3335ea9 antenato del candidato923a036, divergenza0/32, maincdbb318 invariato, worktree e indice puliti. PR79 senza conflitti; PR77/78 e Gift72–75 presenti integralmente. Backend e frontend coincidono esattamente con la fonte dell'aggregato2163/2163; sorgenti prodotto e schema coincidono con il codice e6 collaudato nel browser. Dopo la suite sono cambiati soltanto documentazione e setup dei test già registrati.

Questo aggiornamento registra l'integrazione autorizzata senza cambiare prodotto o schema. Il merge GitHub conserva i genitori e l'identità del contenuto già verificato viene controllata dopo l'operazione; hash remoto e stato della PR sono riportati nella ricevuta degli outputs. Non si ripetono suite verdi per un'integrazione a contenuto invariato. Nessun aggiornamento di main, runtime locale, DB esistente, provider o demo Alessio, nessuna nuova spesa. Le limitazioni AI/OCR/modello incarico restano quelle sopra descritte.
