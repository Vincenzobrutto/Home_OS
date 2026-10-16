# Fase 0 — raccolta Claude, arbitrato e chiusura

16 ottobre 2026. Stato attuale dopo personal-export-v1 f54a769. Raccolte entrambe le consegne Claude: 9a65fec e8fc1947, integrate come a7340b1 e07dab2e. Entrambi i diff contengono soltanto la cartella frontend-v5/docs/fase0-file-export-20261016; worktree pulito. Nessun sync, sorgente o configurazione di Claude integrati.

## Attendibilità e differenza di baseline

Report adeguato per revisione del codice e proposte: dichiara correttamente vecchia base1e13e43, lettura master9aafd79, assenza di nuove prove sul prodotto e limiti degli esperimenti sullo scorer. I20schermi e screenshot riguardano un mockup, non certificano il frontend reale. Non dichiariamo di aver ripetuto tutte le verifiche visive di Claude.

L'affermazione «export non attivo» era corretta alla sua baseline e non descrive f54a769: oggi backend e pannello Documenti sono operativi. Busy, protezioni di contesto e risposta tardiva erano già gestiti; non sono nuovi difetti confermati per intero. Gli originali di Claude restano storici, questo arbitrato guida il lavoro corrente.

## Arbitrato UX (FE-UX-01…08)

| ID | Verdetto e natura | Decisione attuale |
|---|---|---|
| 01 | Convalidato, scelta UX P1 | Testo «Caricamento e controllo del file…» applicato; nessun badge sicuro/innocuo né riclassificazione dei vecchi originali |
| 02 | Difetto P1 confermato sul frontend corrente | Corretto: solo503 file_check_unavailable/storage_capacity_low indicano «Documento non salvato», campi editabili e retry stessa chiave/file. Gli altri guasti service restano esito sconosciuto; testo senza «nessun file modificato» contraddittorio |
| 03 | Convalidato, testo P2 | Aggiunti rimedi per copia completa, formato/HEIC e dimensione. Per HEIC si converte/esporta il file esistente: cambiare Fotocamera riguarda solo le foto future |
| 04 | Convalidato con riduzione, aspettativa P1 | Avviso compatto nel modulo prima del file: nessuna eliminazione, conserva originali, nuovi file Defender/politica Windows Microsoft. Testo fattuale, nessuna modifica sicurezza o nuovo consenso automatico. Non duplicato in ogni riga/lista/dettaglio; la politica di conservazione resta un punto separato |
| 05 | Convalidato con precisione, testo P2 | Aiuto esplicita che le foto si archiviano e l'analisi legge il testo nei PDF. Un PDF scansionato con strato testuale può essere leggibile: evitata l'affermazione assoluta «nessuna scansione leggibile». Messaggi pdf_* conservati |
| 06 | Scelta prodotto P2, proposta adattata | Per il pilota manteniamo il pannello già implementato in Documenti, accanto al contesto ZIP: un solo punto operativo, nessun nuovo menu o doppio archivio. Aggiunti limiti backup/reimport/trasferimento/accesso. Lo spostamento in Casa › Dettagli non è un requisito bloccante né un difetto del contratto |
| 07 | Convalidato parzialmente, già in parte risolto | Busy già specifico; aggiunto unavailable specifico. Nessun errore diventa download. Per JSON senza scritture persistenti il guasto di rete non implica dati modificati: non copiamo il messaggio upload incerto. Conferma indica download avviato, non prova che l'utente abbia conservato il file |
| 08 | Convalidato, testo P2 | ZIP chiarisce originali selezionati e manifesto, rimando al pannello personale realmente attivo qui sotto; non a una posizione Casa inesistente |

Prove nuove: frontend32 test mirati verdi (Documenti25, personal export4, client export3), build/lint verdi. Harness jsdom, nessun guasto indotto di Defender. Testano entrambi i503 certi senza successo, retry stessa chiave/file e singolo documento, rete interrotta ancora incerta; messaggi export busy/unavailable senza Blob errore. Un'opzione non supportata nel selettore del nuovo test è stata rimossa prima della build riuscita; nessuna modifica runtime per quella correzione.

