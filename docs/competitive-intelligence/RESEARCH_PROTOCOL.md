# Protocollo comune — Competitive Intelligence
Versione: 2026-10-12

## Architettura
**A1 Home & PropTech**, **A3 Agenzie**, **A4 Amministratori** producono analisi verticali autonome, con benchmark e massimo 3 raccomandazioni motivate per settore. **A2 Strategy Integrator** riceve gli output dei tre: NON ripete lo scouting, verifica sinergie/conflitti e formula una proposta cross-segment. Nessun agente approva la roadmap da solo.

## Ricerca, memoria e qualità
Consultare in primo luogo `PROJECT_CONTEXT.md` e documenti interni pertinenti; recuperare, se disponibili, analisi e conversazioni precedenti. Cercare fonti online fresche e primarie: sito prodotto, pricing, help, API docs, termini, recensioni, demo, registri e fonti legali. Per ogni claim: URL, data consultazione, eventuale data pubblicazione, piano/versione e segmento. Differenziare `[V]` verificato, `[I]` inferenza, `[S]` stima con ipotesi, `[ND]` sconosciuto. **Non trovato non significa assente**; distinguere disponibile/beta/annunciato/dismesso. Informazione fornita dal vendor ≠ prova indipendente di efficacia.

## Formato dossier individuale
1. Executive profile, target, buyer e utilizzatore.
2. Jobs-to-be-done, proposta di valore e occasioni d'uso.
3. Inventario funzionalità granulare con input, flusso, output, tier, evidenza.
4. UX, onboarding, attivazione, retention.
5. Tecnologia, API, integrazioni, privacy e limiti documentati.
6. Prezzi, distribuzione, incentivi intermediari e business model.
7. Traction e prove di mercato.
8. Vantaggi, difendibilità, limiti e costi di adozione.
9. Implicazioni per Dimora e red team.
10. Fonti, lacune e quesiti di validazione.

## Matrice funzionalità CSV
Campi: `feature_id,domain,feature,description,competitor,target,buyer,status,tier,evidence,source_url,checked_at,notes`.
Stati: `available,partial,announced,beta,explicitly_absent,unknown,discontinued`. ID stabile e vocabolario coerente tra dossier.

## Matrice opportunità CSV
Campi: `opportunity_id,agent,channel,problem,buyer,user,when_triggered,current_alternative,competitor_overlap,proposed_wedge,owner_value,channel_value,distribution_model,evidence,strength_of_evidence,complexity,risk,kpi,validation_experiment,recommendation_status`.
Stato raccomandazione: `adopt_candidate,validate,reject`; mai `approved` senza decisione umana.

## Check competitivi
Individuare incumbent e feature equivalenti; il wedge deve essere **complementare ai gestionali**, avere incentivo di adozione, non imporre doppio caricamento, creare valore durevole per proprietario e poter essere validato rapidamente. Distinguere congetture dal proof of willingness-to-pay.

## Consegna e revisione
Organizzazione suggerita: `competitors/<vendor>/report.md`, `features.csv`, `sources.md`; `channels/agencies/`, `channels/condominiums/`, `benchmark/`, `strategy/`. Ogni esecuzione aggiorna changelog, ipotesi mutate e punti aperti. Conservare la tracciabilità fino alla fonte originaria. A2 segnala incongruenze e restituisce agli agenti richieste di approfondimento invece di colmare i vuoti inventando.