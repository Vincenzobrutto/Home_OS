# Consegna e decisioni di integrazione — 25 ottobre 2026

## Integrazione approvata e app aggiornata — 25 ottobre 2026

Su approvazione esplicita del committente: PR #40 integrata con merge `4594e9179100b147da618da2f138bb3feb91d952`, PR #39 con merge `390b1cbda437c30bba8087f1a00849c875040eed`; punta del consolidamento verificata con git ls-remote. Main invariato a `cdbb318ddb56e764ad4b111a71560e3e71c7a033`. La PR #39 è stata prima aggiornata con merge del consolidamento: conflitti soltanto nei quattro documenti condivisi, mantenendo entrambi i lavori e le tre correzioni di metadata Codex già verificate. Nessuna asserzione o file di prodotto alterato dalla risoluzione.

Frontend integrato e candidato #40 hanno tree identico `23e6061b774e64d1f0c48df84a86c10aaeb32531`. Nuovo checkout runtime separato e detached su `390b1cb`, build offline rifatta con dipendenze già verificate e lock identico. Nessuna nuova suite completa dopo il merge documentale: restano i risultati 1109/1109 mock, 5/5 fixture, 296/296 ordinari, 12/12 guardie e 547/547 DB descritti nei report, senza attribuirli a una nuova esecuzione.

Riavviato soltanto il frontend identificato: da PID32656 a PID24276, loopback5174 e proxy invariato verso3011, ambiente vuoto per Vite e guardia di rete preservati. API10540 e PostgreSQL22924 verificati con identici PID e orari di creazione. Nessun riavvio di questi processi, query SQL, chiamata API autenticata, documento aperto/caricato, AI/email, migrazione o salvataggio. Sei controlli statici HTTP200: root, workspace, onboarding, parser importi, worker OCR e HEAD del modello italiano. Nessuna prova visuale nel browser o sul documento reale dichiarata da questo controllo.

Accesso: http://127.0.0.1:5174/home/c8b6c347-c527-43cb-9808-5d22136c83eb/documenti . Ricaricare la pagina; riprendere la bolletta già presente e controllare i campi prima di scegliere qualsiasi conferma. Dati mancanti o importi ambigui restano da confermare. I branch/file Claude e i file sporchi del checkout master non sono stati toccati. Le PR antecedenti #35–#38 restano invariate; i loro cambiamenti sono inclusi nella #40.

Evidenze locali nel task: work/integrated-app-build.log, work/integrated-app-readiness.json, work/integrated-app-preserved-processes.json e work/roma-runtime.json. Questo resoconto successivo al merge è pubblicato sul branch proprio della PR #39, senza un commit diretto aggiuntivo sul consolidamento.

## Stato verificato prima della decisione di merge

Metadata GitHub riletti il 25 ottobre e commit di merge verificati come antenati di `origin/codex/dimora-v5-consolidata-20261023`, punta `730b93d` al controllo. Questo accerta il codice presente nel branch; non è una nuova verifica dell'app avviata o del suo DB.