## Corpus: verifica indipendente di Codex

Riprodotto usando il vero EconomicFixtureProvider locale, PdfTextExtractor e gli originali sintetici generati, non copiando un risultato scritto a mano. Nessuna richiesta remota/DB/provider a pagamento.

| Caso | Fatti corretti | Penalizzati come errati | Precisione del misuratore attuale |
|---|---|---|---|
| P01 | 4 | 7 | 4/11 =0,363636… |
| P07 | 3 | 5 | 3/8 =0,375 |

Conferma il difetto del gold/scorer: campi validi ma non annotati sono penalizzati. Questi numeri NON misurano l'accuratezza Anthropic. Non dichiarare la qualità AI verificata con l'attuale strumento.

### Errata E1…E8: decisioni per la correzione offline

| ID | Verdetto | Regola decisa |
|---|---|---|
| E1 | Accettato | Gold dei fixture P01/P07 completo sui campi supportati; titolo ammesso se dimostrato. Verificare output deterministico reale senza rete, documentKind e amountSelectionRequired |
| E2 | Accettato con condizione | Separare richiesti/ammessi/assenti: un campo ammesso non è automaticamente vero né ignorabile. Deve avere tipo, ruolo, valore e fonti compatibili col contratto; un opzionale inventato resta errore |
| E3 | Accettato | P10:50000cent acconto richiesti come totale corrente; preventivo200000cent solo ammesso come other, mai come corrente. Non aggiungere previsioni/costi preventivati al prodotto |
| E4 | Accettato | P14 testo canonico «Potenza nominale riportata» e quantityCode reported_nominal; conservare due grandezze distinte. Aggiornare hash/versione corpus, non reinterpretare vecchie osservazioni con hash differente |
| E5 | Accettato con correzioni | Candidati multipli dello stesso campo ammessi. Identità non solo chiave e non ID arbitrario del provider: ruolo/valore/quantità e ancoraggio della fonte quando necessario (due righe con uguale importo non sono per forza lo stesso fatto). Un duplicato identico non aumenta i punti. P16 due model distinti e conflitto non risolto |
| E6 | Accettato con correzioni | Tenere distinti sicurezza del sistema e correttezza/copertura del modello. evidence_unverified può essere un rifiuto sicuro su un negativo ma non diventa una previsione corretta; su un positivo è comunque un'analisi non disponibile. Niente generica equivalenza che promuova errori positivi o astensione totale |
| E7 | Accettato | Pipeline economic/technical/parser esplicita. P20 economico usa no_supported_economic_data; per tecnica altro caso futuro, non un codice no_relevant_data inesistente |
| E8 | Accettato | Assenze fuori contratto segnate come non misurabili/future, senza punti o false garanzie (garanzie AI, professionisti, paidOn, singleObjectId) |

Citazioni: eliminare l'uguaglianza obbligatoria con l'estratto gold, ma non liberalizzare la prova. Usare semantica dei validatori correnti: pagina, NFC/spazi, contenimento della citazione nella pagina e valore dimostrato. Il contenimento di M3 ed economy.citation è sensibile alle maiuscole; solo alcune verifiche di valore economico usano case folding. Importi interi/date canoniche e decimal() per la potenza. Nessun normalizzatore globale che accetti prove respinte dal prodotto.

Correzioni E1…E8 NON ancora implementate. Va versionato il formato del report/osservazioni, con regressioni su fixture reali e scorer puro prima di nuove chiamate live. Preservare P01…P24 per questo incremento. Gap multipagina/prompt injection/formati inglesi/interi/più caldaie registrati come estensione successiva, non accorpati a una riscrittura generica del prodotto.

Soglie: zero scambi di ruoli/importi critici, zero valori inventati nei negativi, potenze distinte e conflitto non risolto. Necessario ma non sufficiente: riportare anche copertura/omissioni; l'astensione sistematica non prova utilità. Campagna e soglia di copertura da congelare separatamente, con nuovo budget/consenso al trasferimento prima di chiamate remote. Il vecchio budget M4 non viene riusato automaticamente.

## Backup: punto chiuso per il pilota locale

