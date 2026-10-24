# Classificatore locale — ricevute e negazioni

23 ottobre 2026, Codex. Branch `codex/ricevute-negazioni-20261023`, worktree dedicato `Dimora-V5-ricevute-negazioni-20261023`, base remota del consolidamento `55f4d4fdc92c3e392af0902c4180674374015711`. Lotto registrato prima del codice con commit `dc171ca`.

## Problema e risultato

Il classificatore non riconosceva «Ricevuta d'acquisto» e interpretava la parola «fattura» anche dentro una negazione. Il documento reale già verificato localmente veniva quindi proposto come fattura, benché fosse una ricevuta e dichiarasse il contrario.

Ora riconosce ricevute con «di acquisto», «d'acquisto», apostrofo tipografico o modificatore, spazi non separabili e testo a capo. Le forme «ricevuta fiscale», «scontrino» e «documento commerciale» rimangono supportate.

La verifica delle negazioni si applica alla singola occorrenza di un tipo, entro il contesto precedente limitato a 160 caratteri e delimitato dalla punteggiatura di frase. Sono trattate forme esplicite come «non è/costituisce/rappresenta/sostituisce», «non valido come», «non si tratta di», «senza valore di» e riferimenti negativi all'obbligo di emissione/rilascio/presentazione. Non c'è alcuna eccezione per marchio, nome file, fornitore o documento campione.

Il classificatore cerca la prima occorrenza non negata anche se la prima è negativa. Un disclaimer non disabilita il tipo per tutta la pagina o per il PDF: una vera intestazione FATTURA successiva resta riconosciuta, anche in un documento misto ricevuta/fattura. Il tipo «fattura» non viene invece rimosso da «Fattura non pagata» o «Fattura non valida»: classificazione del documento e giudizio su pagamento/validità sono distinti.

## Perimetro

Modificati soltanto `backend-v5/src/document-intake/classifier.ts`, il suo test esistente e questa documentazione con stato/roadmap/changelog. Nessuna modifica a schema, migrazioni, accesso/letture dei documenti, cestino, provider, gold, validazione di evidenze/importi, conferme o idempotenza. Il confronto con il diff del branch Claude non ha rilevato sovrapposizioni sui due file di codice/test del lotto.

Titoli e citazioni restano ricavati dal testo originale: nessuna normalizzazione distruttiva delle evidenze, nessuna conversione del documento in testo sintetico, nessuna decisione economica o creazione di oggetti/spese. Contratto e metodo `local_text_v1` invariati.

## Verifiche eseguite

- Build TypeScript superata, ripetuta automaticamente dal runner prima della suite finale.
- `npm run lint` completo superato dopo l'ultima modifica.
- `npm test`, runner offline senza DB: **233/233**, contro i 224 della base. Nove nuovi gruppi di regressione includono varianti di apostrofo/spazi/capo, negazioni di più tipi, disclaimer ripetuti, ripresa dopo un'occorrenza negativa, pagine successive, cambi di clausola, documenti misti, note negative sul pagamento e riferimenti negativi all'obbligo di emissione. Asserzioni di fonte/pagina conservate; nessun test precedente indebolito.
- **Riscontro sul PDF reale autorizzato, esclusivamente locale:** lettura con il worker PDF effettivo, stesso testo passato al classificatore prima e dopo. Prima: `invoice`; dopo: soltanto `receipt`, collezione `purchases`, fonte letterale a pagina 1. SHA-256 dell'originale invariato. Nessuna copia, citazione personale, identificativo o nome file reale nel repository o nei test.
- La prima verifica locale dopo l'intervento iniziale riconosceva ancora anche fattura: la scansione delle occorrenze successive aveva individuato il secondo riferimento, relativo all'obbligo di emissione. Aggiunto un caso generale deidentificato e ripetuti suite completa, lint e riscontro reale; esito finale sopra. Non è stata soppressa una fattura autentica per far passare il campione.

