# Compilazione a schede predefinita, pagina unica disponibile

24 ottobre 2026. Seguito della demo multi-articolo confermata dal committente e del suo incarico esplicito di cambiare la vista predefinita. Stesso lotto e [PR #23](https://github.com/Vincenzobrutto/Home_OS/pull/23), verso `codex/dimora-v5-consolidata-20261023`. Nessun merge. Registrazione preventiva `9179a83`; codice e test `61f4a37a8dc44f07be0493b28fd133b0644cfb18`, ulteriore test di ingresso aggiornato in `9fa80369561b335d3e83be1b2be61eb3af23062c`.

## Comportamento

La compilazione aperta senza scelta di vista usa le schede Documento → Contenuto → Articoli → Spese → Contatti se proposti → Riepilogo, con i salti già previsti per il tipo e le scelte. Il comando **Torna alla pagina unica** seleziona `vista-compilazione=unica`. **Usa la compilazione a schede** rimuove la scelta esplicita; i vecchi link `vista-compilazione=schede` restano validi. Un valore sconosciuto usa il default. Nessuna preferenza globale o modifica del contratto API.

Il cambio conserva documento, bozza e modalità, e rimuove il riferimento all'analisi sostituito dalla bozza corrente. Nel workspace una scelta relativa a un altro documento viene ignorata; il comando fissa il contesto del documento e della bozza visualizzati. Dai link standalone senza `compila` il ritorno seleziona la pagina unica completa, senza ricadere nella lista compatta degli articoli.

DraftEditor mantiene lo stesso stato e gli stessi callback. I valori locali restano quando si cambia renderer; si riparte dalla scheda Documento. Il cambio di vista e Avanti/Indietro non salvano. Restano disponibili i comandi espliciti di salvataggio bozza e conferma finale. Nessuna modifica a serializzazione, validazioni, snapshot, idempotenza o recuperi, né a ItemEditor, UnifiedReview, model.ts, apparatusSuggestions.ts, backend, schema o API. Rimossa soltanto la dicitura «in prova» dall'introduzione.

## Verifica offline

**Implementato e verificato offline** sul codice 61f4a37 con test aggiornati a 9fa8036: typecheck, lint e build superati; suite mock completa **910/910 test in 108/108 file, nessun test saltato, due worker e retry 0**, durata 460,39 s. Nessun fallimento finale. Log e JSON integrali conservati localmente nel task, senza pubblicare dati personali o output AI.

Comandi tramite wrapper sanificato: TypeScript tsc -b --noEmit, ESLint eslint ., TypeScript tsc -b e Vite build; Vitest run --project mock --maxWorkers=2 --retry=0. Configurazione locale con envDir vuota e guardie di rete; nessuna modifica a .env.

Dieci nuovi casi rispetto ai precedenti 900: default senza parametro, compatibilità del vecchio link e valore sconosciuto; cambio renderer con modalità AI/manuale e link senza `compila`; workspace con titolo locale conservato e contesto di un altro documento ignorato; percorso predefinito di documento tecnico e bolletta. I quattro confronti integrali del payload ora confrontano **schede senza parametro di vista** e **pagina unica esplicita**. I test precedenti della pagina unica la selezionano esplicitamente: asserzioni su privacy, recupero, idempotenza e body conservate; nessun timeout aumentato o retry aggiunto.

I tentativi mirati intermedi hanno evidenziato fixture che presumevano la vecchia vista iniziale: 82/90, 92/96 e 114/115. Allineato l'ingresso di quelle prove e aggiunti i casi del nuovo default. Nel caso bolletta a schede il comando finale è quello già esistente «Salva e continua», mentre la pagina unica conserva «Registra spesa»; mantenute le stesse asserzioni sull'ordine organize/review/confirm e sull'intero contenuto economico.

Il primo aggregato completo ha chiuso 907/910: un ulteriore test di PendingUploads cercava il salvataggio subito all'apertura, mentre due attese iniziali in ManualBillFlow e OnboardingPage erano ancora sul caricamento lazy della sezione. Allineato PendingUploads al percorso Documento → Riepilogo, mantenendo le asserzioni e aggiungendo l'assenza di review/organizzazione/conferma durante la navigazione. I tre file rieseguiti senza build concorrente passano 91/91; nessun timeout modificato. L'aggregato finale viene eseguito senza build concorrente e resta distinto dal primo esito, che non viene considerato verde.

I comandi sono eseguiti con `cleanEnvironment` e le guardie offline del repository, progetto Vitest mock, due worker e retry 0. Nessun test DB o API reale. La parità frontend non certifica nuovamente la transazione backend: il codice e il contratto di conferma restano quelli esistenti.

## Prove visive e limiti

La demo sintetica a tre articoli è stata completata dal committente prima di questa modifica: dati conservati tornando indietro, esclusione accessorio con due oggetti proposti e nessuna nuova spesa, PDF e comandi usabili a finestra stretta. La precedente osservazione Codex riguarda monoriga a 390/320 px e PDF locale con zoom/rotazione. Non viene dichiarata una nuova prova visiva del default né una prova su telefono fisico/tastiera virtuale o lettore di schermo reale. [Dettagli e provenienza delle verifiche](compilazione-schede-pdf-fix-20261024.md).

Nessuna AI, email, lettura o scrittura del database reale, upload, migrazione o modifica di `.env` in questo aggiornamento. Nessun riavvio del reale né alterazione delle protezioni del browser; nessun salvataggio automatico. Main, consolidamento e lotto Claude non modificati. Prossimo passo: valutazione e approvazione del merge da parte del committente; non rimuovere il ritorno alla pagina unica.