Il committente ha confermato oggi la chiave conservata separatamente dal PC, senza comunicarne il contenuto. Verifica da connettore Drive: file1nOVWy5fMy1RCP7XnWFvGJrr9XbHo_8vi nella cartella privata scelta,542877byte, solo owner/shared=false. Copia cifrata effettivamente riscaricata tramite riferimento autenticato, SHA25643a536bd1c3f1cc27490be8009e5155be330d4abc715b9f9eaa1eefd41555b79 identico a quello della copia locale già verificata.

Risultato work/backup-roundtrip-20261016/verification.json nel workspace, nessun URL bearer o chiave salvati nel rapporto. La decifratura locale e restore isolato dello snapshot085607Z (43tabelle267originali) erano già verificati; non è stato eseguito un ulteriore restore DB dalla copia riscaricata. L'uguaglianza crittografica certifica la stessa sequenza cifrata; non abbiamo ripetuto inutilmente una migrazione/restore sul DB attivo. Nessun permesso Drive cambiato, nessuna chiave caricata.

## Che cosa resta per chiudere Fase0

| Blocco | Stato | Prossima azione e titolare |
|---|---|---|
| Recupero e verifica email | Chiuso locale | Nessun nuovo invio necessario |
| Backup e recuperabilità della copia | Chiuso per il pilota locale | Ripetere backup quando serve un nuovo punto di ripristino; non confondere snapshot con DB sempre aggiornato |
| Privacy/integrità/limiti upload e controllo file | Chiuso implementazione locale, limite Windows esplicito | Collaudo visivo comune al punto successivo; nessuna attestazione generale di sicurezza |
| Export personale e messaggi UX | Implementati e collaudati API/DB/harness | Rimane verifica visiva reale desktop/mobile su profilo/account QA separato, senza cambiare l'account personale |
| Corpus e misuratore | Bloccante aperto per misurare AI | Claude può implementare E1…E8/scorer v2 offline con proprietà file separate; Codex rivede e misura sui fixture reali |
| Qualità AI reale | Aperto | Dopo scorer congelato: campagna sintetica con tracciamento, budget nuovo e consenso esplicito. Nessuna chiamata in questa raccolta |
| Conservazione e cancellazione | Aperto | Codex prepara regola operativa chiara per il pilota e procedura coerente. L'avviso «non eliminabile» descrive lo stato, non sostituisce tale regola. Nessun termine legale inventato, cancellazione silenziosa o promessa di eliminazione oggi inesistente |

Quindi restano TRE blocchi: (1) misurazione/qualità AI, (2) collaudo visivo reale e (3) conservazione/cancellazione. Per un servizio pubblico serviranno ulteriori verifiche operative; non si trasformano qui in nuove funzionalità di Home. La guida, BL04 e Agenzie restano rinviati. Non diciamo «Fase0 completata» oggi.

Nessun backend/schema/.env o dato reale modificato in questa raccolta. UI corretta con test, originali Claude preservati e arbitrati. Fonte del metodo: rapporto e codice locale; nessuna consulenza legale o dichiarazione di conformità. Root documenti già misti aggiornati senza includere dirty estraneo nei commit.

## Chiarimento successivo: conservare la casa reale

Il committente chiarisce che la prova serve a costruire progressivamente la propria casa, senza cancellarla al termine. Regole consolidate in prova-personale-conservazione-20261016.md: nessuna scadenza automatica, archiviazione distinta da eliminazione, rimozione solo esplicita con impatto spiegato, copie di backup trattate separatamente. Regole definite; eliminazione tecnica e ciclo delle copie restano aperti, nessuna cancellazione eseguita. L'avviso attuale rimane veritiero.

Per il primo lotto come archivio distinguere la QA visiva reale ancora necessaria dalla futura analisi AI: qualità AI/campagna richiedono ancora corpus corretto e nuovo budget/consenso, ma non sono una dipendenza tecnica del solo salvataggio degli originali. Nessuna dichiarazione di Fase0 completa o di eliminazione già disponibile. Claude avviato dal committente su corpus/scorer v2 offline, non ancora raccolto.
