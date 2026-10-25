# Bollette fase 1 — traccia della lettura locale e campi non riconosciuti

## Ambito e fonte

Lotto `codex/bollette-tracciabilita-20261025` dalla punta remota d0d7d0dd5ef048455df01b8af30e3c0dc366948f, in worktree dedicato. AGENTS e lotti verificati, registrazione `b37c54e` prima del codice. Prima fonte prodotto `7d95d07bfbe72579eb5c2043ea456bb3b0d49c69`; fonte definitiva `e5b26f028224132aa05a0b7cbc4f93dfc579c0f2` dopo la correzione dei riferimenti vuoti.

Rimane **un solo totale per bolletta**. Nessun dettaglio economico, nuovo importo, consumo, pagamento dedotto o ripartizione. Solo frontend; nessuna API/schema, backend, dipendenza, worker OCR o file Claude modificati. Nessuna AI/email, DB/API/storage reale, migrazione, aggiornamento app o conferma automatica.

## Esperienza e diagnostica

Nella compilazione locale compare «Origine dei dati e campi non riconosciuti». Il pannello espandibile descrive la **lettura iniziale**, separatamente dalle correzioni successive dell'utente. Per servizio, fornitore, importo, emissione, periodo e scadenza mostra:

- dato proposto, da controllare nell'originale;
- dato non individuato dalle regole sulla prima pagina, senza dichiararlo assente dal documento;
- riferimento individuato ma non utilizzabile, ad esempio data invalida o formato monetario non ammesso;
- indicazioni discordanti, senza scegliere o sommare valori;
- mancata interpretazione del documento per esclusione, mancato riconoscimento, più fatture, limiti o fonte non corrispondente.

Per ogni campo la traccia associa versione del lettore, identificatore della regola e metodo PDF oppure PDF+OCR; il pannello mostra metodo, pagina1 e versione del documento. Non presenta una probabilità di correttezza o una certificazione. Una data letta via OCR non trasforma in OCR il totale già supportato dal testo nativo. Se l'arricchimento fallisce e il lettore conserva dati nativi, il pannello lo dichiara.

Gli errori locali distinguono indisponibilità del worker, tempo massimo, limiti, errore, lettura non sufficiente e interruzione. Codici o messaggi inattesi diventano un messaggio generico: mai esporre il testo grezzo dell'errore, percorsi o contenuti del documento.

La traccia non riporta valori estratti o citazioni. È un riferimento alla lettura della fonte vincolata allo SHA verificato e alla pagina, non una prova testuale per ogni valore: non vengono inventati estratti o coordinate. Il contenuto da confrontare resta nell'originale e nei campi della compilazione.

## Implementazione e compatibilità

- `localBillTrace.ts`: stati, regole, versione `local-bill-summary-trace-v1` e messaggi di errore ammessi; non contiene dati di clienti. La versione entra nella chiave query insieme a account/casa/documento/versione/SHA; mantenerla aggiornata quando cambia il contratto del lettore.
- `localBill.ts` e `localBillMoney.ts`: osservatori opzionali del percorso già eseguito. La diagnosi nasce dagli stessi candidati e controlli che determinano il valore, senza parser alternativo o modifiche alle validazioni. La forma e i valori di `LocalBill`/`localBillForm` restano invariati.
- `localBillPdf.ts`: osservatore opzionale separato dal valore restituito; hash verificato prima del parsing, pagine effettivamente lette, confronto con proposta nativa per il metodo di ogni campo, gestione del fallback OCR. Cancellazione senza pubblicare una traccia tardiva. Non vengono lette pagine successive per spiegare un dato mancante.
- `OnboardingPage.tsx`: esito e traccia nella stessa query, senza uno stato globale per i dati. Restano GC0, isolamento account/casa/documento e annullamento. Quando la lettura non è eleggibile o un accesso è negato, la traccia non viene esposta. Non si rilegge né sovrascrive una compilazione già salvata.
- `LocalBillReading.tsx` e CSS Module: pannello senza comandi di salvataggio, AI o modifica, con summary nativo accessibile e griglia senza larghezze fisse. Una traccia con SHA diverso dalla fonte corrente non viene renderizzata.

**Traccia effimera, non ledger durevole:** rimane nella query in memoria durante la compilazione. Non viene aggiunta a bozza, payload di conferma, spesa, log, localStorage o analytics. Il pannello lo dichiara. Alla ripresa di una compilazione già salvata non si ricostruisce retroattivamente una fonte per le correzioni manuali. Uno storico persistente campo-per-campo richiederebbe un lotto backend distinto, con contratto, autorizzazione per fonte, cancellazione/export e relativo collaudo offline.

## Verifiche e limiti

Primi test nuovi/PDF/UI43/43; gruppo mirato successivo330/330 in12 file, un worker/retry0,34,78 secondi. Aggiunti poi sette casi sui messaggi di errore sicuri. Typecheck, lint e build verdi sulla prima fonte7d95d07; ripetuti verdi sulla fonte definitiva e5b26f0, build9,21 secondi. I casi nuovi/PDF/UI definitivi sono52/52, inclusi due casi aggiuntivi di etichetta fornitore vuota. Asserzioni di privacy/idempotenza e gold preesistenti invariate; adattato solo il mock del lettore per poter emettere anche la traccia nei nuovi casi.

Verifica finale estesa dei gruppi mock `object-onboarding` e `intake-integration`: **689/689 in47 file**,276,85 secondi, un worker/retry0, zero saltati, sulla fonte definitiva e5b26f0. Sono tutti i test dei due gruppi interessati, non la suite mock completa dell'intero frontend. Nessun test DB, browser reale o telefono in questo lotto.

Le nuove prove coprono invariabilità di valori/form, diagnostica senza valori/citazioni, totale unico o irrisolto, date invalide e discordanti, periodo non inferito dal mese fattura, fonte non corrispondente, annullamento, origine distinta PDF/OCR e fallback nativo. Nel percorso UI: aprire la traccia non modifica una correzione manuale né avvia POST/conferme; risultato tardivo o SHA diverso non passano al documento successivo. Test sintetici, nessun PDF personale letto/coperto da nuove prove.

Harness mock, configurazione/cache esterne al repository e ambiente ripulito dalla policy offline del backend; stessi package/lockfile. Evidenze locali del task: `work/bill-trace-new.log/json`, `work/bill-trace-focus.log/json`, `work/bill-trace-checks.log`, `work/bill-trace-domain.log/json`. Nessun nuovo invio AI o servizio reale.

## Consegna e seguito

Implementato e verificato offline sul branch proprio, app non aggiornata. [PR #48](https://github.com/Vincenzobrutto/Home_OS/pull/48) verso il consolidamento, commit e push verificato con ls-remote; merge al committente. Worktree pulito alla consegna, main e consolidamento invariati. Rimangono da validare ulteriori layout reali autorizzati indipendenti e uno storico persistente se richiesto. Dettaglio economico e consumi restano rinviati.


La prima esecuzione del gruppo di dominio è stata interrotta ancora in corso dopo la revisione del caso Fornitore seguito solo da spazi: non è dichiarata verde. Correzione della sola diagnosi e due test aggiunti, senza alterare i valori restituiti. Log conservato in work/bill-trace-domain-before-refinement.log; ripetizione definitiva in work/bill-trace-domain-final.log.
