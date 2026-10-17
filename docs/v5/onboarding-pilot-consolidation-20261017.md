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