| Già integrato | Merge | Riscontro |
| --- | --- | --- |
| [PR #17, oggetti e stanze](https://github.com/Vincenzobrutto/Home_OS/pull/17) | 703cac4 | Stato merged; corretta la vecchia riga Codex ancora in attesa. |
| [PR #23, schede predefinite](https://github.com/Vincenzobrutto/Home_OS/pull/23) | e8ac99f | Stato merged; corretta la riga che riportava soltanto l'approvazione. |
| [PR #24, bollette testuali](https://github.com/Vincenzobrutto/Home_OS/pull/24) | 2ab7570 | Stato merged; riga già coerente. |
| [PR #26, OCR locale](https://github.com/Vincenzobrutto/Home_OS/pull/26) | 69d9f00 | Stato merged; riga già coerente. |
| [PR #33, PDF ibridi e telecomunicazioni](https://github.com/Vincenzobrutto/Home_OS/pull/33) | 730b93d | Stato merged; corretta la riga che chiedeva ancora il merge. |

Solo le tre righe obsolete di Codex sono aggiornate. Nessuna riscrittura dei risultati storici, dei report originari o delle righe del lotto Claude.

## Candidati della mattinata

1. [PR #40, frontend completo](https://github.com/Vincenzobrutto/Home_OS/pull/40): contiene già #38, #37 e quindi le correzioni #35/#36, più la lettura prudente degli importi delle bollette. Ripresa dall'archivio, classificazione nella pagina diretta, isolamento delle risposte/callback tardive, campi manuali e tastiera verificati. Totali in valuta diversa, numeri malformati o incompatibili lasciano il solo importo da confermare. **1109/1109 mock in 124 file**, 5/5 fixture, typecheck/lint/build verdi. Un solo candidato include questa sequenza: non occorre integrare prima anche #35–#38. Nessuna delle PR precedenti è stata modificata o chiusa da questo incarico. [Report frontend](https://github.com/Vincenzobrutto/Home_OS/blob/codex/bollette-importi-prudenti-20261025/docs/v5/bollette-importi-prudenti-20261025.md).
2. [PR #39, workflow server offline](https://github.com/Vincenzobrutto/Home_OS/pull/39): test del contratto di completamento e recupero di 19 file esclusi dai profili; solo test, fixture, script npm e documentazione, senza codice backend di prodotto o schema. Verifiche finali: ordinari **296/296**, guardie **12/12**, aggregato **547/547**, build/lint verdi. Causa dei 403 nelle fixture dimostrata sul cluster nuovo; timestamp di test corretti, rifiuti di membership futura/scaduta/revocata invariati. Il frontend della PR #40 non è incluso in questo branch.

I due lotti partono dal consolidamento e non richiedono il cestino Claude. Il secondo non cambia il frontend o le API. I file di prodotto non si sovrappongono; se entrambi vengono approvati, gli eventuali conflitti nei documenti condivisi vanno risolti mantenendo entrambe le righe e i resoconti. Non prendere lo stato storico da un solo lato scartando l'altro.

## Programma fino alle 14 — esito dei filoni

| Filone | Esito e limite |
| --- | --- |
| Navigazione e recupero della compilazione | Correzioni combinate nella PR #40; nessun cambio automatico di documento da risposte precedenti. |
| Dati locali, errori e tastiera | Test di isolamento delle letture e dei campi manuali, recupero esplicito e focus; prove DOM, non telefono fisico. |
| Prezzi delle bollette | 54 nuovi casi generali; altre informazioni conservate quando il totale non è affidabile. Nessuna conversione o ripartizione implicita. |
| Workflow server, privacy e idempotenza | PR #39: copertura riattivata, completamento bolletta verificato, replay e accessi negati; cluster offline arrestati. |
| Peso della build e consegna | Entry iniziale invariata; misure dei chunk nei report, senza refactoring speculativo. Stato GitHub riconciliato e due candidati finali con push verificati. |

Chiusura delle attività pianificate prima delle 14, senza occupare il tempo residuo con ripetizioni prive di nuove modifiche o nuovi difetti. Restano le decisioni di merge e il successivo collaudo nell'app: non sono eseguiti implicitamente da questa consegna.

## Passi dopo la decisione del committente

1. Rileggere stato remoto e punte approvate prima di integrare; niente force push o rebase dei branch pubblicati. Main resta escluso.
2. Integrare i soli candidati approvati, verificare il nuovo hash remoto e le PR rese eventualmente ridondanti. Nessuna chiusura preventiva o duplicazione dei cambiamenti.
3. Per il candidato frontend, aggiornare soltanto l'ambiente autorizzato e rifare i controlli della build e della provenienza. Questo documento non autorizza riavvii, AI, migrazioni o salvataggi reali.
4. Provare una bolletta già disponibile: ripresa dall'archivio senza ricaricare l'originale, controllo dei dati, Salva bozza e riapertura. Deve restare da completare senza nuova spesa.
5. Solo quando si vuole davvero registrare, effettuare la conferma finale: una spesa, tipo Bolletta e stato aggiornato. Se altre bozze/analisi personali dello stesso originale sono aperte, verificarle prima di considerare errata la permanenza fra i documenti da completare.

## Limiti che restano espliciti

- Browser/telefono/lettore di schermo reali non verificati in questa mattinata; i test di tastiera sono DOM simulato. Nessun aggiramento delle protezioni o cambiamento di rete/firewall.
- Non è una nuova campagna AI o una certificazione dell'estrazione su tutti i formati. Dati mancanti o ambigui richiedono conferma; nessuna classificazione ricavata da un catalogo del singolo cliente.
- Nessun dato della casa Roma, originale personale, DB/API/storage reale o `.env` letto o modificato. I 104 StoredFile orfani restano fuori scope.
- Il lotto cestino è separato: nessun suo branch, file, merge o decisione modificato.
