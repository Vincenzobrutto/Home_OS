# Dimora V4 — sintesi Round 4 multi-agente e decision gates
**2026-10-12 | Ricerca e proposta di concept, non approvazione di sviluppo.**
Fonti: Gemini Round 4 product design (intake); Copilot workflow benchmark 17 pp. (intake); Claude PR #6 architecture assessment 88 kB, letto su branch `claude/round4-technical-architecture-20261012`. PR #5 red team economico.

## Giudizio integrato
**Concept:** Dimora Home unica (Mio immobile, Parti comuni autorizzate, documenti privati, asset/interventi/garanzie, handover selettivo). Partner Agenzie lavora sulla pratica documentale; Partner Amministratore alimenta selettivamente dati delle parti comuni; possibili in futuro installatori/tecnici. Non costruire gestionali paralleli. Funzionalità anche non originali possono avere valore se riducono tempi, passaggi e doppio lavoro verificati.
**Wedge di discovery prioritario:** Agenzia con pratica documentale `raccolta assistita → AI+conferma → readiness+fonti → export → proposta consegna Owner Home`, confrontando lavoro e risultato con concorrenti (ImmoDoc/Faloosa/Gestim) e processi reali.
**Modello economico:** A pagamento per pratica completata e C free Lite + Gift a consumo da confrontare in colloquio. B canone+Gift da rivalutare dopo evidenza di domanda ricorrente. Aumento WTP del Gift non dimostrato.
**Amministratori:** Non ignorarli come canale; test di preferenza e incentivo per la condivisione autorizzata di informazioni utili ai proprietari, ma evitare condo portal, contabilità, ticket, duplicazione Danea/Multidomus/Maintego.
**No roadmap/code changes**. ADR #77 resta scelta attuale; transaction readiness è ipotesi concorrente da verificare prima di qualunque decisione di rivederla.

## Architettura Claude PR #6 — aspetti che cambiano la decisione
1. Oggi Document obbliga `houseId`; una pratica non è una casa. Creare separazione `Practice` e `House` prima di usare file di terzi.
2. Access control alpha: ruoli dichiarati non applicati alle capability; verificare con test prima di invitare collaboratori; audit assente.
3. `House.ownerId` e lifecycle cancellazione incompatibili con pratica intestata al professionista che diventa proprietà dell'acquirente.
4. Storage locale e file per documento: copia selettiva deve copiare contenuto e provenienza, non condividere riferimenti al medesimo file senza refcount.
5. No automatic transfer; `copy-on-handover` con manifesto di documenti selezionati, restrizioni GDPR, conferma responsabile e accessi revocabili.
6. Email/token, segreti e backup/deploy: sicurezza e legal review bloccano prove con dati di terzi.
7. Architetture stimate da Claude [NON preventivi, ±50%]: A 24–38 person-weeks demo; B 59–91 person-weeks destination; C 123–186 person-weeks NO GO. B1a+B1b 47–73 person-weeks. Questi valori non vanno assunti come budget approvato.
8. Claude segnala possibili difetti alpha D1–D5 (identificatori, accesso per ruolo, identità e altri); **non ha eseguito test** e non li ha corretti. Richiede verifica tecnica e prioritizzazione separata; no claim exploit confermato.

## Proposta V4 — experience boundaries
**Partner Agenzia** (concept): (1) link upload guidato dal venditore, (2) AI e split-screen conferma, (3) readiness con stati documentali e fonte (NON conformità), (4) export indicizzato, (5) preparazione Gift e copia selettiva autorizzata.
**Partner Amministratore** (concept): (1) informazioni tecniche e documenti delle parti comuni senza doppio caricamento, (2) scadenze/contratti soltanto se incremento dimostrabile e verifica professionale, (3) pubblicazione selettiva per singola unità con autorizzazioni; nessun presupposto di diritto generalizzato o budget condominiale per Gift.
**Home proprietario**: Mio immobile; Parti comuni; privata; asset/interventi/garanzie/scadenze; provenienza dati; preparazione per futura vendita con copia selettiva, documenti personali esclusi di default, visualizzazione e consenso.
**Due UX da prototipare**: pratica agency readiness e stato del Gift; owner Home unico e review manifesto handover. Admin workflow lasciato mockup non-production fino a domanda.

## Discovery prima di sviluppare
- Interview 10 agenzie, 5 tecnici/installatori, 3 amministratori. Ultimi 3 casi reali, tempo di lavoro, doppio caricamento, tipo software e spesa, job professionale autonomo dal Gift.
- Mockup interattivi su dati inventati (non fondati su una produzione multi-tenant), documento esempio e output di dossier; prova prezzo per pratica contro Gift a consumo e, con utenti ad alta frequenza, canone.
- Richiedere veri **impegni economici** e incarichi specifici prima di erogare concierge. Non confondere deposito con conferma di ricavi già incassati.
- Solo con informativa, permessi, processo e parere legale fare test con dati reali di terzi. Prima validare alpha su dati volontari owner.
- Registrare owner activation 7/30/90 e decisioni di rinnovo effettive nel tempo. Non mettere rinnovi B2C ipotetici nel base case.

## Raccomandazioni non ancora approvate
1. Approvare esclusivamente **il concept V4 per interviste**, non il prodotto completo.
2. Chiedere audit tecnico focalizzato e test riproducibili dei problemi alpha segnalati da Claude prima di aprire inviti o link.
3. Eventuale pianificazione architetturale B (Practice separata, identity, roles, audit, storage, manifest handover) **solo dopo risultati commerciali e decisione esplicita**.
4. Tenere distinto il filone Building Asset Intelligence — NO GO development per ora, possibile tecnico/FM validatore esterno.

## Links
PR #6 https://github.com/Vincenzobrutto/Home_OS/pull/6
PR #5 https://github.com/Vincenzobrutto/Home_OS/pull/5
