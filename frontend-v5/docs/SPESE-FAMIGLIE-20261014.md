# Famiglie di spesa: decisione del committente — 14 ottobre 2026

Origine: proposta di Claude Code nella revisione UX della Home (`HOME-UX-AUDIT-20261014.md` e mockup `docs/proposta-ux/dimora-proposta-claude.html`), **approvata dal committente** il 14 ottobre 2026.

## Decisione

I raggruppamenti attuali (gestione / lavori e acquisti / finanziamento / non classificata) sono sostituiti da sei famiglie più «Non classificata».

| Famiglia | Categorie (codici esistenti, invariati) | Esempi |
|---|---|---|
| **Bollette** | `electricity`, `gas`, `water`, `internet_services` | Luce, gas, acqua, internet e telefono di casa |
| **Condominio** | `condominium_ordinary` | Rate condominiali ordinarie |
| **Tasse e assicurazioni** | `taxes`, `insurance` | IMU, TARI, polizza casa |
| **Manutenzione e riparazioni** | `maintenance`, `repairs_works` (vedi punto aperto 1) | Revisione caldaia, intervento idraulico |
| **Lavori e acquisti** | `condominium_extraordinary`, `purchase_replacement`, `repairs_works` (vedi punto aperto 1) | Rifacimento bagno, lavatrice nuova, facciata |
| **Mutuo e finanziamenti** | `financing` | Rate del mutuo, prestito per lavori |
| **Altro / Non classificata** | `other`, categoria assente | Ciò che non rientra; registrazioni senza categoria |

## Regole

1. **Le categorie non cambiano.** La famiglia resta un raggruppamento derivato, mai scritto dal client. Le spese già registrate non vanno riclassificate.
2. **Totale con e senza mutuo.**
   - Il totale generale continua a includere tutte le famiglie, incluso il mutuo, come da arbitrato S1-08.
   - Il Riepilogo mostra accanto il totale «senza mutuo e finanziamenti».
   - Si sommano solo le rate dichiarate: nessun calcolo di capitale o interessi.
3. **Polizza legata al mutuo.** Va in «Mutuo e finanziamenti»; la polizza casa ordinaria va in «Tasse e assicurazioni».
   - Con i codici attuali la distinzione non è derivabile. Va decisa insieme al punto aperto 2.
4. **Telefono.** Solo la linea di casa (internet e telefono fisso) va in Bollette. Il cellulare personale non è una spesa della casa.
5. **Ordine di presentazione.** Bollette, Condominio, Tasse e assicurazioni, Manutenzione e riparazioni, Lavori e acquisti, Mutuo e finanziamenti, Altro / Non classificata.

## Punti aperti per Codex

1. **`repairs_works` ricade in due famiglie.** La categoria «Riparazioni e lavori» oggi mescola un intervento puntuale e un lavoro. Due possibilità:
   - **(a) Regola derivata, senza modifiche alle categorie:** `repairs_works` collegata a un lavoro va in «Lavori e acquisti»; senza lavoro va in «Manutenzione e riparazioni». È deterministica, non richiede migrazione e usa il collegamento al lavoro già previsto.
   - **(b) Dividere la categoria** in `repairs` e `works`. È più chiara a lungo termine, ma richiede una decisione sulle registrazioni esistenti.

   Raccomandazione di Claude: **(a) per S1**, rivalutando (b) dopo l'uso reale.
2. **Polizza legata al mutuo** (regola 3). Due possibilità:
   - l'utente la classifica come `financing`, con un'etichetta di aiuto nel selettore («Assicurazione richiesta dal mutuo → Mutuo e finanziamenti»);
   - si aggiunge una categoria dedicata.

   Raccomandazione: la prima, senza nuove categorie.

## Documenti da aggiornare nel master

- **`docs/v5/s1-economic-history-spec.md`, riga 45:** raggruppamenti.
- **`docs/v5/economic-history-api-contract.md`, riga 17:** il raggruppamento derivato `management|works_purchases|financing|unclassified` diventa `utilities|condominium|taxes_insurance|maintenance_repairs|works_purchases|financing|unclassified`. I codici sono indicativi: li decide Codex.
- **Totali per famiglia nei riepiloghi S1,** più il totale senza finanziamento.
- **`docs/v5/s1-design-review.md`:** da annotare come aggiornamento di S1-08. Il totale generale resta invariato; cambia solo la suddivisione.

La modifica va fatta **prima di congelare il contratto S1**: i totali per famiglia sono calcolati dal backend.
