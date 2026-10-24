# Chiusura del collaudo offline — piano ed esiti

Incarico del 24 ottobre: completare in autonomia la parte offline del piano e consegnare esito e azioni del committente. Branch proprio `codex/diagnosi-protocollo-20261024`, base consolidata `112ad05`, PR #21 senza merge. La registrazione di estensione precede qualunque nuova modifica dei test.

## Piano operativo

1. Ricontrollare fonti diagnostiche disponibili senza leggere il corpo degli errori. Preparare un dossier tecnico senza originali o messaggi liberi; nessun invio al supporto.
2. Correggere soltanto difetti riprodotti, preservando gold/validazioni e isolando eventuali modifiche runtime in un lotto proprio. La mancanza del corpo del 400 è un limite, non una prova di colpa del PDF o dello schema.
3. Verificare offline caffè, Samsung e acconto/saldo: identità/varianti, importi e spedizione, ruoli delle date, oggetti/stanza suggerita e ricaricamenti. Non trasformare fixture o risposte già salvate in nuove estrazioni reali.
4. Eseguire build/lint/test pertinenti, aggregato HTTP/DB con runner e cluster temporaneo nuovo, poi frontend typecheck/lint/build e intera suite mock. Un solo cluster DB per volta.
5. Ripercorrere la UI soltanto con mock dichiarati e servizi locali isolati, senza API/DB/storage reali o AI. Preservare il collaudo Roma e i servizi esistenti.
6. Chiudere report/stato, commit, push verificato e PR. Consegnare evidenze e lista di azioni utente. Main e Claude esclusi, niente reset/clean/force o rimozioni di worktree.

## Passaggi esterni alla chiusura offline

- Merge delle PR: decisione del committente, non autorizzato dal lavoro autonomo.
- Nuova AI: serve un consenso specifico successivo; le due prenotazioni Samsung incerte restano conservate. Nessun preflight o tentativo aggiuntivo.
- Conferme di oggetti/spese nella casa Roma: non autorizzate. La bozza caffè resta da rivedere, compreso il codice completo mancante.
- Supporto provider: preparare soltanto il dossier, non contattare nessuno senza incarico pertinente.

## Esiti

Regressioni automatiche completate, dopo la registrazione del piano. Nessuna modifica runtime introdotta: non è stato riprodotto un difetto che giustifichi una correzione del prodotto. La chiusura offline non chiude il rifiuto Samsung né il collaudo delle proposte reali ancora assenti.

| Controllo | Esito di questa tranche |
| --- | --- |
| Backend ordinari, runner senza DB | 233/233 |
| Qualità v3 offline, risposte simulate | 24/24 |
| Guardie autorizzazioni future | 18/18 |
| Guardie rete/Prisma/runner offline | 10/10 |
| Aggregato HTTP/DB temporaneo | 498/498: 54 HTTP + 442 diretti + 2 dopo riavvio |
| Frontend typecheck/lint/build | superati |
| Frontend mock completa | 870/870, 105 file, 494,22 secondi; due worker e zero retry |
| Percorso visivo browser | non verificato: accesso al nuovo origin mock rifiutato |
| Samsung AI remoto | non riprovato; precedente HTTP400 resta aperto |

Il profilo onboarding 316/316, build e lint backend della prima tranche sono riportati separatamente nel [report diagnosi](samsung-protocollo-diagnosi-20261024.md); da allora solo documentazione modificata. I profili si sovrappongono e i conteggi non rappresentano un totale di casi distinti. Le campagne nei test utilizzano risposte simulate: non sono una nuova misura di qualità AI sui 52 sintetici o sui PDF reali.

La mock frontend è stata eseguita con ambiente ripulito e guardie offline Node/Prisma ereditate dai worker; nessun V5_API_URL o chiave provider, nessun progetto integration selezionato. I warning PDF.js/scrollTo di jsdom presenti nel log non hanno prodotto fallimenti; nessun assert, timeout o retry aggiunto per nasconderli. Nessuna prova frontend con backend reale è stata eseguita.

