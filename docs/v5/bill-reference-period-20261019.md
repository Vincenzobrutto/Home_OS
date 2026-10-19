# Bollette: periodo di riferimento — 19 ottobre 2026

Le categorie electricity/gas/water/internet_services sono attribuite al periodo competenceFrom–competenceTo, separato da documentDate (emissione), dueOn (scadenza) e spentOn (data registrata, senza attestazione di pagamento).

## Regola di aggregazione

Con entrambi gli estremi presenti, filtri, totali, confronti e paginazione economy usano competenceFrom. La bolletta è conteggiata una sola volta nel mese iniziale, anche se copre più mesi o attraversa un anno; nessuna ripartizione automatica dell'importo. Le altre spese mantengono spentOn. I documenti storici senza periodo mantengono il criterio precedente finché l'utente lo completa, con indicazione esplicita nell'elenco. Anche il riepilogo annuale Casa usa questo criterio.

## Compilazione e AI

Compilazione bolletta manuale/AI: emissione, scadenza, mese di riferimento e intervallo dal/al distinti. La creazione della bolletta richiede il periodo nell'interfaccia; i record storici incompleti rimangono modificabili senza forzare una correzione estranea alla modifica richiesta. Il piano automatico chiede revisione se manca il periodo.

Prompt onboarding v20 ed economico v2: leggere il periodo di fornitura separatamente dalle date del documento. Un singolo mese/anno esplicitamente stampato sotto un'etichetta di periodo è normalizzato ai suoi confini di calendario, non a una data fittizia di pagamento. La validazione accetta questi confini solo per competenceFrom/competenceTo; emissione e scadenza continuano a richiedere una data completa verificabile. Ambiguità e mesi multipli richiedono revisione, senza nuove assunzioni. Nessuna nuova chiamata AI live per questa modifica.

## SORGENIA e verifica

Aggiornata la registrazione esistente: 93,39 EUR invariati; riferimento 1–31 dicembre 2025; emissione/data registrata 17 gennaio 2026; scadenza 6 febbraio 2026. Una sola spesa collegata al documento, stesso ID, correzione nello storico; originale invariato.

Verifica del servizio contro il DB locale dedicato, in sola lettura: elenco e totale 2025 = una registrazione/9339 centesimi; 2026 = zero; dicembre 2025 = 9339; gennaio 2026 = zero. Browser desktop e mobile 390 px: mese dicembre 2025 ed emissione gennaio separati, nessun overflow. Nessuna migrazione, variazione di quote o alterazione delle tre differenze legacy locali.

Test mirati: economia, evidenze bollette, comprensione documenti, periodo di riferimento, piano automatico; frontend periodo, compilazione bollette e Spese. Build/typecheck e lint sui due moduli. Non è un collaudo di nuove risposte live del provider.
