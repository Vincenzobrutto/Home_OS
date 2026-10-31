# Dimora Agenzie — checkpoint del nucleo documentale

30 ottobre 2026, aggiornamento 07:30 UTC / 08:30 Europe/Rome. Termine autorizzato: 08:00 UTC / 09:00 Europe/Rome. Non è un rilascio. Tutti i requisiti commerciali restano ipotesi da validare con un’agenzia reale.

## Stato proprio verificato

Snapshot codice `c64aa69265b880d85ee35f198147a96c0dd21738`, branch `codex/agenzie-fascicolo-20261030`, base consolidata `dd52a6a`. Pubblicato e hash remoto verificato. Le modifiche concorrenti ancora locali del cablaggio navigazione sono preservate ed escluse da questo checkpoint: non presumere che il checkout originale rappresenti questo snapshot.

| Area | Stato del checkpoint | Report |
|---|---|---|
| Dominio, assegnazioni, fonti e versioni | Implementato, store persistente e contratti offline | [Pratiche](agency-practices-v1.md) |
| Originali dedicati e rasterizzazione | Implementato, storage locale separato e worker PDF/PNG limitato | [File](agency-files-v1.md), [renderer](agency-renderer-v1.md) |
| Proposte, conferme, correzioni e prove | Implementato nel dominio/store; estrazione AI atti non collegata | [Worklog](agency-worklog-20261030.md) |
| Quesiti, successione e difformità | Registro persistente e route nel modulo opt-in, niente UI o certificazione | [Finding](agency-findings-v1.md) |
| Planimetrie e superficie | Pipeline, ledger/worker/provider port, API opt-in e workspace con form; niente AI reale o navigazione completa nel checkpoint | [Integrazione](agency-plan-integration-v1.md), [worker](agency-plan-worker-v1.md), [trasporto](agency-plan-transport-v1.md), [workspace](agency-plan-workspace-v1.md) |
| Dati per incarico | Funzione pura interna, solo binding espliciti e valori confermati; nessuna generazione documento | [Pacchetto](agency-mandate-packet-v1.md) |

## Evidenze da tenere distinte

- Backend: regressione 519/519 con i primi dieci casi nuovi del pacchetto; dopo, aggiunti solo tre test e profilo finding/pacchetto finale 26/26 verde. Build e lint mirato verdi; nessun codice cambiato dopo la regressione.
- DB: ultimo profilo finding/HTTP 31/31 sul checkpoint e3f8b6f ricontrollato in worktree pulito, cluster posseduto `dimora-offline-qZjmlY` fermato. Precedente piani/worker/HTTP 34/34, anch’esso su cluster fermato. Non sommare profili sovrapposti.
- Frontend: editor/client/workspace 26/26, typecheck e lint verdi; browser desktop/375 su harness sintetico, non collaudo browser contro API reale né telefono fisico.
- Nessuna prova autorizza una nuova AI reale. Esperimento sul PDF personale separato e concluso, riserva prudenziale di 4 EUR già impegnata, originali/immagini/geometrie reali fuori Git.

## Sequenza del prossimo ciclo

1. Verificare separatamente il cablaggio concorrente e la sua provenienza prima di includerlo. Percorso reale pratica/upload/assegnazione, API/sessione/CSRF e zero fallback sintetici. Non fare merge automatici.
2. Implementare lettura degli atti con contratto e prove di estrazione, consenso/budget dedicati e citazioni verificabili. Distinguere persone storiche, soggetti attuali e unità; nessuna identità o titolarità dedotta dalla sola somiglianza del nome.
3. Esporre quesiti e risposte nel fascicolo; mantenere privacy, storico e riapertura al cambio delle prove. Nuovi fatti richiedono nuovi confronti finché non è progettato il retarget/versionamento dei quesiti.
4. Acquisire un modello incarico realmente usato dall’agenzia, autorizzato e anonimizzato. Definire identità/recapiti/date, unità e decorrenza durata, struttura provvigioni. Solo dopo: readiness completo, mapping approvato, persistenza del pacchetto e anteprima sul modello.
5. Completare disegno di nuovi vani/vuoti, campioni sintetici/poi autorizzati diversi e criteri commerciali approvati. Prima del pilot, operatività storage/worker e recupero esiti incerti espliciti.

## Condizioni verificabili per il primo pilot

- Il tester entra in una pratica assegnata e non vede file privati di altri agenti, neppure da admin o tramite derivati.
- Un originale ricevuto è recuperabile con SHA server-side; sostituirlo invalida fatti, misure e decisioni dipendenti; conflitti non sovrascrivono il lavoro.
- I dati estratti restano proposte finché confermati; origine, pagina e versione sono consultabili. Un dato mancante non viene inventato.
- Scala della barra e geometrie sono controllabili; vani e perimetro lordo non vengono sommati due volte; coefficienti incerti e muri non classificati lasciano il totale incompleto.
- Un export richiede permesso aggiornato; un incarico non è generabile senza modello/mapping approvati. “Nessun problema visibile” non significa conforme o completo.
- Storage con quote/scansione/gestione orfani, provisioning agenzia e procedure operative concordati. Provider/scheduler attivabili solo tramite configurazione e autorizzazione distinta; retry incerti non automatici.

Demo Alessio, consolidamento e main invariati. Nessun deploy, merge o servizio esistente toccato. Worktree e log di verifica conservati; niente reset/clean/rimozioni di checkout.
