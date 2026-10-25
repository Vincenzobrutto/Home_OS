# Collaudo di ingressi e completamento dei documenti

## Incarico, base e separazione

Lavoro autonomo nella finestra del 25 ottobre 2026 fino alle 14:00 Europe/Rome; [piano registrato](collaudo-completamento-piano-20261025.md). Branch `codex/collaudo-completamento-20261025`, worktree dedicato dal consolidamento `730b93d`. Registrazione `60a46ba`, precisazione delle sole fixture API `c03a884`, entrambe prima del codice. Prima correzione/test `846944c`; guardie finali del contratto e relativi casi `f42f9c8`.

La PR #35 non è inclusa: riguarda il collegamento dell’archivio senza lotto, mentre questo lotto corregge la classificazione della bolletta nella pagina diretta. Nessun file di quella PR, del cestino Claude, di parser/OCR, ItemEditor/model, backend o fakeBackend condiviso modificato.

## Difetto dimostrato

Il tipo della bozza (`documentKind: utility_bill`) non è la classificazione canonica del documento (`DocumentOrganization`). Il workspace dell’archivio fornisce `beforeConfirm` per registrare titolo e tipo prima della spesa; la pagina diretta `/documenti/:id/oggetti` non aveva quella preparazione.

Le due riproduzioni, con gli stessi dati sintetici nelle viste a schede e unica, falliscono prima della correzione: le operazioni osservate sono `kind → review → confirm`, mentre manca `organize`. Gli altri 88 casi del gruppo passano. Non è una diagnosi ricavata da letture del DB reale.

## Correzione

Per le sole bozze bolletta nella pagina diretta viene predisposta una preparazione chiamata dalla conferma finale. La preparazione riusa `IntakeClient`, il decoder e `organizeDocuments` già usati dall’archivio, senza cambiare il payload della spesa. La callback dell’archivio continua ad avere precedenza: non si organizzano due volte i documenti del workspace.

Prima di classificare controlla account/pagina attivi, documento, versione e SHA correnti; ricontrolla la fonte dopo la preparazione del lotto e dopo la classificazione. Un tipo Bolletta già confermato viene mantenuto, compreso il suo titolo. Un altro tipo canonico, una fonte indisponibile, una proposta locale, decisioni già salvate o rinviate, scelte cambiate o permessi insufficienti bloccano la spesa: nessuna sostituzione implicita. Titoli fuori dai limiti non vengono tagliati.

Il controllo del [contratto intake](document-intake-api-contract.md) ha richiesto due guardie conservative ulteriori: la derivazione implicita del tipo non deve sostituire proposte locali o rinvii. Le due nuove riproduzioni falliscono sulla prima versione (promessa risolta invece del rifiuto atteso), quindi sono state aggiunte le guardie prima della consegna. Una ricevuta di classificazione con risultato rifiutato o mancante non abilita la spesa.

Una risposta fallita conserva corpo e chiave di classificazione nello stesso contesto; nessun retry automatico. Un altro clic esplicito può recuperare la stessa operazione. Al ricaricamento si rilegge prima la classificazione canonica; l’idempotenza durevole della conferma di oggetti/spese resta quella preesistente, invariata. La preparazione non viene chiamata entrando nella pagina, passando fra schede o salvando soltanto la bozza.

Le API esistenti di organizzazione e conferma restano transazioni separate, come nel workspace: non si dichiara introdotta una transazione unica fra classificazione e spesa. Un errore di classificazione impedisce l’avvio della conferma della spesa; il tipo può restare registrato se un successivo salvataggio della spesa fallisce, e viene riletto al nuovo tentativo.

## Matrice verificata nel mock

