# Bollette — mese della fattura distinto dal periodo dei servizi

## Decisione e perimetro

Il committente chiarisce che per «mese di riferimento» intende il mese esplicito della fattura. Non coincide necessariamente con emissione, scadenza o competenza dei servizi. La regola precedente che non trasformava il mese della fattura in date dei servizi resta corretta; ora si conserva anche il dato distinto richiesto.

Branch `codex/bollette-mese-fattura-20261025`, base remota `f919fca6464c90f0fd01b6fea7b893a070fee3aa`; registrazione `c48e312` prima del codice. Fonte funzionale `72a9ec3`, completata dalla visualizzazione dello storico in `e3e30e8`. Solo worktree proprio. Nessuna AI/email, accesso a DB/API/storage reale, modifica `.env`, aggiornamento app o migrazione reale. Nessun file originale in Git, intervento su main o branch Claude.

## Regola generale

Il lettore locale riconosce intestazioni autonome come «Fattura settembre 2026», «Bolletta di settembre 2026», «Bolletta del mese di settembre 2026», «Mese fattura: settembre 2026». Mese italiano e anno devono essere espliciti, con un unico valore valido. Più intestazioni uguali concordano; valori diversi restano da confermare. Non si usano nome file, cataloghi di fornitori, data di emissione, scadenza, stato degli abbonamenti, «periodo di riferimento» o il generico «mese di fatturazione» per inventare il mese della fattura.

`LocalBill.invoiceMonth` e `HouseForm.invoiceMonth` sono separati da `competenceFrom/To` e `periodFrom/To`. La traccia della lettura iniziale distingue anche questo campo, resta senza valori/citazioni e passa alla versione `local-bill-summary-trace-v2`. Fonte/SHA/versione/account/casa, cancellazione e protezione delle correzioni restano invariati. Prima pagina soltanto; nessuna nuova lettura delle pagine successive nel prodotto.

Il form mostra «Mese di riferimento della fattura» e «Periodo dei servizi». Il primo può essere confermato senza inventare il secondo. Se l'utente inserisce un periodo dei servizi, entrambi gli estremi devono comunque essere validi e ordinati; un mese della fattura valido non sana un intervallo parziale. Riepilogo, spesa collegata e storico distinguono i dati. Un solo totale, nessuna somma/ripartizione o inferenza di pagamento.

## Persistenza, API e compatibilità

Nuovo `HomeExpense.invoiceMonth` nullable, formato `YYYY-MM`, anno diverso da zero, controllato da API e CHECK SQL. Migrazione additiva `20261025220000_expense_invoice_month`: una colonna opzionale e il CHECK; nessun UPDATE, backfill, cancellazione o riscrittura di competenze. Generato il client Prisma solo nel worktree.

Le scritture `economy-v1` e le conferme di spese dell'onboarding accettano il campo opzionale; `null` lo cancella esplicitamente in modifica. Una compilazione incompleta conserva il testo del mese senza promuoverlo a dato confermato. Snapshot, storico e whitelist dell'export personale lo conservano. Le risposte senza mese continuano a omettere il campo, preservando i payload precedenti; le rotte legacy expenses-v1 non ricevono nuovi campi in scrittura.

Per le utenze con mese della fattura esplicito, filtri e riepiloghi usano quel mese, contando l'intera spesa una volta sola. `competenceFrom/To` restano quelli dei servizi e non vengono modificati. Per costi preesistenti senza il nuovo dato si mantiene il precedente fallback; non si ricostruisce un mese fattura dalla data di emissione. Categorie diverse dalle utenze mantengono il criterio preesistente della data della spesa.

Nessun cambiamento del provider AI, del prompt o della sua estrazione: questa proposta del mese nasce dal lettore locale e viene confermata dall'utente. Non si sovrascrivono automaticamente bozze già salvate o spese esistenti. Un rilascio futuro deve coordinare migrazione additiva e aggiornamento backend/frontend, previa autorizzazione sul reale; il solo frontend nuovo contro il vecchio backend non costituisce un rilascio compatibile.

