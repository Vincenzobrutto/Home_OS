# Demo libera: esperienza semplice e casa da Home Gift — 24 ottobre 2026

## Implementato

La pagina Casa ha tre accessi diretti (Oggetti e impianti, Documenti, Attività), conteggi relativi alla casa aperta e elenco Le mie case. Le funzioni secondarie sono raccolte sotto Altre funzioni; tutte le 31 viste restano raggiungibili. Tolto l’avvio del vecchio tour interno dalla barra laterale: il percorso guidato resta su un sito separato.

Via Roma comprende 15 impianti e un elettrodomestico, 19 documenti e 9 ambienti. Aggiunti quadro elettrico, idrico, climatizzazione, riscaldamento a pavimento, ventilazione, fotovoltaico, accumulo, solare termico, addolcitore, antifurto, videocitofono, domotica, irrigazione e ricarica auto. Ogni nuova scheda ha fonte dimostrativa e ambiente, senza garanzie o scadenze dedotte.

La Gift dell’agenzia contiene un nome casa modificabile e una selezione di documenti e schede, raccolte in sezioni espandibili. Alla predisposizione viene creata una casa vuota non ancora disponibile al destinatario. L’accettazione la rende disponibile in Le mie case e la apre, con copie dei soli documenti e impianti selezionati, fonte/versione conservate. La casa precedente resta separata, senza trasferire spese, contatti o documenti personali. Accettare due volte non duplica casa o contenuti. La casa ricevuta non crea un nuovo fascicolo nel portafoglio dell’agenzia. Tornando al Partner si riapre il fascicolo di origine.

## Verificato

21/21 test: regressioni Home/Partner, 31 viste, nuova casa nascosta prima dell’accettazione, visibilità dopo accettazione, isolamento delle altre case, selezione completa 15 documenti/14 impianti, idempotenza e validità dei collegamenti fonte/ambiente. Browser locale: percorso completo Agenzia → Gift → accettazione → nuova casa disponibile; passaggio alla casa originale, ricerca Fotovoltaico e apertura manuale; screenshot desktop e mobile 390×844 senza overflow, menu mobile completo disponibile. Nessun dispositivo fisico provato.

Pubblicazione privata riuscita, audience invariata. SHA Sites 61c18324bb0e43156cdf8aab61cbc54fcb174985; deployment appgdep_6add0ee2758481919c3698b15f43503e. Pagina Casa verificata online con 16 schede e 19 documenti. Stato solo di sessione, refresh azzera la demo. Nessuna modifica a frontend/backend V5, AI, API, DB o dati reali.

## Link e continuità

- Demo libera aggiornata: https://dimora-esperienza-demo.vincenzo-b.chatgpt.site/#home/Casa
- Demo guidata invariata: https://dimora-percorso-guidato.vincenzo-b.chatgpt.site

Preferenza esplicita del committente: a ogni aggiornamento di una demo consegnare sempre i link di entrambe. La guidata resta a 49d730852ddafc233917035d8939417619ee5687. PR #25 verso il consolidamento; merge al committente. Prossimo passo: revisione del committente della casa Gift e del livello di semplificazione. Non è stata modificata l’app reale.
