# Chiusura del collaudo offline — piano ed esiti

Incarico del 24 ottobre: completare in autonomia la parte offline del piano e consegnare esito e azioni del committente. Branch proprio `codex/diagnosi-protocollo-20261024`, base consolidata `112ad05`, PR #21 senza merge. La registrazione di estensione precede qualunque nuova modifica dei test.

## Piano operativo

1. Ricontrollare fonti diagnostiche disponibili senza leggere il corpo degli errori. Preparare un dossier tecnico senza originali o messaggi liberi; nessun invio al supporto.
2. Correggere soltanto difetti riprodotti, preservando gold/validazioni e isolando eventuali modifiche runtime in un lotto proprio. La mancanza del corpo del 400 è un limite, non una prova di colpa del PDF o dello schema.
3. Verificare offline caffè, Samsung e acconto/saldo: identità/varianti, importi e spedizione, ruoli delle date, oggetti/stanza suggerita e ricaricamenti. Non trasformare fixture o risposte già salvate in nuove estrazioni reali.
4. Eseguire build/lint/test pertinenti, aggregato HTTP/DB con runner e cluster temporaneo nuovo, poi frontend typecheck/lint/build e intera suite mock. Un solo cluster DB per volta.
5. Ripercorrere la UI soltanto con mock dichiarati e servizi locali isolati, senza API/DB/storage reali o AI. Preservare il collaudo Roma e i servizi esistenti.
6. Chiudere report/stato, commit, push verificato e PR. Consegnare evidenze e lista di azioni utente. Main e Claude esclusi, niente reset/clean/force o rimozioni di worktree.

## Passaggi esterni alla chiusura offline

- Merge delle PR: decisione del committente, non autorizzato dal lavoro autonomo.
- Nuova AI: serve un consenso specifico successivo; le due prenotazioni Samsung incerte restano conservate. Nessun preflight o tentativo aggiuntivo.
- Conferme di oggetti/spese nella casa Roma: non autorizzate. La bozza caffè resta da rivedere, compreso il codice completo mancante.
- Supporto provider: preparare soltanto il dossier, non contattare nessuno senza incarico pertinente.

## Esiti

In corso: registrazione del piano. I risultati saranno inseriti dopo le rispettive esecuzioni, distinguendo offline e remoto non verificato.