| Caso | Esito verificato |
| --- | --- |
| Bolletta dalla pagina diretta, schede e pagina unica | Tipo Bolletta organizzato prima di revisione/conferma; stessi sette campi della spesa, zero nuovi oggetti e una sola spesa simulata. |
| Salva bozza dall’archivio | Fonte ancora da completare, bozza aperta, nessuna organizzazione o spesa confermata; uscita verso l’elenco. |
| Due importi discordanti | Importo vuoto, nessuna somma o ripartizione; clic su Avanti mostra gli errori e resta nella scheda Spese. Nessuna classificazione o spesa. |
| Conflitto della classificazione | Nessuna revisione/conferma della spesa; importo e fornitore restano. Un conflitto noto non viene presentato come transitorio o automaticamente risolto. |
| Risposta di classificazione persa prima della registrazione | Nessun retry automatico; il secondo clic esplicito riusa identici corpo e chiave, con un solo lotto preparato e una sola conferma della spesa. |
| Fonte revocata alla conferma | Nessuna classificazione/spesa; riepilogo e nome del documento non restano visibili. |
| Fonte privata, documento/versione/SHA diversi, fonte cambiata dopo la preparazione | Preparazione o classificazione fermate prima delle operazioni successive. |
| Account/pagina cambiati, batch non scrivibile, proposta locale, rinvio o fonte indisponibile | Nessuna prosecuzione verso la classificazione. |
| Esito di organizzazione rifiutato o mancante con risposta HTTP riuscita | Nessuna prosecuzione verso la spesa. |
| Risposta incerta e titolo modificato | Nessun retry da solo e nessuna riutilizzazione della chiave con un corpo diverso. |

Tutti i dati sono sintetici e i server sono simulati in memoria. Le mutazioni del fake rappresentano gli esiti del contratto backend: non sono prove di scritture nel database reale né una campagna sui documenti personali.

## Test e limiti della prova

- Primo gruppo dopo la correzione: 107/107; prima suite completa: 1025/1025 in 118 file (817,39 secondi) sul commit `846944c`. I casi specifici finali sono 28 (21 del protocollo e 7 UI), inclusi i controlli aggiunti dal contratto.
- **28/28** casi specifici finali, typecheck/lint/build della versione `f42f9c8` verdi. Suite mock completa definitiva: **1030/1030 in 118 file**, zero fallimenti e zero test saltati, un solo worker e nessun retry. Il consolidamento resta `730b93d` al fetch finale.
- Le fixture di `OnboardingPage.test.tsx` ora espongono le API di classificazione e una SHA dichiarata coerente con la bozza. Le asserzioni dei payload preesistenti sono identiche; una è attesa con `waitFor` perché la conferma include ora le letture asincrone della fonte.
- Nel nuovo test sugli importi ambigui è stata corretta l’aspettativa iniziale sul pulsante: Avanti resta cliccabile per annunciare gli errori, ma non deve avanzare. Il test finale verifica il clic, la permanenza in Spese e l’assenza di scritture. Nessun timeout o criterio di prodotto cambiato.
- Browser e telefono fisico non provati; nessun aggiramento del blocco browser. Nessun nuovo invio AI, conteggio token, accesso a DB/API/storage reale, `.env`, migrazione, riavvio o salvataggio automatico. App corrente preservata.

## Prossimi passi

1. Revisione e decisione del committente sulle PR #35 e di questo lotto. La loro combinazione non è dichiarata collaudata: i file prodotto sono distinti, ma la verifica sul consolidamento integrato resta da eseguire al momento dell’integrazione.
2. Dopo approvazione, prova manuale nell’app: nuova bolletta senza AI, verifica dei dati, salvataggio bozza e ripresa; conferma finale, tipo Bolletta e stato Completato. Eventuali prove reali restano azioni esplicite del committente.
3. Valutare in un lotto successivo l’unificazione degli ingressi diretti legacy con il workspace. Questo lotto non estende la classificazione automatica ad altre famiglie e non cambia il comportamento dei recuperi di conferme precedentemente incerti. Evitare di aggiungere adattatori per famiglie sulla base dei soli esempi disponibili.

Il merge e l’aggiornamento dell’app non sono eseguiti da questo incarico autonomo.
