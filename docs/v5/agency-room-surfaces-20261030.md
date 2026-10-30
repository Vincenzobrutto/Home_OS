# Planimetrie: porte e superfici interne — 30 ottobre 2026

Implementato room-surfaces: correzione locale della catena dell'arco interno con soglia ancorata, mantenendo altri vertici, rientri e vuoti; rilevatore di involucri rettangolari sostenuti da quattro fasce murarie. I sanitari non erodono la superficie nell'involucro esplicitamente selezionato. Vuoti strutturali preservati, simboli incerti ancora aperti; esclusioni richiedono geometria esplicita. Frammenti disconnessi rifiutati. Nessuna nuova route, schema o persistenza: anteprima pura e confronto precomputato nel laboratorio.

## Prova privata
Replay senza nuova AI. Codex ha indicato gli ancoraggi e il verso della porta, selezionato due dei tre involucri candidati dei servizi; il terzo invadeva il locale vicino. Non è riconoscimento semantico autonomo o conferma di un agente. Scartato anche il tentativo di sostituire l'intera stanza con un rettangolo perché alterava rientri reali.

7 → 9 contorni proposti, zero sovrapposizioni; originale byte-identico, tre vani estranei con punti/vuoti identici. Arco recuperato: 845 pixel quadrati, non metri quadrati. Sei verifiche aperte: due spazi irrisolti, tre revisioni degli interni, un simbolo incerto. Balcone omesso e copertura completa non risolti. totalM2 null, confirmed false; nessuna metratura dalla sola scala nominale 1:100.

Ripartizione sottrae soltanto porzioni occupate dagli involucri selezionati. Canonicalizzazione rumore float32 sui bordi condivisi entro 0,001 pixel, poi guardia overlap rigorosa. Kernel rafforzato per bordi decimali coincidenti e sovrapposizioni reali sottili anche su poligoni piccoli.

## Verifiche
606/606 backend ordinari finali (agency-surfaces-regression-definitive.log), inclusi 77 test planimetrie e dieci nuovi casi; build/lint mirato verdi. DB nuovo Fabpup 21/21, arrestato: adapter/privacy esistenti, non salvataggio delle nuove anteprime; eseguito prima dell'ultimo affinamento numerico coperto dalla suite ordinaria finale. Typecheck/esbuild laboratorio e browser reale: seconda immagine, pulsante correzioni, stato 9/6 e avviso precomputato verificati.

Primi fallimenti: endpoint duplicato nella fixture dell'arco e sovrapposizione reale sottile non rilevata; fixture corretta e kernel rafforzato, assert non allentati. Nessuna AI pagata, nuova dipendenza, lettura credenziali, merge o deploy; ledger/riserve invariati e demo Alessio invariata.

## Consegna e prossimo gate
Immagini, coordinate e risposte private fuori Git. Output chat Dimora-superfici-vani: confronto-superfici.png e anteprima-web.png; Dimora-soglie-virtuali/laboratorio.html autosufficiente. Server solo loopback 127.0.0.3:34876 fino18:08 Europe/Rome, HTML disponibile offline dopo scadenza. Nessun DB/API riavviato.

Prossimo: proposte automatiche di ancoraggi/verso porta e selezione involucri con evidenze, fixture indipendenti e falsi positivi; poi revisione/salvataggio scoped fonte/versione/SHA/CAS nel workspace. Worker e mobile laboratorio ancora aperti. Entrambe le viste prodotto invariate.
