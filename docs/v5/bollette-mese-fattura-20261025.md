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
