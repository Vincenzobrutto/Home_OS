# G1 — arbitrato UX e avvio tecnico

14 ottobre 2026. Claude27514fa raccolto via bundle e integrato come8d52b8f. Report documentale, senza browser/test; non è prova di difetti riprodotti. Fonte frontend-v5/docs/ECONOMIA-G1-UX-REVIEW-20261014.md. Codex definisce home-objects-api-contract.md e prime validazioni dominio; G1 non attiva.

| Rilievo | Decisione Codex |
|---|---|
| K1 collegamenti solo caldaia | Gap del nuovo scope, non bug H3a. G1 reference links canonici; preservare assetId nativo, non riusarlo per generic UUID. Creazione costo e link due POST con recupero esplicito. |
| K2 visibilità | Ambienti Home condivisi owner/member edit e viewer read; oggetti/posizioni personali fino a C1. Evita condivisione involontaria da note e fonti private. Shared physical identity futura richiede policy/consenso, non fusione per nome. |
| K3 caldaia | Catalogo unificato discriminato object/boiler; boiler originale una sola riga, posizione satellite, technicalLink. Nessuna copia/wrapper implicita o migrazione delle conferme. |
| K4 nomi | Accolta Impegni per S2 e Prossimi impegni per Home. H1 scadenze distinto. |
| K5 anno | Accolta anno corrente coerente nella nuova S1; Tutti gli anni esplicito. H3a runtime invariato fino a contratto S1. |
| K6 multiambiente | Oggetti unici, filtri deduplicati, nessun totale monetario per ambiente. |
| K7 focus H1 | Osservazione codice già in backlog, non bug riprodotto. Riprodurre prima del pilota; G1 deve prevedere focus stabile dopo azioni/versioni. |
| K8 picker | Accolta ricerca server nome oggetti q/type e H2 documenti, paging autorizzato. Niente ricerca sul primo elenco soltanto. |
| K9 conteggi | Solo risorse autorizzate; nessun messaggio/contatore basato su dati privati altrui. Oggetto privato altrui non visibile in G1. |
| K10 lavori multioggetto | Interventi strutturati in S1, non G1. Primo link costo un oggetto principale. Vista lavori condivisi solo quando modello/contratto esistono, nessun mezzo costo inventato. |

Precisazione sul wireframe Claude: il totale storico H3a non deve cambiare significato in silenzio. S1 distingue costi gestione/lavori e finanziamento e rende esplicito ciò che ogni totale comprende; non si rimuovono vecchi record dal totale annuale senza versione contrattuale dichiarata. Semplice presenza di dati anno precedente non prova completezza del confronto: finestre identiche, dati registrati e copertura nota dichiarati.

Validazioni iniziali: create/update ambienti/oggetti, posizione multiambiente/CAS0 e query limitate. Build/lint completo backend e quattro scenari dominio verdi; dopo l'aggiunta finale q/type build, lint mirato e gli stessi quattro scenari di nuovo verdi. Aggiunti al runner offline ordinario; non rieseguita suite completa in assenza di modifiche runtime precedenti. Nessuna tabella/migrazione/endpoint/G1 frontend attivi, nessun test DB o browser G1 dichiarato. Prossimo: schema G1a e servizio/api con lock Home oltre account; poi G1b links e verifica reale. Contratto G1 v1 congelato in questa consegna, incarico frontend con sync SHA separato.
