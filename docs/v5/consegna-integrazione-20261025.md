# Consegna e decisioni di integrazione — 25 ottobre 2026

## Stato verificato, senza merge

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

1. [PR #38, frontend](https://github.com/Vincenzobrutto/Home_OS/pull/38): contiene già la combinazione #37 e quindi le correzioni #35/#36, più la protezione dalle risposte e callback tardive. 1055/1055 mock, 5/5 fixture, typecheck/lint/build. Un solo candidato include tutta questa sequenza: non occorre integrare prima anche #35, #36 e #37. Nessuna delle PR precedenti è stata modificata o chiusa da questo incarico.
2. Lotto `codex/workflow-server-offline-20261025`: test del contratto di completamento e recupero di 19 file esclusi dai profili; solo test, fixture, script npm e documentazione, senza codice backend di prodotto o schema. PR e risultati definitivi da registrare dopo la chiusura dell'aggregato.

I due lotti partono dal consolidamento e non richiedono il cestino Claude. Il secondo non cambia il frontend o le API. I file di prodotto non si sovrappongono; se entrambi vengono approvati, gli eventuali conflitti nei documenti condivisi vanno risolti mantenendo entrambe le righe e i resoconti. Non prendere lo stato storico da un solo lato scartando l'altro.

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
