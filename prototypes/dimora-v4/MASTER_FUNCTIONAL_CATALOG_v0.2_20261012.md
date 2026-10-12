# Dimora — Master Functional Catalog v0.2

> **Decisioni aggiornate al 13 ottobre 2026:** il riferimento approvato per UX, ambito delle tre esperienze, monetizzazione e prototipo è [Dimora — Decisioni consolidate post AI Review v1.0](DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md). In caso di contrasto, prevale il consolidato; questo catalogo conserva lo storico delle decisioni precedenti.


**Data:** 12 ottobre 2026. **Branch:** prototipo. **Stato:** consolidamento del concept, non implementazione.

## 1. Scopo e stato

Questo documento integra le 20 decisioni Home, le 16 decisioni Agenzie e le 25 decisioni Amministratori raccolte il 12 ottobre 2026. Il questionario del collega non è più un prerequisito: eventuali feedback futuri saranno valutati come nuove proposte, non applicati automaticamente. È un catalogo di **visione funzionale**, non una specifica di sviluppo né un listino approvato.

## 2. Architettura concettuale dei prodotti

| Esperienza | Centro di gravità | Cosa NON sostituisce |
|---|---|---|
| **Dimora Home** | Memoria digitale della singola abitazione, sotto controllo del proprietario | Banca, broker, marketplace manutentori, certificatore |
| **Partner Agenzie** | Fascicolo documentale dall'incarico e dossier interattivo fino a Gift Home | CRM e piattaforme di annunci |
| **Partner Amministratori** | Memoria tecnica dell'edificio e pubblicazione selettiva verso le unità | Contabilità e gestionali condominiali |
| **Home Free/Pro** | Distribuzione Free permanente + Pro volontario, packaging da definire | Non bloccare consultazione, aggiornamento o export dei propri documenti in Free |

## 3. Capacità condivise: costruire una volta, adattare all'esperienza

| Dominio funzionale | Home | Agenzie | Amministratori | Regola di progettazione |
|---|---|---|---|---|
| Identità e inventario | Casa, stanze, asset | Immobile in incarico | Edificio, parti e impianti comuni | Modelli correlati ma non sinonimi; house vs pratica vs edificio |
| Documenti | Memoria attiva personale | Raccolta e verifica di completezza/coerenza | Completezza, non controllo sistematico di coerenza | Un'unica capacità documentale parametrizzata, autorizzazioni distinte |
| Ingestione AI | Foto, batch, email autorizzate | Batch e richieste con link | Batch, link, import da gestionali | AI propone, utente conferma; source tracking |
| Interventi | Storia completa | Ristrutturazioni/migliorie pertinenti | Storico B se non duplica gestionale, altrimenti A | Separare registro e gestione lavori |
| Manutenzioni | Proattive e territoriali | Evidenza di storico/impianti nel dossier | Piano suggerito dell'edificio | Regole normative citate, non certificazione |
| Q&A | Risposte con citazioni | Supporto bozze/contenuti con fonti | Risposte con citazioni | Riservatezza applicata prima del retrieval |
| Condivisione | Familiari e passaggio selettivo | Livelli progressivi acquirenti/professionisti | Comune vs unità vs studio | Nessun accesso implicito, revoca e audit |
| Export | Dati personali e handover selettivo | Dossier, Home precompilata | Passaggio amministratore, consegna strutturata | Export conforme a diritti, separazione fonti |
| Economic intelligence | Budget, mutui, costi, forecast, mercato | KPI documentali e marketing | KPI standard, analisi costi Premium | No duplicazioni contabilità o gestione mutui |
| Notifications | Proattive e personalizzate | Stato richieste e fascicoli | Scadenze tecniche | B18 esterne sospese: concept ≠ sviluppo |
| Multi-account | Proprietari e familiari | Team e reti multisede | Collaboratori studio | Isolamento organizzativo e per unità |

## 4. Home — decisioni consolidate

Le 20 decisioni e le loro condizioni restano la fonte dettagliata in `DIMORA_HOME_FUNCTIONAL_SCOPE_v0.1_20261012.md`. Sintesi: identità completa e inventario guidato; documenti e interventi; piano manutenzioni; consumi/forecast e investimenti; assistente proattivo e Q&A con fonti; contratti, mutui, assicurazioni e patrimonio; locazioni lato proprietario; familiari con permessi; parti comuni; notifiche; dossier assicurativo; guida recupero documenti; stime di mercato indicative; multi-immobile e completamento contestuale.

**Packaging Home ancora da deliberare:** Free permanente con consultazione, aggiornamento ed export dei documenti propri; Pro con servizi avanzati ancora da definire. La tabella Free/Pro emersa in chat è un'ipotesi, non il confine di prodotto approvato.

## 5. Agenzie — 16 scelte funzionali

| ID | Decisione | Regola o confine |
|---|---|---|
| A1 | Il fascicolo nasce all'acquisizione dell'incarico | Si arricchisce durante la vendita |
| A2 | Raccolta guidata e checklist contestuale | Richieste proprietario, stati e lacune |
| A3 | Link dedicato senza account; A tradizionale quando necessario | Nessun proprietario costretto a registrarsi |
| A4 | Controllo documenti per completezza e coerenza | Non certifica regolarità urbanistica/catastale |
| A5 | Dossier interattivo per potenziali acquirenti | Non portale annunci |
| A6 | Accessi progressivi al dossier | Granularità per documento e autorizzazione |
| A7 | Dossier + Gift Home Free precompilata opzionale dopo vendita | Copia selettiva, no accesso agenzia permanente |
| A8 | Standalone predisposta all'integrazione CRM | Import/export/API da verificare |
| A9 | Portafoglio incarichi e collaboratori con account distinti | No CRM commerciale |
| A10 | Generazione di schede, annunci, brochure e risposte | Approvazione agente; pubblicazione portali non inclusa |
| A11 | Richieste mirate a professionisti con link; canali A alternativi | No gestione pratica professionale completa |
| A12 | Co-branding Dimora + agenzia | Non trasferisce titolarità dei dati |
| A13 | Consegna Home anche senza vendita se proprietario desidera; altrimenti archivio A | Il proprietario conserva i suoi diritti sui documenti |
| A14 | KPI operativi e utilizzo | No atribuzione causale a tempi di vendita |
| A15 | Singole agenzie e reti multisede | Ruoli e isolamento documentale |
| A16 | Pricing alternativo B abbonamento a piani / C per fascicolo | Prezzi e disponibilità a pagare NON convalidati |

