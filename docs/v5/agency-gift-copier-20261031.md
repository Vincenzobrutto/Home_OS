# Gift v1 — copia indipendente nella Home e anno completo

31 ottobre 2026. Lotto sul ramo `codex/agency-gift-contract-20261031`, PR draft72. Prosecuzione oltre le23 autorizzata. **Backend interno verificato: nessuna route, interfaccia dal link o elaborazione avviata nell'app.**

## Comportamento implementato

Il nuovo worker usa il job durevole approvato dal destinatario: rilegge dal DB l'invito associato, l'account con email verificata, la selezione, le versioni/SHA e il diritto corrente dell'issuer di esportare. Una lease con epoch protegge il lavoro da processi concorrenti o scaduti. Scanner e letture dei file restano fuori dalle transazioni SQL brevi; la lease viene rinnovata fra i file.

Ogni originale riceve una copia distinta nello storage Home, che deve essere separato e non annidato nel vault Agency. Dopo ammissione e rilettura del SHA, una prenotazione `StoredFile` protegge lo staging dalla pulizia ordinaria. Gli item già ammessi si riusano dopo il riavvio, anche se appartengono a una precedente epoch valida. Un esito DB incerto non causa cancellazioni compensative di file che potrebbero essere già referenziati.

Solo quando tutto è pronto, una transazione crea la Home con i dati confermati, la sola membership owner del destinatario, i documenti privati/versioni locali1, la ricevuta e l'eventuale diritto annuale. Nessuna membership o grant viene dato all'agenzia. Un errore annulla l'intera pubblicazione; una risposta persa dopo il commit viene recuperata dalla ricevuta senza ripetere la copia o prorogare l'anno.

La provenienza conserva versione/SHA Agency, autore, origine e qualifica delle superfici; la versione locale del documento resta distinta. Una stima rimane una stima e una dichiarazione di firma non diventa una verifica della firma. Il purge del proprietario non è bloccato da FK del registro Gift e il replay non ricrea i documenti eliminati.

## Ricevuta e anno

La ricevuta minima contiene soltanto riferimenti logici, hash, data e beneficio; non duplica nomi/indirizzi della casa, titoli, autori, token o chiavi storage. Dopo il successo il job e gli item svuotano i campi descrittivi/staging. Il normale archivio Agency ha una propria retention, distinta dalla Home.

Begin/get leggono la ricevuta accettata prima di controllare invito, token o Agency, anche se la pubblicazione avviene mentre una lettura attende un lock. L'account deve essere quello della ricevuta e mantenere accesso corrente alla Home. Il cambio email, la revoca del link o dell'issuer e la rimozione dell'originale Agency non revocano i documenti già copiati. Uno stato accepted senza ricevuta coerente fallisce chiuso.

Con flag true, `AccountGiftBenefit` attiva l'offerta `dimora-full-access-v1` nello stesso commit, per 12 mesi di calendario UTC dall'accettazione. Il 29 febbraio scade al 28 febbraio successivo alla stessa ora. I retry restituiscono le stesse date. Il lettore `GiftBenefitsStore` controlla account, ricevuta e grant senza dipendere dai permessi Agency/Home; restituisce un riepilogo minimo dell'anno attivo. False significa assenza di un diritto Gift attivo,non definisce o limita il futuro piano free. Non cambia altri abbonamenti e non concede ruoli admin,accessi a case altrui,consensi o budget AI.

## Recupero

Cancel è una porta interna autorizzata al solo titolare del job,senza lease attiva e senza ricevuta accettata. Può ritirare solo prenotazioni non collegate a un documento;dopo commit elimina solo chiavi proprie con lookup DB negativo riuscito. In caso incerto conserva i byte per la pulizia ordinaria. I file pubblicati,estranei e Agency restano intatti. Gli orfani prodotti prima di una prenotazione restano soggetti alla soglia ordinaria di 24 ore. Il limite interno è di 5 tentativi;il polling/GC automatico è nel successivo modulo applicativo,non in questo incremento.

## Verifiche

- 789/789 test backend ordinari, inclusi 130 unit Gift, zero fallimenti o skip.
- 78/78 test DB Gift, inclusi 21 del copier (20 sottocasi e contenitore), su nuovo cluster posseduto `dimora-offline-4oGR4y`, poi arrestato; `stop-postgres.log` verificato.
- Schema/client Prisma privato, typecheck e lint mirato verdi.
- Log: `work/agency-gift-evidence-20261031/gift-copier-regression.log` e `gift-copier-db-2.log`.

Primo run DB `EaJ9xQ`:70/72, soltanto l'aspettativa del test cancel con lease attiva attendeva unavailable anziché revision_conflict. Corretto il test, senza indebolire il prodotto; cluster arrestato. Aggiunte poi le prove di guasto e capabilities, eseguite sul nuovo cluster sopra. Le prove comprendono rollback dopo una vera creazione Document nella transazione, risultato perso dopo commit riuscito, lease sostituita durante lo scanner, ripresa della prenotazione, cleanup selettivo, ricevuta mancante, purge e anno indipendente.
I test copier usano database e filesystem nuovi posseduti con fixture sintetiche e scanner esplicitamente stub. Non costituiscono antivirus reale,invii,AI,pagamenti o collaudo browser. Frontend invariato:nessun nuovo375px o test UI da dichiarare.

## Da collegare

Controller/sessione/Origin/CSRF,filtro errori Gift,poller con concorrenza limitata e ripresa,gestione invito/reissue,resolver autenticato del job e UI Agency/proprietario. Il link dovrà tenere il token nel frammento e poi soltanto in memoria,niente query string o storage browser. La normale verifica email resta obbligatoria;nessun fallback simulato nell'app. Il producer dei metadati finali va collegato senza accettare descrittori privilegiati dal browser o inventare un modello incarico approvato.