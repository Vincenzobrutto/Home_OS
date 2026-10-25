# Compilazione: resilienza, letture locali, tastiera e peso del frontend

## Piano della finestra fino alle 14:00

Il committente ha chiesto più attività autonome, non un solo controllo. Base `730b93d`, worktree nuovo e branch `codex/compilazione-resilienza-20261025`; registrazione `a9ecedb` prima del codice e precisazione tastiera/focus `4e3cc42`. La PR #37 è combinata soltanto sul branch proprio (`505e813`), senza approvarla o integrarla nel consolidamento.

| Filone | Attività e criterio di chiusura |
| --- | --- |
| Isolamento e navigazione | Risposte di recupero dopo cambio documento/casa/uscita e ritorno A→B→A; nessuna navigazione, errore o stato occupato ereditato dal tentativo precedente. |
| Lettura locale e campi | Cancellazione su cambio documento/casa/account; risultato tardivo ignorato e dati manuali conservati dopo l'annullamento. |
| Errori, callback e tastiera | Callback superate senza effetti sulla scheda corrente; recupero esplicito con stessa chiave; focus e navigazione da tastiera, senza conferme durante l'avanzamento. |
| Misura del frontend | Confronto della build con la PR #37, distinguendo entry iniziale, chunk e asset OCR; nessuna ottimizzazione senza misura. |
| Seguito separato lato server | Verifica dei servizi e dello stato persistito su cluster temporaneo tramite runner offline, dopo la suite frontend; nessun cambiamento backend in questo branch. |

Ordine pianificato: riproduzioni/correzione, controlli statici e regressione completa; poi verifica server nel lotto separato `codex/workflow-server-offline-20261025`; infine report, push verificati e candidati di integrazione. Chiudere i filoni verificati senza modifiche speculative per occupare il tempo residuo. Nessun merge o aggiornamento app autorizzato da questo piano.

## Difetti dimostrati e correzione

Il workspace era distinto per account/casa, ma restava montato cambiando documento. Una preparazione asincrona conservava il solo controllo `live`: una risposta della visita precedente poteva navigare indietro, mostrare un errore ormai estraneo o lasciare occupato il nuovo documento. Il confronto del solo ID non sarebbe bastato per A→B→A.

Le prime otto riproduzioni danno 4 fallimenti e 4 successi sulla versione precedente. La correzione usa un'identità per ogni visita al documento, verificata prima e dopo la richiesta, con stato occupato/errore associato a quell'identità. Il ritorno al medesimo ID genera un'altra visita. Le chiavi di idempotenza per documento restano conservate: un nuovo clic esplicito può recuperare la preparazione già registrata.

Due ulteriori riproduzioni dimostrano callback `complete`/`pause` della vecchia scheda ancora capaci di preparare un altro lotto o uscire dalla scheda corrente: 2 fallimenti e 13 successi prima delle guardie finali. Anche queste callback e l'apertura dell'originale ora verificano la visita corrente; `complete` richiede inoltre l'ID del documento corrente.

La correzione non annulla o disfa un'operazione che il server abbia già ricevuto. Ignora soltanto gli effetti UI di tentativi superati. Preparazione, conferme e ricevute server conservano i protocolli esistenti. Anteprima, coda, filtri e guardia sulle modifiche non salvate non vengono azzerati rimontando tutto il workspace.

Durante la prima ripetizione un nuovo test cercava il pulsante subito dopo `navigate`, prima del rendering del secondo documento: attende ora anche l'intestazione di quel documento, mantenendo invariata l'asserzione sul pulsante abilitato. Typecheck ha inoltre richiesto controlli espliciti sulle letture indicizzate delle nuove fixture. Nessuna asserzione preesistente, validazione, gold o timeout modificato.

## Altri filoni verificati senza modificare il prodotto

- Quattro casi con lettura locale differita: cambio documento, casa o account abortisce il lettore precedente e ne ignora l'eventuale risultato; la proposta corrente conserva i propri campi. Dopo annullamento e inserimento manuale, un risultato tardivo non sovrascrive fornitore/importo. Nessuna chiamata POST o conferma in questi casi.
- Due percorsi interamente da tastiera: focus sull'intestazione del passo, passaggio non ancora visitato disabilitato, pannello nascosto non raggiunto dal tab, ritorno con campi conservati. Mancanze annunciate e avanzamento fermato; salvataggio bozza e conferma finale restano azioni diverse.
- Sono prove DOM nel mock, non collaudi Safari, lettore di schermo o telefono fisico.

## Misura della build

Confronto tra la build della combinazione PR #37 e questa correzione. Byte effettivi su disco; gzip calcolato con Node/zlib a livello 9. Non è una misura di latenza, rete o RAM del browser.

| Artefatto | Prima, byte | Dopo, byte | Delta |
| --- | ---: | ---: | ---: |
| Entry JS iniziale | 486791 | 486791 | 0 |
| Chunk IntakePage, contenente il workspace | 63673 | 63964 | +291 |
| Chunk OnboardingPage | 152451 | 152451 | 0 |
| Chunk PDF | 437656 | 437656 | 0 |

Il chunk IntakePage passa da 20078 a 20211 byte gzip (+133); l'entry da 148380 a 148382, con nomi/hash dei riferimenti ai chunk cambiati. Le mappe dell'entry non contengono i moduli onboarding, workspace, PDF/OCR ricercati. Gli asset OCR sono 17 file per 31899517 byte complessivi, invariati: è l'insieme dei file distribuiti, non un download iniziale osservato. Il motore seleziona le risorse all'uso; non viene dichiarata una prova di caricamento nel browser.

La correzione ha un costo contenuto e misurato. Nessuna rimozione di controlli o dipendenze e nessun refactoring aggiuntivo giustificato da questa sola misura. Dati grezzi locali: `work/resilience-bundle.json` nel task.

## Test e consegna

Codice prodotto `9da6dc7`, fixture tipizzate `bc1fe45`. Nuovi casi mirati **17/17**; typecheck/lint/build verdi sulla versione finale. Suite mock completa **1055/1055 in 123 file**, 852,23 secondi, zero fallimenti e zero test saltati, un worker e retry 0; fixture PDF/OCR **5/5** verdi.

Log/JSON nel task: `work/resilience-navigation-red.json`, `work/resilience-callbacks-red.json`, `work/resilience-focus.json`, `work/resilience-checks-final.log`, `work/resilience-fixtures.json` e `work/resilience-full.json`.

Solo questo branch, frontend e documentazione pertinente. Nessuna AI o email, DB/API/storage reale, `.env`, migrazione, salvataggio reale, riavvio, modifica a main/consolidamento/Claude o aggiramento del blocco browser. Il test server usa un lotto distinto: i suoi risultati non vanno attribuiti alla suite frontend.