**Precisioni A16.1–A16.5:** profilo immobile preliminare gratuito; tariffazione all'attivazione operativa; per tutta la durata dell'incarico, limiti ragionevoli di utilizzo; Base con raccolta guidata, AI essenziale, richieste e dossier base; controlli approfonditi/dossier evoluti/marketing e multisede come possibili Premium; regalo Home Free permanente incluso senza fee per invito/attivazione, costo incorporato in pricing agenzia; il proprietario può scegliere Home Pro. Canone e pay-per-fascicolo restano alternative, non sovrapposte per forza. Simulazioni numeriche viste in chat NON sono listino o tariffa approvata.

## 6. Amministratori — 25 scelte

La fonte dettagliata è `DIMORA_ADMIN_QUESTIONNAIRE_USER_20261012.md`. Principali precisazioni: M2 priorità memoria tecnica > documenti > comunicazione; M5 acquisizione AI massiva e integrazioni eventuali; M6 verifica completezza, non coerenza sistematica; M8 storico interventi B solo senza doppio inserimento, fallback A; M10 Home standard + portale condominiale opzionale per studi sprovvisti; M16 link senza account e canali tradizionali; M17 continuità dell'edificio condizionata a diritti/verifiche e export sempre previsto; M19 KPI B + analisi economiche C Premium; M20 prezzo per edificio attivo o piani a livelli, entrambi con Premium opzionali; M21 costo nasce all'attivazione operativa; M22 Free permanente incluso nel prezzo amministratore; M23 incentivi efficienza > qualità servizio > differenziazione e fee UT conversione Home Pro solo ipotesi; M24 demo memoria tecnica poi collegamento Home; M25 interviste studi medi > piccoli > grandi.

## 7. Packaging e monetizzazione — distinguere decisioni e ipotesi

| Elemento | Decisione attuale | Da validare |
|---|---|---|
| Home Free | Permanente, consultare/aggiornare/esportare propri documenti; Gift da partner senza costo per singola attivazione | Limiti sostenibili e dettagli di funzionalità |
| Home Pro | Upgrade pagante volontario | Quali funzioni pagate, willingness-to-pay, retention |
| Partner Agenzie | Base operativo; Premium; B abbonamento e C per fascicolo alternative; pagamento quando fascicolo operativo, copertura incarico | Prezzi, costi AI/storage, soglie e volumi |
| Partner Amministratori | Costo per edificio attivo o piano per studio; moduli Premium opzionali; ricorrenza annuale ipotizzata | Prezzi, costo per unità/attivazione, integrazioni |
| Fee referral | Ipotesi fee **una tantum** amministratore su upgrade Home Pro | Conflitti di interesse, obblighi di trasparenza, aspetti legali/fiscali, attribuzione e economics |
| Portale condominiale | Opzionale se amministratore non ha altro portale | Estensione e disponibilità a pagare |
| Comparatore energia/tecnici | Escluso dal perimetro attuale | Eventuali servizi hub documentale futuri separati |

## 8. Prototipo: esperienze dimostrative, non roadmap

**Da mostrare come storyline da validare, NON priorità tecniche:** (1) Proprietario riceve Home Free precompilata e continua a gestire la memoria; (2) Agenzia crea fascicolo all'incarico, richiede documenti, consulta incongruenze, condivide dossier progressivo e regala Home; (3) Amministratore crea memoria di edificio, associa impianti e scadenze, invita proprietari e distribuisce informazioni alle Home. Separare chiaramente funzioni reali da simulazioni, senza mostrare condivisione documenti sensibili come realmente autorizzata finché non esiste enforcement.

## 9. Decisioni da non dare per approvate

Nessun algoritmo affidabile di AVM, benchmark consumi, obblighi territoriali o incentivi può essere dato per disponibile senza dati e fonte verificati. Nessuna certificazione tecnica, catastale, urbanistica o legale. Nessun accesso professionale implicito. Notifiche esterne B18 restano in standby. Nessuna automazione di marketing verso il proprietario senza consenso. Nessun marketplace, dispatch o pagamento condominiale automatico. ADR #77 e backlog non modificati.

## 10. Prossimo ciclo

1. Verificare completezza e conflitti tra i tre prodotti e approvare questo master come riferimento del **concept**, non del codice.
2. Effettuare prioritizzazione delle **esperienze da prototipare** separata dal valore finale.
3. Definire packaging Free/Pro e pacchetti Partner, verificare economics e condizioni di accesso.
4. Consegnare al UX/Product specialist un brief di alternative di user journey, navigazione e rappresentazione dati, senza assumere che V4 sia il design finale.
5. Validare con utenti e partner; redigere specifiche tecniche e roadmap soltanto in seguito.
6. Eventuali feedback del collega verranno aggiunti a una lista cambiamenti candidati con motivo, impatto e decisione, non incorporati d'ufficio.

