# Onboarding V3 — consolidamento per uso pilota, 17 ottobre 2026

Base UI f82d507; integrazione finale registrata nel commit che contiene questo rapporto. Tre lacune contrattuali ora implementate: sostituzione esplicita di proposte sui valori confermati, quote manuali multiarticolo, vocabolario ordine/consegna/etichetta e raccordo dell'organizzazione alla bozza oggetti. Specifica V3 e contratti aggiornati. Nessuna migrazione/pacchetto o variazione di segreti, provider, sicurezza.

## Prove mirate

- Frontend: 65 casi distinti verdi sui cinque file modello, OnboardingPage, organization, IntakePage, DocumentIntakeAssistant. Prima esecuzione: 62 verdi, due aspettative intake riferite al vecchio flusso corrette; aggiunto terzo caso tipo riconosciuto dalla bozza, sei intake verdi. Ultimo passaggio modello+organization:13 verdi dopo i guard aggiuntivi. Coperti consenso replacement, payload osservato, quota vuota/consenso, recovery stessa chiave e preparazione documento prima dell'articolo.
- Backend offline:56 verdi nel primo gruppo (dominio, profilo, evidenze fattura, intake/classificatore); dopo nuova prova tipi ordini17 verdi sui due gruppi interessati. Dopo vincoli garanzia13 profilo verdi.
- DB/HTTP:20 verdi nella coppia integrazione+HTTP. Dopo gestione quote nella stessa transazione,16 verdi nel file integrazione, inclusa nuova prova conferma simultanea. DB verificato localhost:55432/dimora_v5_product_dev; dati sintetici con cleanup soltanto delle fixture. Trasporto AI e produttore stub, parser PDF reale. Prima prova simultanea ha rilevato fixture con struttura errata, corretta senza indebolire validazione.
- Build backend/frontend e lint frontend verdi. Ultimo launcher registrato ricompila backend e ripristina API. Health locale/LAN verificato separatamente.
- Browser reale: proposta sintetica già estratta, revisione/costo duplicato bloccato, nessuna conferma sui dati personali o nuove scritture browser. DOM mobile390: dialog clientWidth=scrollWidth=390; screenshot IAB in emulazione presenta scala di cattura incoerente, non usato come prova visiva definitiva del dispositivo. Viewport ripristinato. Screenshot desktop outputs/onboarding-v3-20261017/pilot-desktop-final.png.

## Avvio e limiti per i prossimi giorni

PC: http://127.0.0.1:5174/case. Telefono sulla rete attuale: http://192.168.1.66:5175/case. PC e servizi locali devono restare accesi. Il launcher LAN iniziale ha rilevato processo registrato sul vecchio indirizzo hotspot172.20.10.2; verificati PID/path/indirizzo registrati, arrestato soltanto quel Vite, riavviato sulla Wi-Fi attuale. Nessuna regola firewall o file .env cambiati.

Uso disponibile: caricamento singolo/multiplo, originali/filtri, organizzazione locale PDF testuali, proposta oggetti già estratta o compilazione manuale, collegamenti, costi/quote, rinvio e recupero. OCR/analisi nuove immagini richiedono provider esplicitamente abilitato con consenso e budget: adesso onboarding/receipt AI restano disabilitati. Nessuna chiamata AI/email/paid in questo consolidamento. Nessun prezzo/modello non leggibile inventato. Ricerca manuali limitata ai produttori/riferimenti già supportati. Quote di accessori sul medesimo oggetto/originale e quantitàmultiple si completano da Spese.

Nessuna nuova funzione avviata, nessun agente/automazione in background, nessun push. Dirty legacy/root docs preesistente preservato. I report precedenti descrivono lo stato precedente e sono superati per queste tre estensioni.

Feedback utile: documento/azione, risultato atteso, risultato osservato, screenshot; non occorrono nuovi audit prima dell'uso.


## Semplificazione Casa, ambienti e oggetti — 17 ottobre 2026

### Piano eseguito

1. Casa: intestazione e azioni rapide compatte; rimozione dei selettori di esperienze non disponibili; stati vuoti scadenze/verifiche ridotti; Ambienti e oggetti prima delle spese e delle condivisioni.
2. Ambiente: oggetti prima dei dettagli; dettagli e storia espandibili; nota assente non esposta come campo vuoto. Azioni e form esistenti conservati.
3. Oggetto: posizione collegata all’ambiente; tipo duplicato e nota vuota rimossi; acquisto noto dalla spesa canonica; profilo essenziale compatto e dati tecnici espandibili; storia espandibile. Documenti, manuale e costi precedono le azioni amministrative.
4. Collaudo: suite mirate, build/lint e percorso browser Casa → Cucina → oggetto senza scritture.

### Prezzo d’acquisto

Nuovo PurchaseSummary legge solo le spese attive purchase_replacement riferite all’oggetto. Intervallo esplicito 0001–9999 evita la selezione implicita del solo anno corrente. Mostra massimo due acquisti distinti con link al record canonico e rinvio all’elenco se presenti altri: nessuna somma arbitraria, selezione automatica di un presunto prezzo unico o copia del dato. Senza acquisto non mostra zero. Errore di lettura esplicito, nessun prezzo precedente mostrato come risultato valido. La fonte di verità resta Spese; nessun endpoint/schema nuovo.

### Verifiche

- 49 test router/profilo verdi (Casa, attività, oggetti, permessi, archiviazione e modifiche); 4 test nuovi per riepilogo acquisto e 1 test aggiuntivo per profilo compatto, tutti verdi. 54 casi distinti complessivi.
- Build produzione e lint frontend verdi; diff check pulito.
- Browser: macchina ghiaccio mostra 99,99 € del 13/06/2025 con link alla spesa esistente. Nessuna modifica di dati personali o chiamata AI.
- Mobile simulato 390×844: Ambienti e oggetti a y601 contro y1414 dell’audit; riduzione circa57%. Nessun overflow della Casa anche a320px. Stanza: oggetto subito nel primo pannello. Espansione di dettagli stanza e dati tecnici verificata.
- Screenshot ispezionati: outputs/casa-compatta-mobile-20261017.png, casa-compatta-desktop-20261017.png, ambiente-compatto-mobile-20261017.png, oggetto-compatto-mobile-20261017.png nel workspace.

Limiti: simulazione di viewport, nessun collaudo su telefono fisico né certificazione WCAG. Le attività reali, gli errori, le differenze del profilo e gli avvisi di fonte indisponibile restano espliciti; gli stati vuoti compatti si applicano solo dopo letture riuscite. Nessun deploy, reset, nuova analisi o modifica budget.