Se un mese fattura era stato inserito manualmente nel vecchio campo dei servizi, non viene riclassificato o copiato automaticamente: l'intenzione dell'utente non può essere ricostruita da quelle date. L'eventuale revisione dei dati storici rimane esplicita, confrontando l'originale. Questo lotto non legge né corregge tali dati reali.

## Verifiche offline

- PDF TIM già fornito: esecuzione del vero lettore PDF/OCR in adattatore Node locale, hash verificato. Il mese della fattura viene proposto dal testo nativo della prima pagina; nessun estremo del periodo dei servizi viene generato da quel mese. Risultati personali fuori Git, nessun invio esterno.
- Nuovi test su intestazioni esplicite, negazioni della deduzione da altre date/periodi, intestazioni discordanti, anno mancante/invalido, separazione dei due periodi, ripresa del form e conferma esplicita. Fixture sintetiche con importi e fornitori fittizi; nessun contenuto personale copiato nei test.
- Backend ordinari **301/301**, onboarding **313/313**, lint/build verdi. API rifiuta mesi malformati e intervalli di servizi parziali.
- Runner DB, cluster nuovi in sequenza: **18/18 economy-db**, **49/49 document-workflow-db**. Migrazione applicata soltanto ai cluster temporanei; persistenza, CAS, replay, privacy, filtri per anno, salvataggio/ripresa della bozza, conferma canonica, classificazione e una sola spesa verificati.
- Gruppo frontend iniziale **84/86**: etichetta del mese dei servizi rinominata e fixture «tutti i campi proposti» priva del nuovo mese. Aggiornate solo l'etichetta attesa e la fixture esplicita, conservando valori/asserzioni. Successiva mirata **89/89**; gruppo esteso **708/709**, con l'ultima vecchia etichetta nel test di ripresa bozza, aggiornata senza cambiare le asserzioni sui dati.
- Primo DB fallito: la nuova migrazione era ancora untracked e il runner copia solo file tracciati. Inclusa nell'indice e ripetuto su cluster nuovi, senza cambiare le prove; log originale conservato. Prima completa frontend interrotta per aggiungere il mese nello storico, non dichiarata verde.

**Suite mock completa sulla fonte definitiva e3e30e8: 1419/1419 in 137 file**, 930,74 secondi, un worker, retry zero, nessun saltato/todo/fallimento. Typecheck, lint frontend/backend e build verdi sulla stessa fonte; build6,40 secondi. Fixture PDF/OCR **5/5 in 2 file**, 1,56 secondi. Ripetuto anche il lettore sul PDF TIM con la fonte definitiva: stesso SHA e proposte precedenti invariate, aggiunto soltanto invoiceMonth; nessun estremo dei servizi inventato. Nessuna asserzione di privacy/idempotenza, gold o timeout ridotti. Le modifiche ai selettori dei test seguono la distinzione esplicitamente richiesta fra mese della fattura e mese dei servizi.

Evidenze esterne al repository nel task: `work/invoice-month-pdf.log`, risultati privati `invoice-month-pdf-private.json`, `invoice-month-target*.log`, `invoice-month-domain.log/json`, `invoice-month-full*.log/json`, `invoice-month-backend-*.log`, `invoice-month-checks*.log`. Cluster fallito `tim25/dimora-offline-QPEeNW`; verificati `tim25/dimora-offline-IDwi6X` e `tim25/dimora-offline-ZwXBft`. Directory locali del workspace Codex; nessun riuso del database prodotto.

## Consegna e limiti

