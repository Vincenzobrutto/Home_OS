# Memoria completa degli oggetti nella demo — 25 ottobre 2026

## Implementato

Schede ricche dei 16 oggetti e impianti della casa di esempio; pagina iniziale easy invariata. Riepilogo con prezzo acquisto, garanzia commerciale dimostrativa, ultimo intervento e prossimo promemoria. Sezioni apribili per acquisto/costi (fornitore, data, installazione), copertura/esclusioni della garanzia, manutenzioni con importi e stato pagamento, attività, identità/modello/matricola/caratteristiche, documenti e contatti utili. Fattura, certificato e rapporto di manutenzione sono facsimili consultabili dalla scheda. Sono esempi espliciti: nessuna garanzia legale, certificazione o scadenza normativa dedotta.

Gli interventi di esempio compaiono anche nelle spese della casa (16 registrazioni, una per oggetto). Il prezzo di acquisto resta distinto dal totale delle manutenzioni registrate e non implica pagamento. I facsimili aggiuntivi sono fonti dimostrative della scheda, non originali caricati nell’archivio reale. Il promemoria suggerito non è aggiunto alle attività finché l’utente non salva il modulo, già compilato con oggetto e data modificabili.

Le informazioni private vivono nell’oggetto della casa di esempio; le schede ricevute con Gift non ereditano costi, garanzie, manutenzioni, promemoria o contatti del venditore. Per una casa Gift i dati non ricevuti risultano da verificare/completare. Nessuna nuova operazione su runtime V5, AI, API o DB.

## Verificato

23/23 test: regressioni delle 31 viste e della Gift; completezza degli esempi, una sola manutenzione per oggetto, raccordo spese e mancato trasferimento dei dettagli privati. Browser locale su lavastoviglie e caldaia: riepilogo, fattura consultabile, ritorno alla scheda, aggiunta esplicita del promemoria con oggetto/data coerenti, dettagli tecnici e contatti. Screenshot desktop/mobile 390×844, nessun overflow orizzontale; viewport ripristinato. Nessun dispositivo fisico e nessuna prova esaustiva di ogni combinazione.

## Link e continuità

- Demo libera: https://dimora-esperienza-demo.vincenzo-b.chatgpt.site/#home/Casa
- Demo guidata invariata: https://dimora-percorso-guidato.vincenzo-b.chatgpt.site

Pubblicazione privata riuscita a e132ca838add0a6aacbfe030736840abc1510603, deployment appgdep_6addaabdf28c8191a13361f116fa7c4d. Scheda lavastoviglie verificata online con acquisto 650 EUR, manutenzione registrata 85 EUR, garanzia e prossima attività suggerita. Audience invariata. PR #25 verso il consolidamento, merge al committente. Prossimo passo: revisione dei dettagli dimostrativi da parte del committente; consegnare sempre entrambi i link.
