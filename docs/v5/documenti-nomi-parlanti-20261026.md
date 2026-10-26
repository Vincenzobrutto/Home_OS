# Nomi parlanti estesi ai documenti completati

## Ambito concordato

Il committente ha scelto «Solo nomi a video, come oggi». Lotto frontend `codex/documenti-nomi-parlanti-20261026`, base remota del consolidamento `7ed872e`; registrazione `ba604ef` prima del codice, fonte prodotto verificata `67c3fa5`. Nessun file dei lotti Claude aperti modificato. Originali, titoli salvati, schema, API e backend invariati; nessuna bonifica persistente o accesso ai dati reali.

## Regole

- Alias solo con stato personale `completed`, una sola parte di tipo riconosciuto e titolo ancora uguale al filename o al suo stem PDF/JPEG/PNG. Qualsiasi titolo diverso è preservato, compresi quelli generici che potrebbero essere stati scelti dall'utente.
- Fattura, ricevuta, ordine, documento di acquisto e conferma di consegna/spedizione possono usare nomi degli oggetti collegati e, se esiste una sola spesa personale attiva, fornitore, numero e data documento già confermati. Nessuna deduzione di pagamento, consegna, prezzi o date dai servizi. La data è mostrata solo se canonica YYYY-MM-DD e realmente valida nel calendario.
- Manuali, garanzie, etichette e altri tipi specifici possono usare gli oggetti collegati. Non si trasferiscono dati della spesa di acquisto alla data del manuale o della garanzia. Tipo senza contesto sufficiente, `other`, tipo sconosciuto e documenti compositi mantengono il nome precedente.
- Con più spese non si sceglie una fattura o un acconto: si possono usare solo gli oggetti collegati. Con più oggetti si mostrano due nomi completi e il conteggio dei rimanenti; i link duplicati allo stesso ID/tipo non gonfiano il conteggio. Marca, modello e varianti contenuti nel nome oggetto non vengono troncati.
- Le bollette conservano integralmente la regola precedente: fornitore e mese fattura esplicito nell'unica spesa, senza sostituire il mese mancante con data documento, periodo dei servizi o nome oggetto.

Esempi sintetici: «Fattura · Macchina da caffè ECAM 123 variante X · Negozio qualsiasi · n. A/27 · 03/09/2026»; «Manuale d’uso · Climatizzatore 1, Climatizzatore 2 (+1)». Non sono nomi ricavati da documenti reali del committente.

## Isolamento e compatibilità

Il nuovo helper puro usa esclusivamente `linkedObjects` e `savedExpenses` già filtrati dal backend e presenti nel listing personale. Non introduce query, fetch per riga, nuovi endpoint, OCR o invii AI. Risposte vecchie o dettaglio senza contesto continuano a mostrare il titolo canonico. Ricerca, ordinamento ed export restano su titolo salvato/filename. Il testo dei dettagli del file è stato generalizzato per spiegare la presentazione, mantenendo nome originale e titolo salvato visibili.

Il percorso mock verifica link con ID invariato, titoli personalizzati e documenti incompleti preservati, originali nei dettagli, zero scritture oltre al login e zero letture per documento. Il test non modifica il backend finto condiviso: estende la sola proiezione della fixture del nuovo test. Nessuna verifica UI autenticata sul reale rivendicata.

## Verifiche e consegna

Nuovo gruppo mirato **62/62** in cinque file, di cui **35 nuovi** (34 regole pure e un percorso archivio); include i 23 casi bollette e il percorso precedente. Le prime due esecuzioni del nuovo test UI erano rosse: prima il rendering risultava ancora in caricamento; poi la fixture conteneva una famiglia `purchases` non prevista dal contratto (`purchases` è una collection). Reso esplicito nel setup il caricamento lazy e usata la famiglia valida `warranty`, lasciando la collection `purchases`. Asserzioni e timeout invariati; le due esecuzioni e il verde finale conservati separatamente nei log locali.

Regressioni dell'area **221/221 in 23 file**, senza fallimenti o saltati, un worker e retry0; include documenti/archivio, ricerca server, collegamenti alle spese, privacy account/casa e revoche, tipo inline e nuovi nomi. Typecheck/lint/build verdi sulla stessa fonte prodotto. Suite mock completa non ripetuta in questo lotto: verificato il gruppo interessato dal cambiamento di presentazione; il precedente1461/1461 appartiene alla fonte della PR54 e non viene presentato come nuovo risultato. Nessun merge o aggiornamento app in questo lotto; PR verso il consolidamento dopo i controlli, merge al committente. Nessuna AI/email, DB/API/storage reale, migrazione, salvataggio automatico o modifica a main.

Evidenze nel task locale: `work/readable-document-new.log`, `-new-final.log`, `-new-green.log`, `-new.json`, `-focus.log/json` e `-checks.log`; nessun contenuto personale nel repository.

## Attività del committente

Consegna nella [PR #56](https://github.com/Vincenzobrutto/Home_OS/pull/56), pronta per revisione verso il consolidamento. Push verificato con `git ls-remote`; ultime modifiche soltanto documentali, fonte prodotto invariata67c3fa5. Nessun merge o attivazione implicita.

Approvare la PR per integrazione e successiva attivazione del frontend. Poi controllare nell'archivio un documento completato collegato a oggetti o con una sola spesa: il nome originale deve essere ancora disponibile nei dettagli. I documenti privi dei dati necessari resteranno col nome precedente; non richiedono ricreazione, ricaricamento o conferma duplicata.
