# H1 — activities-v1: attività personali e scadenze

13 ottobre 2026. **Backend e schema H1 implementati e verificati nel database dedicato; dieci endpoint attivi sul servizio locale 3001. Frontend e collaudo browser ancora da integrare.** M1–M4 sono la baseline locale verificata. H1 è il primo sottoincremento di Home utile: il numero M4 è stato usato per Anthropic e non implica che tutta la Home della roadmap originaria sia già costruita. Agenzie, Amministratori, spese, ricerca e vendita seguono separatamente.

Riferimenti prodotto: DIMORA_V5_MASTER.md, regola M-11 (offline non completa modifiche); DIMORA_HOME_UX_CONSOLIDATED §4 (promemoria utente distinto dagli obblighi, completamento dichiarato, storia); decisioni V5 su privacy, AI e contesti. Codex mantiene questo contratto; Claude scrive solo frontend-v5.

## Perimetro e comportamento

Creazione manuale → attività aperta → modifica titolo/descrizione/data/collegamento → completamento esplicito → storia persistente. Annullare conserva il record e la storia; riaprire è esplicito. Nessuna eliminazione fisica in H1.

Attività **personale al creatore**, in una Home autorizzata, con eventuale collegamento alla propria caldaia M3/M4. Anche una scheda provvisoria può avere un promemoria manuale: non diventa un obbligo né conferma i dati tecnici. Non copiare campi della caldaia nelle attività. Nessuna attività automatica nasce da upload, analisi o conferma. Non cambiare BoilerAsset.confirmed, stato, versione o cronologia tecnica completando un promemoria.

UI: «Promemoria personale», «Data scelta da te» e «Completata da te». Non usare «manutenzione certificata», «obbligo assolto» o «impianto regolare». Attività personali e verifiche AI sono sezioni diverse: completare un'attività non chiude proposte; confermare una proposta non completa attività.

Fuori H1: ricorrenze, allegati al completamento, calendario alternativo, assegnazione ad altri, condivisione, attività condominiali, notifiche/email/push, normativa, AI/OCR, costi, ricerca globale e vendita. Sono sottoincrementi successivi, non elementi finti nell'interfaccia.

## Identità, permessi e collegamenti

- Cookie/sessione, X-Account-Context, Origin/CSRF e no-store come identity-v1.1; UUID e input strettamente validati.
- Lettura: membership valida della Home e activity.accountId uguale al richiedente. Owner non legge attività private altrui. Viewer legge soltanto le proprie attività già esistenti; non scrive.
- Creare/modificare/completare/annullare/riaprire richiede edit. Revoca/scadenza o URL di altro account/Home: 403 generico, senza titolo/nota/conteggio privato. Riattivare una sessione o creare un'altra Home non recupera diritti.
- assetId in scrittura richiede una BoilerAsset della stessa Home/persona leggibile secondo M3/M4, fonti incluse. ID altrui: 403. Nessun trasferimento/matching automatico. Rimuovere il collegamento richiede assetId:null esplicito.
- Se il collegamento perde accessibilità, l'attività manuale personale resta leggibile e modificabile con i propri diritti Home. Restituire assetLink.state=unavailable, senza ID/nome dell'asset. Non cancellare automaticamente il riferimento interno. Nei cambi storici un asset non accessibile è redatto; nessun nome/ID sensibile trapela.
- List, summary e history filtrano prima di conteggiare/proiettare dati. Per storia valgono diritti sulla stessa attività; eventuali riferimenti asset vengono riletti e redatti. Replay idempotente ricontrolla sessione/membership/edit/identità e i riferimenti presenti nella risposta salvata; se non sono più autorizzati restituisce 403, mai lo snapshot privato precedente.

## Date e stati

dueDate è una **data di calendario**, YYYY-MM-DD valida con anno 0001–9999, oppure null. Non è un timestamp UTC. Una data passata è ammessa per un promemoria arretrato. H1 usa timeZone='Europe/Rome', scelta esplicita temporanea; non dipende dal fuso del PC/server. Per altre aree servirà una scelta di prodotto, senza reinterpretare le date salvate.