Implementato e verificato offline nel branch proprio, non attivato nell'app reale. [PR #51](https://github.com/Vincenzobrutto/Home_OS/pull/51) verso il consolidamento, merge al committente; commit e push verificato con ls-remote. Base remota f919fca e main cdbb318 verificati dopo i test; nessun merge nel lotto. Non è una promessa di riconoscimento universale di mesi su ogni layout, documento o lingua. Intestazioni mancanti/ambigue richiedono scelta manuale; i dati già salvati non vengono ricompilati. Rimangono un solo totale e la traccia temporanea; dettagli economici, consumi e ledger durevole sono lotti separati. Browser/app e telefono non provati dal lotto offline; per il rilascio reale occorre l'autorizzazione distinta alla migrazione e all'aggiornamento coordinato.


## Rilascio autorizzato del 25 ottobre 2026

PR #51 integrata su approvazione a `c749c189ad2d3a3bc14131add9f965bdc5fa6c1a`; hash del consolidamento verificato con ls-remote. Main invariato a `cdbb318ddb56e764ad4b111a71560e3e71c7a033`. Runtime detached separato `Dimora-V5-runtime-mese-fattura-20261025`, alberi backend/frontend identici alla punta approvata c910eb6. Client Prisma generato e API/frontend ricompilati prima del fermo del solo processo API identificato. Nessuna installazione o modifica .env.

Backup locale `backups/dimora-v5-invoice-month-20261025T213345Z`: database custom 981981 byte, catalogo e decodifica completa con pg_restore verificati senza ripristino in un altro DB; 329 originali, 26194493 byte, copiati e verificati singolarmente SHA256. Impronte delle 68 tabelle preesistenti stabili durante il backup. Manifesto e hash privati fuori Git. I 104 StoredFile con file mancante, su 433 riferimenti, restano invariati e non vengono rimossi.

Preflight: sola migrazione pendente `20261025220000_expense_invoice_month`, checksum delle migrazioni precedenti controllati. Applicata con migrate deploy e guardia di rete locale: zero migrazioni pendenti; 97 spese preesistenti, nessun invoiceMonth valorizzato automaticamente. Confronto successivo sulle colonne preesistenti delle 68 tabelle e sugli originali: conteggi e impronte invariati. Nessun backfill, upload, conferma o salvataggio automatico; nessuna nuova AI/email.

API PID10956, frontend PID35724 su loopback3011/5174 dalla stessa fonte c749c18. PostgreSQL PID22924, identità/creazione/listener preservati. Guardie sui 157 file JavaScript compilati, sette inizializzatori worker e rete esterna/AI/email preservate; locale soltanto la coda di nuovi caricamenti interattivi, cestino30giorni come prima. Header X-Dimora-Collaudo `roma-consolidata-c749c18-no-ai`, modalità interactive-manual-no-ai. Quattordici controlli HTTP statici/anonimi verdi, inclusi nuovo lettore mese, traccia v2, worker PDF/OCR e API anonima401; nessuna richiesta autenticata automatica. Primo controllo HTTP aveva cercato una stringa con maiuscole errate: corretto il verificatore al nome effettivo localBillInvoiceMonth e ripetuti tutti14, senza modificare prodotto o asserzioni dei test.

Evidenze nel task locale: work/invoice-month-release-build.log, -runtime-proof.json, -backup-private.json, -migrate.log, -after-private.json, -final-private.json, -runtime-http-proof.json, -api-runtime.json; stato canonico work/roma-runtime.json e work/schede-app-frontend-runtime.json aggiornato. Nessun contenuto personale nel repository. La precedente suite1419/1419 resta la verifica funzionale sulla stessa fonte; non viene dichiarata una nuova esecuzione dopo il merge.

Bozza TIM esistente preservata e apertura richiesta al pannello browser (risposta queued, nessuna prova visiva autenticata rivendicata). Le bozze già salvate non vengono rilette o sovrascritte: il committente può verificare il nuovo campo e inserire settembre nella bozza, oppure avviare personalmente una nuova compilazione per verificare la proposta automatica. Il mese non viene ricavato dai servizi o dalle altre date. Rilascio documentato sul branch codex/bollette-mese-rilascio-20261025, soltanto documentazione, da riportare nel consolidamento con PR distinta.