Cluster unico nuovo `tm/dimora-offline-TGdfl9`, porte test55439/API3119; dopo i test, arresto e riavvio del solo cluster posseduto per verificare la persistenza, poi stop finale confermato dal runner. Originali e file del cluster conservati, nessuna rimozione o servizio reale fermato. Nessun'altra suite DB simultanea; mock frontend iniziata soltanto dopo lo stop del cluster. Nessuna asserzione o timeout del runner/test cambiati. Log locali `autonomy-offline-db.log`, `closure-unit.log`, `closure-quality.log`, `closure-live-guards.log`, `closure-offline-guards.log`, `autonomy-frontend-typecheck.log`, `autonomy-frontend-lint.log`, `autonomy-frontend-build.log` e `autonomy-frontend-mock.log`.

### Diagnosi sicura e blocco Samsung

Verificata la [documentazione ufficiale sugli errori](https://platform.claude.com/docs/en/api/errors): il request-id è nell'header, mentre i dettagli tipo/messaggio sono nel corpo JSON. Lo stato HTTP400 può dipendere anche da un limite di spesa organizzazione/workspace, non soltanto da formato/schema/documento. Questa è una possibilità da controllare, non una diagnosi del caso concreto. Nessuna soglia, budget o account provider è stato modificato.

Il trasporto attuale registra già status, endpoint e request-id validato, senza leggere il corpo. Non è stato aggiunto un parser che attenui il vincolo di privacy o renda verdi test oggi incompatibili con la lettura dei corpi. Senza altri metadati disponibili non è possibile ricavare offline il motivo preciso dei due 400 passati.

Preparato un dossier locale di tre file: schema pubblico di prodotto identico alla preparazione v30, soli metadati tecnici e bozza di richiesta assistenza in inglese con request-id già registrato. Nessun PDF, base64, prompt sistema, dato estratto, account/casa, chiave o corpo di errore incluso. Dossier **non inviato**; né nuovi preflight né AI. Prima di un eventuale nuovo tentativo controllare in sola lettura Console/provider e ottenere un motivo specifico, tramite log disponibili o assistenza.

### Controllo documentale e riproduzione caffè

Rilette le immagini locali già renderizzate dei quattro PDF anonimizzati, senza caricamenti, OCR remoto o estrazioni AI nuove. I risultati seguenti sono attese di verifica documentale; non proposte Samsung o fatture prodotte dall'AI, che non esistono nella campagna interrotta.

- Caffè: prezzo lordo 499 EUR distinto dal netto IVA; ordine 14/06/2026 distinto dalla stampa e dalla consegna riportata come 16 giugno. Nome gamma e codice prodotto sono distinti. La riproduzione pura dell'output pagato già salvato, con guardie offline e nessun DB, conserva totale/data proposta dall'ordine, warning modello e obbligo di revisione; non inferisce consegna/garanzia e rifiuta l'automazione finanziaria. L'input salvato resta identico. Il codice completo visibile nel documento rimane mancante nell'estrazione, non è stato inserito automaticamente.
- Samsung: due pagine di un ordine, prezzo di riga, spedizione e totale distinti; modello oscurato non recuperabile con certezza. La seconda voce generica senza prezzo autonomo va chiarita, senza inventare un secondo oggetto o presumere che sia certamente assente. La regola sul totale come costo dell'unico prodotto vale dopo conferma di quel presupposto; gli esempi non autorizzano ripartizioni o somme. Il metodo di pagamento non prova un addebito. Nessuna proposta Samsung reale verificata.
- Acconto/saldo: due documenti numerati e datati distintamente, riferiti dal committente agli stessi apparati. Le righe e i totali visibili non dimostrano da soli come ricostruire il costo complessivo dell'acquisto. Le associazioni agli stessi oggetti richiedono revisione esplicita; quantità/codici oscurati, stanze e importi ambigui restano da confermare. Non sommare due totali uguali né scambiare prezzi imponibili di riga per quote lorde.

I test backend hanno ripetuto entrambi gli ordini acconto/saldo, ricaricamenti, copie della fonte, concorrenti e altro utente: nessuna duplicazione e ripristino atomico in caso di dato non confermato. Il replay della bozza caffè è una verifica dell'esito preesistente, non una nuova misura della capacità di estrazione. Le prove generalizzate di prezzi/date e suggerimenti apparati/stanze restano indipendenti dai nomi degli esempi; nessuna nuova regola speciale introdotta.

### UI e disponibilità

Typecheck e lint frontend superati. Build frontend di prodotto superata con sola configurazione locale per ambiente vuoto, cache propria e supporto al percorso PDF.js delle dipendenze con junction; nessun comportamento di prodotto, assert o timeout modificato.

Predisposto un harness mock distinto, soltanto in memoria, con AI e rete verso servizi reali vietate, banner esplicito e conferme bloccate. Il controllo di accesso del browser ha **rifiutato l'apertura di 127.0.0.1:5186**; nessun tentativo su altro browser, porta o canale per aggirarlo. I due processi mock creati sono stati arrestati dopo verifica dell'identità. **Percorso visivo nel browser non verificato in questa sessione.** I test UI automatici rimangono una prova separata e non saranno presentati come screenshot o prova browser.

Controllo di soli processi/porte: frontend Roma5174 e API3011 ancora presenti con i PID registrati, API3001 e PostgreSQL55432 preesistenti preservati. Nessuna richiesta applicativa o connessione al DB reale, nessun riavvio o nuovo deploy; ciò non equivale a una nuova verifica del contenuto della bozza o della sessione utente.

### Cosa rimane al committente

1. Verificare in sola lettura Console Anthropic, limiti di spesa e log della richiesta; se il motivo non è disponibile, inoltrare il dossier oppure dare incarico per l'invio al supporto. Nessun aumento di budget o nuovo tentativo incluso in questa azione.
2. Rivedere la bozza caffè già esistente: 499 EUR, ordine e acquisto proposto al 14/06/2026, marca, nome gamma e codice completo EXAM440.35.B ancora mancante nella nuova estrazione; controllare variante, quantità, stanza effettiva e scheda nuova/esistente. Non premere conferme durante il collaudo di sole proposte.
3. Decidere il merge della PR #21 dopo revisione. Contiene prove e report, non una correzione che sblocca Samsung. Non è stata integrata automaticamente.
4. Soltanto dopo una diagnosi verificabile decidere una nuova prova AI, con documento, budget e numero di chiamate specifici. I consensi precedenti sono conclusi e le prenotazioni incerte non sono disponibili per un nuovo invio.
5. Per chiudere il collaudo completo serviranno ancora il riscontro sulle proposte reali Samsung e acconto/saldo e, con incarico distinto, eventuali conferme canoniche controllate. Nessuno di questi risultati è sostituito dai test sintetici.

HEIC, prova fotografica BL-04 sul telefono, gate generale Fase0, ciclo backup, DB permanente di test e lotto Cestino Claude restano attività separate; questo collaudo non le dichiara concluse.

## Consegna

Report, stato/roadmap/changelog e risultati su branch proprio, nella PR #21 già aperta verso il consolidamento. Nessun merge. Il codice prodotto coincide ancora con la base `112ad05`; test nuovi della prima tranche e documentazione successiva sono separati dal runtime. Worktree di questo lotto ripulito soltanto mediante commit dei propri file, senza reset/clean o rimozioni. Esito e verifiche del push remoto nella consegna locale del task.

Consegna utente locale: rapporto completo, riepilogo numerico, `Al-rientro-Dimora-20261024.txt`, replay caffè e dossier tecnico di tre file anche in ZIP. Il dossier è una bozza non inviata, non un'autorizzazione a nuovi trasferimenti. Nessun dato indispensabile di progetto resta soltanto nella chat: limiti, prossime azioni e risultati sono registrati qui.