Timestamp di creazione/modifica/completamento/annullamento e storia: ISO UTC del server. completedAt registra quando l'utente ha dichiarato il completamento, non la data certificata di un intervento. Nessuna retrodatazione in H1; una nota può descrivere il lavoro.

today e dueState vengono dal server e sono coerenti con asOf nella stessa risposta. Il frontend formatta dueDate come data, senza spostarla mediante conversione UTC. Al focus/refresh invalida letture temporali; non inventa uno stato con l'orologio del dispositivo.

| Stato | Azioni consentite | dueState |
|---|---|---|
| open | Modifica, completa, annulla | overdue se dueDate<today; today se uguale; upcoming se futura; undated se null |
| completed | Consulta, riapri | closed |
| cancelled | Consulta, riapri | closed |

Modifica solo su open. Riaprire conserva dueDate/titolo/descrizione/collegamento, azzera i timestamp correnti di chiusura e mantiene gli eventi storici; una data passata torna scaduta. Completare o annullare non genera altre attività né cambia la data. Note di azione facoltative, massimo 500 code point. Ogni cambiamento effettivo incrementa version una sola volta e crea un evento atomico. Un edit identico validato è un no-op, senza nuova versione/evento.

## Tipi pubblici

```ts
type ActivityState = 'open' | 'completed' | 'cancelled';
type DueState = 'overdue' | 'today' | 'upcoming' | 'undated' | 'closed';
type AssetLink =
  | { state: 'none'; asset: null }
  | { state: 'linked'; asset: { id: string; name: string } }
  | { state: 'unavailable'; asset: null };
type HomeActivity = {
  id: string; homeId: string; title: string; description: string | null;
  dueDate: string | null; state: ActivityState; dueState: DueState;
  assetLink: AssetLink; version: number; origin: 'user_created';
  createdAt: string; updatedAt: string; completedAt: string | null;
  cancelledAt: string | null; permissions: Array<'read' | 'edit'>;
};
type TemporalContext = { asOf: string; today: string; timeZone: 'Europe/Rome' };
type ActivityCapabilities = TemporalContext & {
  apiVersion: 'activities-v1'; enabled: true; isSimulation: false;
  limits: { titleMaxCodePoints: 120; descriptionMaxCodePoints: 2000;
    noteMaxCodePoints: 500; soonDays: 7; maxHomePreviewItems: 3 };
};
type CreateActivity = { title: string; description?: string | null;
  dueDate?: string | null; assetId?: string | null };
type UpdateActivity = { expectedVersion: number; title?: string;
  description?: string | null; dueDate?: string | null; assetId?: string | null };
type ActivityAction = { expectedVersion: number; note?: string };
type ActivityHistoryEvent = {
  id: string; activityId: string; at: string;
  kind: 'created' | 'updated' | 'completed' | 'cancelled' | 'reopened';
  origin: 'explicit_user'; note: string | null;
  before: ActivityHistorySnapshot | null; after: ActivityHistorySnapshot;
};
type ActivityHistorySnapshot = { title: string; description: string | null;
  dueDate: string | null; state: ActivityState; assetLink: AssetLink };
```

description assente/null/vuota → null. Titolo trim/NFC, 1–120 code point; descrizione trim/NFC fino a 2000; nota trim/NFC fino a 500, vuota assente. Codici e valori fidati (state, version, origin, owner, timestamps, dueState) non accettati dal client. expectedVersion intero positivo obbligatorio; update deve contenere almeno un campo modificabile. Omissione di un campo conserva il valore; null azzera solo quelli nullable. Nessun nuovo import o dipendenza richiesto.

## Endpoint implementati

Base /api/v5; tutti sotto /homes/:homeId. Ogni POST richiede Idempotency-Key (stesso formato M3, ambito account/Home/operazione/target) e CSRF/Origin. Il client invia X-Account-Context catturato per tutte le richieste; il server lo verifica secondo identity-v1.1 (facoltativo soltanto per compatibilità di trasporto). Non usare PATCH/DELETE nascosti per aggirare l'idempotenza.

