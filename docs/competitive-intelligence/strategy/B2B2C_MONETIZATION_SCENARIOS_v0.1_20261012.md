# Dimora — Monetizzazione B2C / Partner Gift / Ibrido v0.1
**Data:** 2026-10-12 · **Stato:** working model; numeri tutti **ipotesi illustrative**, nessuna fee approvata e nessun abbonamento Premium implementato. **Non modifica roadmap/ADR/backlog.**
**Scopo:** capire se il partner può essere contemporaneamente distributore e payer, senza perdere il valore autonomo e il controllo owner dei dati.

## Fonti e limiti
- Benchmark HomeZada (Copilot, Gemini e Red Team Claude v1.1 PR #2): HomeZada pubblica listino PRO Transfer/Gift **$99/immobile** con anno Premium, Share **$49/immobile/anno** secondo prezzi pubblicati e informazioni discordanti in FAQ. **Prezzi pubblicati ≠ vendite reali o prezzi sostenibili in Italia**.
- PR #3 agenzie: N1 fascicolo venditore altamente presidiato (ImmoDoc, Faloosa, Gestim); nessuna WTP misurata.
- Condominiums red team: amministratori come payer per software autonomo debole. Un **gift owner** è una nuova ipotesi, da valutare a parte.
- ADR #77: Renovation+Financing resta wedge prioritario registrato; Transaction Readiness non è stato riaperto.
- `docs/mvp-v1.md`: alpha owner, senza Partner Gift, account transfer, dashboard partner, referral tracking, pagamenti Premium o trial commerciale.

## Tre scenari distinti
| Scenario | Ricavo immediato | Ricavo differito | Rischio centrale |
|---|---|---|---|
| **A. B2C puro** | €0 su attivazione gratuita | subscription Premium pagata dall'owner | CAC e valore ricorrente per l'owner non validati |
| **B. Gift B2B2C** | fee per owner/immobile regalato pagata dal partner (fee concordata, non necessariamente tutti gli inviti) | eventuale rinnovo owner solo se previsto contrattualmente | pochi partner paganti; costo di servire un anno > fee |
| **C. Ibrido B2B2C** | fee iniziale pagata dal partner | premium renewal/cross-sell owner, eventualmente referral commission | conversione e churn bassi; partner percepisce doppio pagamento |

**Distinzione cruciale:** un vero Gift include una prestazione pagata dal partner, non una semplice registrazione gratuita. Se Dimora incassa per lead o invito, è un modello diverso, da non chiamare Gift.

## Formula contribution margin per coorte (no falsa precisione)
Variabili:
- N_partner = numero partner attivi; eligible_per_partner = clienti idonei/anno; invite_rate = quota effettivamente invitata; activation_rate = owner che completano primo valore.
- gift_purchase_rate = quota inviti trasformata in Gift **pagato** dal partner.
- P_gift_net = fee Gift al netto delle imposte indirette; VC_gift = AI/hosting/supporto/onboarding variabile durante il periodo incluso; partner_acquisition_cost = CAC di acquisizione e servicing dei partner.
- renewal_rate = percentuale owner Gift che rinnova **pagando davvero**; P_owner_net = primo canone owner netto; VC_owner = costo variabile per owner pagante; commission_rate = quota eventuale del ricavo owner riconosciuta al partner; processing/refunds dedotti.
- B2C baseline: signup_rate, free_activation_rate, paid_conversion_rate, CAC_owner.

**Gift volume** = N_partner × eligible_per_partner × invite_rate × gift_purchase_rate.
**Gift CM** = Gift volume × (P_gift_net − VC_gift) − partner_acquisition_cost.
**Owner renewal CM** = Gift volume × activation_rate × renewal_rate × (P_owner_net − VC_owner − commissione − fee transazionali).
**Hybrid total** = Gift CM + Owner renewal CM.
**B2C pure CM** = owner_new × activation_rate × paid_conversion_rate × (P_owner_net − VC_owner − payment fees) − consumer acquisition cost.

Attenzione: separare **buyer della Gift fee** (agency vs studio vs impresa) da chi può autorizzare e sostenere la spesa. Per amministratori: lo studio che regala a propri costi ≠ condominio che delibera una spesa. Non presupporre libera utilizzabilità dei dati condominiali.

## Esempio puramente illustrativo: stessa coorte di 100 immobili Gift
**Non è un business plan e non sono previsioni.** Scegliere parametri per capire sensitività, non per promettere ricavi.
- 100 Gift venduti dal partner, fee €39 netti ciascuno = **€3.900 incasso Gift**.
- Costo variabile complessivo per Gift per periodo incluso €12 = **€1.200**, contribution iniziale **€2.700**, *prima* di CAC/operations partner e costi fissi.
- Owner che attiva concretamente: 50% → 50.
- Owner che paga il rinnovo al termine: **20% degli attivati** → 10 paganti (cioè 10% dei Gift).
- Premium €49 netti/anno; costo variabile €10/pagante; eventuale commissione partner 15% sul primo rinnovo (€7,35/pagante) → contribution da rinnovo = 10 × (€49 − €10 − €7,35) = **€316,50** prima di fee di pagamento e altri costi.
- Totale contribution illustrativa €3.016,50 **prima di CAC, costi fissi, imposte sul reddito, supporto partner, pagamenti e overhead**.
**Controesempio:** se €39 fee Gift e costo variabile/onboarding €45 per Gift, ogni Gift genera −€6 prima della chance di rinnovo; dipende da activation e conversion.

## Sensitivity principale da verificare
1. Prezzo Gift effettivamente pagabile dal buyer italiano: proporre tre *ancore solo in intervista* (€19 / €39 / €69 per immobile) senza suggerire che siano listino o WTP. Fissare un prezzo reale solo dopo incontro e impegno.
2. Costo pieno di onboarding per partner/owner; limite di documenti e uso AI inclusi; supporto nel primo anno.
3. Renewal net a 12 mesi; nelle prime fasi usare proxy comportamentali 7/30/90 giorni, non confonderli con retention annuale.
4. Commissione referral solo su owner ricavo netto effettivo, dopo termini, cancellazioni, refund e compatibilità normativa per la categoria.
5. Brand del partner vs indipendenza owner: nessun accesso automatico del partner a dati domestici; chiarire il rapporto alla conclusione del gift.
6. Aggiungere costi del servizio realmente richiesto al partner (checklist, onboarding assistito, report), non trattarlo come gratis.

## Proposte per canale (da verificare)
- **Agenzie:** un Gift per proprietario al rogito o nell'acquisizione mandato; bisogno di benefit che non sia già Faloosa/ImmoDoc; misurare clienti serviti realmente; distinguere buyer venditore vs acquirente e transfer non implementato.
- **Amministratori:** gift per tutti i condòmini potenzialmente costoso; considerare solo opt-in, piccoli batch e budget/ruolo del payer. Referral o gift sponsorizzato per evento utile (inizio gestione, manutenzione impianti, documenti del fabbricato). Nessun accesso automatico a documenti comuni.
- **Installatori / imprese:** gift associato a intervento/riqualificazione con garanzie e rapportini caricati; può essere pagato come elemento del servizio; testare se vantaggio è reale prima di costruire.
- **Professionisti regolamentati (incl. notai):** non assumere legittimità di commissioni commerciali; verifica specifica con consulente e comunicazione trasparente.

## Interviste Phase 0
6 partner totali (3 agenzie, 3 amministratori), più un confronto opzionale con 2 manutentori. Presentare 3 opzioni senza guidare:
1. Invito gratuito + eventuale commissione owner premium;
2. Gift pagato dal partner, periodo premium incluso;
3. Ibrido Gift iniziale + rinnovo owner pagato, eventuale commissione.
Chiedere per ultimi 3 clienti: chi ha interesse, chi paga il servizio aggiuntivo, momento, prezzo accettabile con prova (LOI o acquisto pilota), lavoro richiesto, chi tiene relazione/brand, condizioni per non aderire. Non usare domande del tipo “Pagheresti €39?” come unico segnale: cercare un impegno concreto.
**Output:** commitments + misure funnel owner alpha → proposta di un mini-pilota Gift se tecnicamente/legalmente pronto.

## Gates
**GO to paid test**: almeno 2 partner dello stesso canale accettano un prezzo o una proposta vincolante su piccoli lotti; costo marginale preliminare sotto prezzo; percorso owner legale e UX senza accessi automatici.
**HOLD:** entusiasmo ma zero pagamenti, beneficio partner vago, owner alpha non torna, o prezzo comprensibile solo con grande lavoro umano.
**NO GO:** fee non copre costo variabile di consegna e servizio; nessun buyer pagante; restrizioni legali/disclosure inconciliabili.
Tutte le soglie sono regole decisionali proposte, non evidenze.

## Cose da NON fare prima del test
Nessun listino pubblico €29/49, né commissione approvata, né promesse Gift live. Nessun aggiornamento al codice MVP, B39 transfer, gestionali o roadmap prima di decisione utente.
