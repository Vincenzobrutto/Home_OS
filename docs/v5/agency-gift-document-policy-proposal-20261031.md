# Gift: selezione dei documenti e continuità della casa

31 ottobre2026. **Proposta di policy di prodotto da validare con un'agenzia reale. Non implementata.** La distinzione ricevuto/prodotto esiste nel pacchetto interno;le categorie e i suggerimenti qui sotto non sono nuovi enum,regole automatiche o autorizzazioni attive.

## Regola di base

Il fascicolo della pratica contiene più cose del fascicolo della casa. La Gift è una selezione esplicita di documenti utili alla vita successiva della casa,compresi quelli prodotti dall'agenzia;non una copia integrale della pratica. Un documento finale,confermato o prodotto dall'agenzia non è per questo rilasciabile. Servono destinazione,destinatari,ambito di rilascio e verifiche correnti definiti nel [contratto](agency-gift-home-copy-contract-20261031.md).

Per la futura UI proporrei tre gruppi di revisione:documenti della casa candidati;documenti da valutare singolarmente;documenti interni esclusi dalla selezione suggerita. Nessuna preselezione basata solo sull'AI. Le proposte di categoria non determinano i permessi.

## Matrice proposta per la revisione dell'agente

| Documento | Origine possibile | Suggerimento iniziale,da validare | Controllo concreto prima del rilascio |
| --- | --- | --- | --- |
| Atto finale di acquisto/rogito | Ricevuto | Candidato casa | Versione finale effettiva,intestatari attuali,allegati e destinatari corretti |
| Atto storico di provenienza/successione/donazione | Ricevuto | Valutare singolarmente | Distinguere storia del titolo da acquisto attuale e dati di altre persone;non creare destinatari dall'estrazione |
| Planimetria catastale | Ricevuto | Candidato casa | Fonte/data/versione;non equivale a conformità o stato reale |
| Visura catastale | Ricevuto | Candidato casa | Data e ambito;può essere superata e non dimostra da sola titolarità attuale |
| Ispezione ipotecaria e allegati | Ricevuto | Valutare singolarmente | Ambito soggetti/immobili,versione e dati di terzi;nessuna attestazione automatica di assenza di gravami |
| APE | Ricevuto | Candidato casa | Documento effettivo e unità corretta;le date estratte restano da verificare |
| Titoli edilizi/pratiche e relativi elaborati | Ricevuto | Candidato casa | Unità/interventi pertinenti,allegati e limiti;assenza di un titolo non si colma con una scheda AI |
| Relazione del tecnico su difformità o regolarizzazione | Ricevuto | Candidato casa se rilasciabile | Autore,versione,ambito e stato;non trasformare la nota dell'agente in una relazione professionale |
| Documenti impianti,manuali e garanzie | Ricevuto | Candidato casa | Collegamento a impianto/oggetto corretto,date e contenuti;nessuna scadenza inventata |
| Prospetto superfici con geometrie e metodo | Prodotto dall'agenzia | Candidato casa dopo revisione | Fonte/versione/perimetro,coefficienti,qualifica stima e caveat mantenuti;non diventa misura certificata |
| Scheda riepilogativa della casa con fonti | Prodotto dall'agenzia | Candidato casa dopo revisione | Dati selezionati espliciti,fonti leggibili,distinzione dichiarato/estratto/confermato;questioni aperte non nascoste |
| Verbale di consegna casa/chiavi | Prodotto o ricevuto | Candidato casa se finale e pertinente | Parti/versione/stato effettivi;non includere registro interno dei movimenti chiavi |
| Report marketing,foto/rendering/annuncio | Prodotto o ricevuto | Valutare singolarmente | Utilità futura,diritti/consensi e distinzione rendering/stato reale;ritiro portali è attività della pratica |
| Proposta,controproposta,preliminare | Prodotto o ricevuto | Valutare singolarmente | Versione accettata effettiva e dati negoziali/di altre parti;mai ultima bozza per sola data file |
| Incarico di mediazione/provvigioni/fatture agenzia | Prodotto o ricevuto | Valutare singolarmente,non candidato automatico | Pertinenza al destinatario e dati economici;generazione incarico su modello validato resta assente |
| AML,identità,controlli interni,rischi,lead e fogli visita | Ricevuto o prodotto | Interni,esclusi dalla selezione suggerita | Non passano nella Gift perché collegati alla pratica;eventuali eccezioni richiedono percorso distinto validato |
| Bozze,annotazioni interne,output AI non adottati | Prodotto | Esclusi dalla selezione suggerita | Nessuna promozione a documento finale per il solo fatto di essere stati generati |