| Metodo/percorso | Body/query | Risposta |
|---|---|---|
| GET /activity-capabilities | Nessuna | 200 ActivityCapabilities, dopo autorizzazione Home |
| GET /activities | Filtri/paginazione sotto | 200 TemporalContext + {items:HomeActivity[],nextCursor:string|null} |
| POST /activities | CreateActivity | 201 TemporalContext + {activity:HomeActivity} |
| GET /activities/:id | Nessuna | 200 TemporalContext + {activity:HomeActivity} |
| POST /activities/:id/updates | UpdateActivity | 200 TemporalContext + {activity:HomeActivity} |
| POST /activities/:id/complete | ActivityAction | 200 TemporalContext + {activity:HomeActivity} |
| POST /activities/:id/cancel | ActivityAction | 200 TemporalContext + {activity:HomeActivity} |
| POST /activities/:id/reopen | ActivityAction | 200 TemporalContext + {activity:HomeActivity} |
| GET /activities/:id/history | limit,cursor | 200 {items:ActivityHistoryEvent[],nextCursor:string|null} |
| GET /activity-summary | Nessuna | 200 TemporalContext + {counts:{overdue:number,today:number,upcoming:number,undated:number},nextItems:HomeActivity[]} |

Summary conta tutte le attività personali open autorizzate. upcoming conta tutte quelle future, non solo i sette giorni. nextItems contiene al massimo tre attività datate: arretrate, oggi o entro today+7 giorni inclusi; le non datate non occupano l'anteprima. Se vuota, dire «Nessuna scadenza nei prossimi 7 giorni» ed eventualmente indicare N attività senza data, con link alla lista. Non nascondere un errore come zero attività.

Lista: state=open|completed|cancelled|all, default open; due=all|overdue|today|upcoming|undated, default all; assetId UUID facoltativo; limit 1–50 default 20; cursor opaco. due diverso da all ammesso solo con state=open. assetId filtro richiede accesso asset M3/M4; non è un modo di cercare ID altrui. Parametri sconosciuti/non validi → 422.

Ordine open: dueDate crescente con null in fondo, poi createdAt decrescente e id crescente. All: prima open con tale ordine, poi completed per completedAt decrescente/id crescente, poi cancelled per cancelledAt decrescente/id crescente. History: at decrescente/id decrescente. Cursor vincolato ad account/Home/risorsa/filtri/ordinamento; non al limit. Cursor di altra casa/account/filtro → 422. Nessun duplicato/salto in dataset invariato; non promettere snapshot immutabile mentre attività cambiano. Dopo mutazioni rileggere lista/summary/storia.

Creazione, mutazione, evento e richiesta idempotente nella stessa transazione; concorrenza protetta da versione/lock. Replay stessa chiave/payload normalizzato autorizzato restituisce lo snapshot originale prima dei controlli versione/stato: non incrementa versione né duplica eventi. Dopo replay il client invalida e rilegge lo stato attuale. Chiave con altro payload → 409 idempotency_conflict. Dopo esito di rete ambiguo conservare la chiave e offrire riprova esplicita; payload bloccato fino a risoluzione oppure rilettura autorizzata. Nessun POST retry automatico/ottimistico.

Errori: 401 UNAUTHENTICATED o account_context_changed; 403 FORBIDDEN generico come V5 corrente; 409 idempotency_conflict/activity_version_conflict/invalid_activity_state; 422 validation_error con fieldErrors quando disponibili; 503 activity_unavailable o SERVICE_UNAVAILABLE. Il backend estende la classificazione 422 del filtro alle sole rotte H1, conservando identity-v1.1 e M2/M3/M4. Due utenti/tabs stessa versione: una sola mutazione, altra 409 con invito a rileggere. Nessun successo parziale.

## UX di integrazione

