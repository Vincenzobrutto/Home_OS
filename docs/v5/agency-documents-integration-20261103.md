# Agenzie — candidato integrato documenti e mappa, 3 novembre 2026

## Incarico e risultato atteso

Proseguire in autonomia fino a un candidato coerente e verificato: revisione della mappa PR78 e riunione con analisi documentale PR77, quindi correzioni circoscritte al percorso fonti → proposte citate → associazione → conferma → confronti/finding → preparazione incarico. La generazione resta bloccata senza modello approvato; nessuna AI reale o spesa, deploy/main, demo Alessio, dati personali o servizi/DB esistenti.

Base comune3335ea94af353d8e232508169024e531ab6d22b2; PR78 a89fbd55dd051393e54f583939b377688b4cfd302 e PR77 a7cae566d5d8e60850378eb9ade059e72efb25533. Nuovo ramo `codex/agenzie-documenti-consolidamento-20261103`, worktree separato. I risultati storici dei rami non costituiscono QA di questo candidato.

## Sequenza e criteri di chiusura

1. Riesame indipendente delle due PR complete e registrazione dei difetti reali.
2. Merge dei rami nel solo candidato, conservando entrambi i genitori e risolvendo le sovrapposizioni documentali senza scartare funzionalità.
3. Continuità tra pannelli: nessuna vista derivata mostrata come aggiornata dopo una conferma se contiene ancora una vecchia revisione; nessuna perdita di modifiche locali o retry incerto automatico.
4. Fixture con successione e difformità: fonte/pagina/citazione, persona storica distinta, identificativi discordanti, binding e conferma separati, readiness esplicita e nessuna bozza generabile.
5. Test frontend/backend pertinenti, DB/HTTP e browser desktop/375 su nuovi cluster protetti, poi arresto e verifica. Nessun riuso di collaudi scaduti o servizi reali.
6. Report, guida, commit selettivi, hash remoto verificato e PR draft verso il comune. Candidato revisionabile, nessun merge automatico nel comune o main.

## Avanzamento

Pianificazione registrata prima del codice; revisioni in corso. La PR78 non presenta blocker nel primo riesame statico indipendente. La PR77 ha già job/ledger/provider/API/UI testati con fixture: non vengono ricreati. È stato individuato un limite di continuità: le viste sorelle di revisione/confronto/finding/preparazione richiedono attualmente ricariche manuali dopo una mutazione; miglioramento circoscritto da progettare conservando bozze e richieste incerte.
