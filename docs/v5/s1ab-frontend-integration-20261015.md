# S1a/b — integrazione frontend e verifica reale

15 ottobre 2026, Codex. Integrazione effettuata su `dev/dimora-v5-local-20261013`, nessun push o modifica a main.

## Consegna raccolta

Claude `c7f145b` e `1e2ae0e` raccolti come `0dd5f71` e `30b3f23`. Escluso il commit di sincronizzazione `0e56168`, già rappresentato nel master. Checkout Claude lasciato invariato; preservato il suo file estraneo `docs/v5/backend-status.md` e tutto il dirty legacy/rootdocs del master.

Operativi Spese/Panoramica con anello, famiglie, viste, filtri, manuale, dettaglio/storia, lavori e accesso dal catalogo oggetti. Riferimento di consegna e limiti: `frontend-v5/docs/S1AB-FRONTEND-CONSEGNA-20261014.md`.

## Prove ripetute da Codex

- Frontend integrato: build e lint passati. Suite completa mock/fixtures: 24 file, 267 test verdi; log `outputs/Dimora-V5-S1ab-frontend-test.log` nel workspace padre.
- Corretto un difetto osservato durante il percorso reale: il ritorno dal costo appena creato conservava `nuova-spesa=1` e riapriva un modulo vuoto. Lo stato di ritorno ora deriva dai soli filtri/vista. Esteso il test manuale al ritorno senza modulo; 17 test Spese verdi, log `outputs/Dimora-V5-S1ab-frontend-regressione.log`. Build/lint ripetuti dopo la correzione, verdi. L'avviso bundle di circa 677 kB resta aperto.
- Browser con frontend Vite reale 5174, proxy API reale 3001 e PostgreSQL V5 dedicato 55432. Usata sessione locale sintetica già presente, account Prova M4, Casa M4; nessun backend mock.
- I tre costi preesistenti restano leggibili e valgono complessivamente 60 centesimi, senza riclassificazione automatica.
- Creato lavoro sintetico `Collaudo S1 · bagno sintetico`; la pagina accetta l'intervallo 0001-01-01/oggi e mostra storia e totale, risolvendo il dubbio della consegna Claude.
- Registrato costo `Rubinetteria · collaudo S1 sintetico`, 24000 centesimi, 15 ottobre 2026, categoria repairs_works e lavoro collegato. Famiglia dal server Lavori e acquisti. Totale lavoro 24000, dashboard 24060 centesimi e quattro record. Legenda apre elenco filtrato e ritorna alla Panoramica. Persistenza verificata dopo ricaricamento.
- Archivio costo: stato/storia aggiornati, dashboard torna a 60 centesimi/tre record dopo la rilettura. Ripristino: costo attivo e dashboard 24060/quattro. Il breve riuso della cache durante la rilettura non è stato scambiato per risultato finale.
- Verifica DB separata di sola lettura: un solo record, importo 24000, lavoro corretto, active, versione 3, tre eventi. Script nel workspace `outputs/Dimora-V5-S1ab-verifica-persistenza.cjs`, protetto dal controllo del DB dedicato. Record sintetici lasciati navigabili.
- Responsive: nessun overflow orizzontale a 390 e 320 px; viewport ripristinato. Console browser senza errori al termine del percorso. Screenshot in outputs: `Dimora-V5-S1ab-integrazione-reale.png`, `Dimora-V5-S1ab-integrazione-mobile-320.png`, `Dimora-V5-S1ab-dashboard-reale.png`.

Le interazioni browser sono passate da controlli UI reali. Il campo date nativo non si compilava con fill dell'automazione: completato tramite tastiera/click, senza iniettare stato applicativo. Non è stata attribuita questa limitazione dello strumento al prodotto.

## Ambito ancora aperto

S1a/b integrato e percorso principale verificato; non è un collaudo esaustivo di tutte le combinazioni. Privacy/CAS/retry coperti dalle suite indicate e dai test backend precedenti, non nuovamente tutti riprodotti in browser oggi. Non dichiarata conformità WCAG.

S1c frontend ancora assente: nessuna UI job/bozza/candidati/conferma. Backend fixture disponibile solo sui due PDF sintetici, Anthropic economico disabilitato. Nessuna chiamata AI, spesa, modifica di sicurezza o database legacy. Riepilogo Casa e costi nel documento restano sulle proiezioni H3a dello stesso registro; non presentano ancora categorie/famiglie. Non esiste un endpoint di classifica globale per oggetto/lavoro: le rispettive viste usano il gruppo selezionato e summary server.

Prossimo passo: UI S1c con fonti/candidati/conferma/accantonamento, prima su fixture dichiarata; attivazione provider reale resta lavoro separato. Nessun nuovo incarico è stato inviato a Claude in questa sessione.