- Navigazione principale Casa/Attività/Documenti/Spese invariata. Casa: nuova regione «Le tue scadenze» con stato temporale, titolo, data scelta da te e link dettaglio; crea attività disponibile anche con zero dati.
- Attività: «Da fare»/attività personali, filtro Aperte/Completate/Annullate e filtri scadenza; regioni M3/M4 «Da rivedere», analisi e schede conservate. Due azioni distinte «Nuova attività» e «Nuova analisi».
- Rotte nuove: /home/:homeId/attivita/:activityId. Creazione: ?nuova-attivita=1 e assetId facoltativo per precompilare da scheda; non sostituire analizza/scheda della M4. Attività attiva anche nel dettaglio.
- Scheda caldaia: «Crea promemoria per questa caldaia». La destinazione Home/asset è visibile e verificata; non inferire durata legale da marca/potenza.
- Form personale: titolo, descrizione facoltativa, data facoltativa, collegamento facoltativo. Nessuna categoria «normativo». Conservare bozze solo in memoria; cambio account/Home le svuota.
- Dettaglio: stato, testo, data, collegamento leggibile, modifica se open/edit; completa rapida con nota facoltativa; annulla con conferma reversibile; riapri esplicito; storia di questa attività separata dalla storia tecnica della caldaia.
- Endpoint assente/404/503: sezione personale non attiva o errore con riprova, nessun fallback demo. M3/M4 continuano a funzionare. Empty/loading/errore distinti; filtri con zero risultati diversi da zero attività nella Home.
- Offline/errore: nessun completamento o cambio data apparente; conserva bozza e permette riprova. Cache almeno account/Home/activity/filtri; abort al logout/cambio contesto, risposte tardive non ripopolano un altro account.
- 320/390/desktop, focus visibile, etichette accessibili, Escape/ritorno focus nei dialoghi. Nessuna dichiarazione di conformità WCAG.

## Schema previsto e criteri di uscita

Entità HomeActivity (accountId/homeId/assetId nullable, campi/stato/versione/date), ActivityHistory (actor/origin/note/snapshot prima-dopo), ActivityRequest (idempotenza account/Home/operation/target/key/digest/response). Migrazione 202610130005_activities applicata soltanto a dimora_v5_product_dev, FK Restrict sui record personali e riferimenti; rimuovere collegamento non elimina asset. Nessun riuso Issue Genesis/report condominiale. dueDate è una stringa calendario validata, distinta dai timestamp; origin è imposto dal servizio, non un input client. Lo snapshot storico interno conserva assetId; la proiezione pubblica lo rilegge e redige dinamicamente.

Scenari minimi per backend/API/client/browser, con clock controllabile per prove di dominio:

1. Casa senza attività: anteprima vuota, creazione disponibile.
2. Crea senza data; stessa chiave/body concorrenti producono una sola attività/evento.
3. Crea collegata a caldaia provvisoria: nessuna proposta confermata o scadenza normativa.
4. Account B, altra Home, viewer e revoca/scadenza: letture/scritture negazioni coerenti; owner non supera privacy.
5. Date reali, bisestili e invalide (2028-02-29 valida, 2026-02-29/04-31 invalide), Unicode ai limiti, campi sconosciuti.
6. ieri/oggi/domani/+7/+8/senza data: summary e ordine coerenti, confine inclusivo +7.
7. Cambio data cancella il vecchio stato temporale senza completare.
8. Completa: una versione/evento, aperte e preview si aggiornano; reload/login conserva stato/storia.
9. Riprova dopo risposta persa: niente doppia storia; chiave diversa su stato già chiuso → 409.
10. Due mutazioni stessa versione: una sola vince; edit no-op senza evento.
11. Annulla e riapri: dato/storia conservati, dueDate passata torna scaduta; completata riaperta conserva storia passata.
12. Collegamento altro account/Home rifiutato; collegamento divenuto illeggibile redatto, attività manuale conservata.
13. Paginazione invariata senza duplicati, filtri e cursor legati al contesto, limit variabile ammesso.
14. Summary non conta attività altrui; all/chiuse non alterano il conteggio delle verifiche AI.
15. Offline, 403, 409, 503, doppio click e cambio account/Home durante richiesta: nessun successo finto o cache altrui.
16. Mezzanotte Roma e cambio ora legale: data scelta invariata, stato coerente alla prossima lettura/focus.
17. M1–M4 restano verdi; creazione/completamento attività non tocca AI/ledger, documenti o campi caldaia.
18. UI reale tastiera/mobile/desktop: crea → modifica → completa → storia → riapri; test backend/API/DB e client reali prima di dichiarare H1 finita.

Test live Anthropic disabilitati: H1 non ne ha bisogno. Nessuna nuova installazione di sistema o modifica DB reali. Codex integra prima il backend e poi i commit frontend, verifica sul database dedicato e produce il resoconto finale; mock e contratto da soli non chiudono H1.