Questa matrice non è un parere sulla validità dei documenti né una regola normativa. È la proposta del prodotto su cosa mettere davanti all'agente per una scelta controllata. Eventuali oscuramenti o versioni destinate al rilascio devono essere espliciti,con nuova identità/hash e rapporto con l'originale:non esiste oggi uno strumento di anonimizzazione automatica da promettere.

## Dal documento alla scheda del proprietario

La futura scheda deve separare il documento ricevuto dal valore usato dall'utente. Per esempio:prospetto commerciale stimato con metodo A4presunto → documento immutabile ricevuto;superficie dichiarata nella scheda casa → dato da adottare separatamente,senza cancellare la qualifica o sovrascrivere un valore già inserito dal proprietario. Stesso principio per date,impianti e promemoria.

Una scheda riassuntiva creata dall'agenzia può avere fonte propria e riferimenti agli originali selezionati. Se un originale non è rilasciabile,non bisogna aggirare il divieto copiandone testo/dati nella scheda. Per i destinatari non mostrare titoli o conteggi di documenti esclusi o privati altrui.

La futura vista proprietario deve spiegare:che cosa ho ricevuto,da chi/in quale versione,che cosa resta da verificare,che cosa posso aggiungere. La mancanza di un documento significa non presente nella selezione ricevuta,non inesistente o non dovuto. Promemoria attivati dall'utente,dati AI o scadenze non verificati non diventano attività reali automaticamente.

## Esempio sintetico SUC-DEMO-001

Pratica da successione con difformità interna:il pacchetto di esempio può contenere il prospetto superfici stimato e un documento ricevuto sintetico. Nella futura Gift reale scegliere espressamente eventuale relazione tecnica e documenti aggiornati;non consegnare come chiusa la questione difformità soltanto perché l'agente ha archiviato una nota. Il vecchio intestatario dell'atto non diventa destinatario;due acquirenti selezionati mantengono una sola Home e associazioni individuali.

Il proprietario aggiunge poi una nuova fattura dell'impianto. Questa aggiunta segue gli accessi Home,non torna nella pratica Agency e non aggiorna retroattivamente la ricevuta Gift. Un successivo documento dell'agenzia è una nuova proposta esplicita,non un aggiornamento che sovrascrive la fattura del cliente.

## Casi di validazione futuri,non test eseguiti

- Documento ritenuto finale ma con dati di altro cliente:non suggerire rilascio automatico.
- Due file simili,una bozza e un finale:selezione della versione effettiva,non del file più recente a caso.
- Prospetto superfici rivisto dopo la Gift:vecchia copia e ricevuta intatte,nuova versione proposta separatamente.
- Scheda riepilogativa include dati da fonte esclusa:segnalare dipendenza prima del rilascio,non ricopiare indirettamente il contenuto.
- Relazione di regolarizzazione assente:mostrare mancante nella selezione,non dichiarare conformità.
- Proprietario aggiunge documenti dopo l'accettazione:nessuna visibilità Agency implicita.

## Cinque domande pratiche per l'agenzia

1. Quali documenti consegni oggi all'acquirente e quali produci tu che gli restano utili dopo il rogito?
2. Quali file non devono mai entrare nella selezione suggerita e quali richiedono valutazione ogni volta?
3. Su prospetto superfici e scheda riepilogativa,quali fonti e limiti vuoi che il proprietario continui a vedere?
4. Se il tecnico deve ancora chiudere una difformità,come preferisci rappresentare documento mancante e stato senza far sembrare il fascicolo completo?
5. Chi approva il pacchetto finale e come verifichi che i destinatari e la casa siano quelli giusti?

Le risposte saranno evidenze reali da raccogliere;questa proposta non equivale a conferma dell'agenzia. Nessun nuovo default o automatismo è stato attivato.
