# Dimora — Tesi di distribuzione B2B2C tramite intermediari v0.1
**Data:** 2026-10-12. **Stato:** ipotesi strategica da testare. **Fonte della correzione:** indicazione esplicita dell'utente: sfruttare agenzie, amministratori e altri come **canali di distribuzione** di Dimora al proprietario, offrendo strumenti utili ai partner e possibili fee per abbonamenti owner a pagamento.
**Non modifica** ADR, roadmap, backlog, codice o le PR esterne.

## Errore analitico da correggere
I red team A3/A4/BAI esaminano soprattutto amministratore/agenzia come buyer che paga un software di workflow. Esito negativo su buyer B2B **non falsifica** automaticamente la strategia di un partner **distributor, non-payer** che usa uno strumento gratuito o leggero e origina proprietari di Dimora. La nuova ipotesi va validata con unit economics di canale e attivazione owner. Non confondere:
- END USER: proprietario; possiede il proprio fascicolo e decide accessi.
- DISTRIBUTOR: agenzia, amministratore, manutentore, assicuratore, provider ecc.; introduce il prodotto.
- PAYER: proprietario premium, impresa sponsor, soggetto professionale per servizi specifici. Sono possibili più flussi separati.
- SERVICE USER: partner che riceve una specifica utilità operativa, non necessariamente un gestionale completo.
- REFERRAL PARTNER: remunera solo conversione qualificata dopo termini trasparenti, con consenso e verifica compliance.

## Hypothesis map e ruoli
| Partner | Trigger per presentare Dimora | Partner utility minimale | Owner value iniziale | Monetizzazione ipotetica | Ostacoli |
|---|---|---|---|---|---|
| Agenzia immobiliare | mandato di vendita / rogito / post-rogito | checklist documentale limitata + scheda consegna; NON due diligence certificata | inizio fascicolo casa + documenti utili | paid owner conversion + eventuale service fee | effort agente, concorrenti ImmoDoc/Faloosa, ADR #77, trasferimento non implementato |
| Amministratore condominiale | onboarding condòmino / comunicazione annuale / intervento comune | export riepilogo attrezzature comuni rilevanti + reminder/documenti pubblicabili; NON nuovo gestionale | memory casa e parti comuni selezionate | owner premium share; eventuale fee per attivazione qualificata | basso incentivo ad inviare, consensi dati, ruolo del condominio, rischio spam |
| Installatore/manutentore | consegna lavoro o manutenzione annuale | scheda asset e intervento, documenti raccolti una volta | garanzia, storico, manutenzioni | owner premium / partner service value / white-label | need access permission e doppio lavoro, no B2B UI |
| Impresa ristrutturatrice | fine lavori / consegna impianti e certificazioni | handover dossier di lavori | record completo post-lavori | fee per fascicolo o attivazione e conversione premium | volume episodico, ownership documenti |
| Altri: notai, assicuratori, lender, utility | momenti di servizio verificati | differenziazione coerente con il lavoro e compliance | onboarding contestualizzato | co-marketing, sponsorizzazione, conversione | procurement, conflitti interessi, distorsioni incentivazione |

## Modelli economici alternativi
**M1 Referral rev-share:** partner riceve € X o y% *solo* sulle transazioni owner premium pagate e attribuite, dopo finestra di maturazione e al netto di rimborsi; niente accesso partner ai dati di casa per default.
**M2 Subscription sponsor:** partner finanzia un periodo premium per proprietario (modello 'gift') e valorizza retention del rapporto; chi paga è partner, richiede beneficio dimostrato.
**M3 Freemium + partner utility:** tool leggero partner gratuito in cambio di inviti consenzienti; Dimora monetizza owner paid. Costi di free accounts/onboarding devono stare sotto LTV attesa.
**M4 Partner B2B add-on:** il partner compra output professionale *solo* se dimostra ROI; questa è una strategia distinta e non prerequisito della distribuzione.

## Unit economics — formule, non dati
Per 100 clienti raggiungibili dal partner: invited = 100×contactable×invitation_rate; activated = invited×signup_rate×first_value_rate; paying = activated×paid_conversion_rate.
Gross contribution per paying owner = net subscription revenue − variable service/AI/support cost − refunds − partner commission − processing.
Channel margin = paying owners × contribution − incremental partner enablement − onboarding/referral tracking cost.
KPI: inviti/partner/mese, activation e primo documento, ritorno a 7/30/90 giorni, paid conversion, churn, gross margin/LTV/CAC, tasso di reclami e opt-out, satisfaction professionista, ore partner per onboarded paying owner.
**Nessuna percentuale o importo commissionale approvati.**

## Wedge di distribuzione e 'partner utility'
Non implementare un mini-Danea/mini-Gestim per guadagnare un referral! L'utilità partner deve essere:
- adiacente a una pratica che deve già eseguire;
- visibile prima della conversione premium;
- utilizzabile in meno lavoro che il fallback oggi;
- basata sullo stesso owner-controlled property record, no silos parallelo;
- facile da distribuire con opt-in e senza dati privati automatici.

## Test comparabile fra canali (nessun sviluppo)
Per ciascun canale considerare 3–5 partner, 1 use case e un mockup/fascicolo manuale. Intervistare su ultimi tre workflow e mostrare due proposte: (A) tool gratuito/beneficio professionista + invito al cliente con potenziale referral payout; (B) dossier cliente brandizzato/sponsorizzato senza commissione. Chiedere disponibilità a **distribuire davvero**, su quanti casi e perché; verificare se l'endorsement potrebbe essere ostacolato da privacy o regole professionali. Eseguire solo con consenso e contatti reali quando legale e owner alpha pronti.
Misurare la funnel: partner→invito→account→first document→ritorno→premium paid. Il click o 'interesse' non sono successi. Se zero premium conversion, nessuna commissione finanziabile; non promettere prezzo fisso senza unit economics.
Sottoporre a consulente legale un modello contrattuale/disclosure per fee, trasparenza endorsement, data processing e conflitti per categorie regolamentate (notai/intermediari qualificati), oltre alle regole per inviti e marketing.

## Decisioni e esperimenti
1. Mantenere la private alpha owner come prerequisito: se non si completa e riusa il fascicolo, la distribuzione amplifica un problema di prodotto.
2. Intervistare 3 agenzie e 3 studi amministrazione sul **modello partner non-payer**; alternative sponsor/referral; nessun software nuovo.
3. Comparare a 3 operatori di installazione/manutenzione e una rete lavori.
4. Non confondere l'esito del red team BAI (NO GO software per amministratori) con esito canale distributor (ancora **NON TESTATO**).
5. Portare i risultati alla revisione B2B2C e, se necessario, chiedere esplicita revisione ADR #77; oggi non alterarla.

## Important open questions
- Il momento migliore per distribuire alla fine o all'inizio del workflow?
- Il professionista trova vantaggio sufficientemente forte a promuovere Dimora anche senza fee?
- L'utente vuole conservare il fascicolo quando cambia professionista?
- Possiamo tracciare attribuzione partner senza monitorare contenuti o accessi domestici?
- Quale premium owner userà e pagherà dopo la prova gratuita, e quando?
- Quanto costano account freemium e supporto?
- Chi può legalmente proporre/essere remunerato per tali referral? Richiede verifica contestuale e disclosure.
