# Fatture: riferimento all’impianto, acconto e saldo — 21 ottobre 2026

## Causa verificata

Il percorso `houseExpenses` conserva un costo complessivo per una fattura che può descrivere più oggetti. `HouseExpenseProposal` inviava sempre `objectRef:null`; `houseChoices` rifiutava un riferimento esplicito e `houseCost` imponeva nuovamente null. Il collegamento documento–oggetto non costituisce attribuzione economica: replicare il totale su ogni componente avrebbe duplicato i costi.

## Comportamento implementato

- Per Fattura/Ricevuta (`simple_invoice`), il modulo della spesa offre «Oggetto o impianto (facoltativo)», con oggetti esistenti attivi del catalogo personale della casa e paginazione. Non richiede una nuova scheda. Senza collegamento resta ammesso; «Conserva solo il documento» resta invariato.
- Se la bozza contiene esattamente un oggetto attivo già confermato, il riferimento è preselezionato in modo visibile e modificabile. Una scelta salvata, anche vuota, prevale. Non si deduce un riferimento da nomi simili, dal fornitore o da proposte non confermate; con più riferimenti sceglie l’utente. Non è un’associazione automatica generalizzata dell’archivio né una regola memorizzata per fornitore.
- Un riferimento selezionato viene riletto e deve essere disponibile prima della conferma. Errori non diventano una rimozione silenziosa. Il server usa `EconomyPolicy` nella transazione canonica: account/casa, fonte leggibile e stato attivo, link, storico e ricevuta idempotente. Il controllo viene ripetuto anche per il pending ripristinato. `workId` resta escluso da questo percorso.
- Per spese non bolletta: «Questa spesa è» → importo unico/acconto/saldo, nel modulo fattura e nel modulo ordinario di creazione/modifica. La scelta conserva `Acconto · ` o `Saldo · ` nel normale titolo ricercabile. Il riepilogo distingue una nuova scheda dal riferimento a un impianto esistente.
- È una convenzione di titolo esplicita, senza nuova colonna o migrazione. Non è un piano rate, una riconciliazione, un pagamento verificato o un calcolo automatico del residuo. Il saldo deve riportare solo il residuo, senza risommare gli acconti; il modulo lo ricorda.
- Ogni documento di acconto/saldo può creare una spesa distinta sullo stesso impianto. Non viene copiato l’intero importo sugli altri componenti della fattura. Deduplica per fonte/SHA, controllo di spese simili, versione e idempotenza restano operativi. `automatic-plan.ts` resta prudente: il costo complessivo automatico non viene assegnato arbitrariamente a un componente.

## Correzione reale autorizzata

Aggiornata tramite UI la spesa già esistente di 1.537,20 €: stesso ID, importo, data, fornitore, fattura e origine dell’importo. Aggiunto il riferimento alla scheda esistente e il prefisso Saldo. Rinominata quella stessa scheda da «quadro elettrico» a «Impianto elettrico», come riferimento dell’intero intervento; nessuna nuova scheda e nessuna nuova spesa. La fattura dell’acconto non è ancora stata caricata né registrata. Nessun invio AI effettuato.

## Verifiche e limiti

- 33 test frontend mirati: modulo bolletta invariato, riferimento esplicito e indisponibile, preselezione solo confermata, scelta vuota salvata, cambio acconto/saldo, esclusione senza campi nascosti, riepilogo e revisione/bozze.
- 54 test backend offline: parser, acconto/saldo con documenti e chiavi distinti sullo stesso riferimento, fonte già registrata bloccata, policy account/casa/leggibilità/stato, bozze e regressioni estrazione/economia. Nessuna suite DB eseguita sul database personale.
- Build frontend/backend e lint mirato; API locale V5 riavviata, session endpoint HTTP 200.
- Browser: scheda e dettaglio della spesa reali, modifica aperta e annullata per verificare «Il saldo» e riferimento esistente. Collaudo del modulo fattura desktop/mobile con importi fittizi in memoria e payload esplicito; non costituisce una seconda registrazione reale. Evidenze locali in `outputs/electrical-installments-20261021/` della chat, fuori dal repository.

Quando arriva l’acconto: caricare il documento, compilare la spesa, scegliere «Un acconto» e lo stesso «Impianto elettrico», controllare solo l’importo di quella fattura e confermare. La nuova spesa comparirà con il saldo nei costi dell’impianto.
