# R04 — quantità, prezzo articolo e totale documento separati

23 ottobre 2026, branch codex/fase0-ai-quality-v3, base 35b8fbb63841455243b7c3e936b81fb47117ec19. Fetch prima del lavoro: HEAD/upstream 0/0, HEAD/origin/main 436/0; main non integrato né modificato. Applicata la procedura simple-refactor già esaminata nel piano di audit, senza nuove dipendenze.

## Implementato

Il nuovo modulo backend-v5/src/object-onboarding/purchase-validation.ts contiene tre validatori: validateProductQuantity, validateProductAmount e validatePurchaseTotal. Ricevono la lettura dell’evidenza dall’orchestratore, mantenendo la stessa fonte legata a documento/versione/SHA, pagina e regione. Tipi dal dominio importati solo come tipi; classe ProductEvidenceFailure condivisa con il validatore dei campi, senza copie.

Conservati gli stessi controlli e il loro ordine: struttura, quantità intera 1–20, evidenza stampata e riga verificata, coerenza di pagina, prezzo intero positivo in EUR entro 999.999.999 centesimi, significato del prezzo della riga e del totale documento. Il prezzo articolo mantiene anche la classificazione storica dell’errore purchaseTotal/total. Quantità errata rifiutata prima della lettura dell’evidenza; prezzo e totale mantengono la lettura dell’evidenza prima dei controlli numerici.

Nel dominio restano inalterati distinzione null/undefined, recuperi dalla riga verificata solo quando consentiti, ordine degli avvisi, nomi completi prima dell’abbreviazione, controllo ripetizioni, fingerprint/ID e coerenza della somma degli articoli con il totale. Nessun prezzo ricavato dividendo il totale, sottraendo spedizione o moltiplicando importi presunti. Quantità o prezzi espliciti non verificati continuano a richiedere revisione, senza sostituzione silenziosa con un valore locale.

Il nuovo sorgente è incluso nel registro dei file vincolati per le future autorizzazioni qualità; un hash alterato viene rifiutato prima del dispatch. Gold, soglie, campagne, ricevute e ledger storici non modificati. Nessun cambio di prompt, API, schema, transazioni o possibilità di conferma automatica.

## Verifiche offline

| Verifica | Esito |
| --- | --- |
| Build TypeScript e lint backend | superati |
| npm run test:object-onboarding | **300/300**, inclusi cinque nuovi test |
| npm test | **224/224** |
| npm run test:quality-v3 | **24/24** |
| npm run test:quality-v3-live-guards | **15/15**, nessun invio |
| Confronto differenziale prima/dopo | **20.672/20.672** |
| npm run test:offline-db | **495/495**: 54 HTTP, 439 DB diretti, due dopo riavvio |
| Corpi delle altre funzioni nel dominio | **sette identici** |
| Grafo degli import runtime V5 | nessun ciclo |

Il confronto differenziale trasforma in memoria il sorgente del dominio alla base e lo confronta con il dist ricostruito. Copre tre modalità di evidenza, cinque famiglie, quantità/prezzi/totali assenti, null, validi, fuori limite o malformati, righe con/senza tabella, valuta e citazione errate, pagine/regioni non ammesse, bassa confidenza, descrizioni lunghe e più articoli/ripetizioni. Orologio fissato al 23 ottobre 2026, ore 12 UTC; rete bloccata. Confrontati oggetti, JSON serializzato, classi/codici/field/reason e diagnostica degli errori, effetti sull’input, fonti e fingerprint. Gli stack seguono la nuova posizione del codice e non fanno parte del confronto.

20.569 casi restituiscono un output, anche con dati scartati e revisione obbligatoria, e 103 vengono rifiutati: non sono 20.569 importi accettati. Nessuna misura di accuratezza AI ricavata da queste fixture costruite offline. I cinque test permanenti verificano precedenza degli errori, fonte canonica delle righe, limiti/classificazione degli importi, ruolo del totale e ordine degli avvisi. Nessuna asserzione precedente rimossa o ridotta.

Sono identiche le funzioni region, evidence, productCandidates, productChoices, productConfirmation, billAmountEvidence e readHouseExpenses. In particolare conferma transazionale, privacy e idempotenza non sono state spostate o riscritte.

La suite HTTP/DB usa il runner R07: cluster nuovo su 55439, API temporanea 3119, ambiente ridotto e guardie Node/Prisma; soli dati sintetici. Include contatti, attività, documenti, onboarding, conferme/riprese/revoche/replay, acconto/saldo, Q15/Q22/Q48 e riavvio del ledger con provider finti. Nessuna connessione al DB personale o al collaudo esistente 55433/3109. Run dimora-offline-QEZ9Uu conclusa con successo: cluster fermato dal runner, postmaster.pid assente e porte 55439/3119 verificate libere; log e file del collaudo conservati.

## Stato e seguito

Lotto quantità/prezzi implementato e verificato. R04 resta parzialmente aperto per altre validazioni e orchestrazione della conferma, da trattare mantenendo un’unica transazione e i controlli aggiornati su fonti, membership e idempotenza. R03 e gli altri lotti dell’audit restano separati. Nessun beneficio di velocità o accuratezza AI dichiarato: il vantaggio è una responsabilità più leggibile e verificabile.

Frontend invariato, mock non ripetuta (ultimo esito storico 858/858). Nessuna chiamata AI/email, lettura di originali personali, modifica .env, migrazione di prodotto, deploy o intervento sui 104 StoredFile orfani. Nessun reset/clean, force push o rimozione worktree. File legacy sporchi e untracked estranei preservati ed esclusi dal commit. Stato, backlog, roadmap e changelog aggiornati; push sul solo branch Fase 0 e hash remoto verificati nella consegna.