Il runner ripulisce l'ambiente e blocca connessioni provider/email e DB nei test unitari. La prova locale sul PDF usa un processo senza credenziali, con fetch/socket/TLS disabilitati. Nessun `.env`, DB/API/storage reale o del collaudo utente letto o modificato da questo lotto. Nessuna nuova AI/email, installazione, reset/clean, force push o rimozione worktree. Main, branch Claude e checkout sporco Home_OS non modificati.

## Riproduzione

Da `backend-v5`, con le normali dipendenze e il client generato della stessa versione disponibili:

```powershell
npm run build
npm run lint
npm test
```

I test committati sono sintetici e non richiedono il PDF privato. I log della sessione e la prova reale priva di contenuti sono conservati localmente nella chat (`work/receipt-classifier-unit-final.log`, `receipt-classifier-lint-final.log`, `receipt-classifier-real-proof.json`).

## Stato e limiti

**Implementato e verificato; PR #12 integrata su approvazione del committente il 23 ottobre**, merge `b74efe994fdf6416509afaae9254d317e2e74570` nel consolidamento. Nessun ricalcolo di bozze esistenti. Il successivo riavvio del solo collaudo isolato è documentato sotto.

Resta un classificatore lessicale conservativo, non un interprete completo di qualsiasi negazione, condizione o riferimento giuridico. Non introduce OCR: i PDF raster senza testo restano fuori dalla capacità di questa classificazione locale. Le precedenti regole edilizie restano invariate. Test frontend e suite DB non eseguiti: il lotto modifica soltanto una funzione pura backend e i suoi test, senza UI o percorsi DB. Le analisi AI storiche, la qualità generale dell'estrattore e il lotto Cestino restano distinti.

## Integrazione e riavvio isolato approvati — 23 ottobre

- Verificata la PR #12 prima del merge: punta attesa `aea593fd6dc14d76081d50dfc01b6b391dfe2c87`, base consolidamento, nessuna modifica ulteriore. Merge GitHub con controllo dell'hash, poi fetch e verifica remota di `b74efe9`. Main resta `cdbb318ddb56e764ad4b111a71560e3e71c7a033`; il branch Claude resta alla punta osservata all'inizio della consegna, `a132696bd6878246a471b42b44ac977eb6b8cce5`.
- Worktree del lotto aggiornato con fast-forward alla versione integrata e build TypeScript ripetuta con successo. Non è stata ripetuta la suite 233/233, già verde sullo stesso codice prodotto; il merge non aggiunge cambiamenti al prodotto rispetto alla punta collaudata.
- Arrestato il precedente supervisore del solo ambiente isolato, verificando percorsi e processi; conservato il vecchio `dist` in un backup locale, copiato il nuovo compilato e adattate esclusivamente nella copia le porte/identità di collaudo. Nessuna migrazione, `.env` o servizio reale.
- Riavviati API 3109, frontend 5179 e relativo PostgreSQL 55433 di collaudo. Stessa guardia: fetch/rete esterna bloccati, provider AI disabilitati, worker e pulizia storage disabilitati, scritture HTTP di prodotto respinte. Verificati log di avvio, header `X-Dimora-Inspection: coffee-read-only`, risposta frontend 200 e browser con sessione esistente.
- Hash del classificatore compilato in esecuzione identico a quello della build integrata. Controlli puri sul modulo effettivamente distribuito: ricevuta con entrambi i disclaimer → solo receipt; PDF misto con fattura su un'altra pagina → receipt + invoice. Nessuna analisi o riclassificazione salvata sul DB.
- Browser: aperta la bozza preesistente del caffè; nome/marca/modello e data 14/06/2026 invariati, 499 EUR, scelta «Non creare una spesa», riepilogo «Nessuna nuova spesa». Nessun comando di salvataggio o nuova analisi eseguito.
- Audit Prisma in transazione READ ONLY prima/dopo: identici conteggi e impronte di documenti/originale, bozze, job/tentativi, oggetti e spese. Restano **1 documento, 2 bozze caffè, 3 job caffè, 0 oggetti e 0 spese**. Nessun dato canonico modificato.

Log, backup compilato, audit e schermata sono conservati soltanto negli artefatti locali della chat. Questa registrazione documentale non cambia codice o dati e passa da una PR separata verso il consolidamento; nessun merge aggiuntivo automatico.
