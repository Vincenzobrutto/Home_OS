# Agenzie — confronto documentale v1

## Implementato

Motore puro `agency-practices/coherence.ts`, senza HTTP, DB o AI. Riceve gruppi di confronto espliciti: identificativo, unità, soggetto, epoca dichiarata, campo e 2–20 fatti. Massimo100gruppi. Il gruppo è una domanda circoscritta scelta dall'agente; il motore non deduce identità o epoca dei fatti. L'epoca è un'etichetta di contesto manuale, non una verifica delle date delle fonti. L'assenza di gruppi non significa fascicolo completo.

Campi confrontabili: identificativi catastali distinti, nome della stessa persona e superfici dello stesso tipo. Non confronta automaticamente nomi di venditore storico ed eredi, diritti/quote, date di atti diversi, superfici nette/catastali/commerciali. Non riconosce la distribuzione interna da una planimetria.

Usa il valore deciso se confermato, altrimenti quello proposto. Mantiene fonti e versione di ogni valore. Esiti: `matching_proposals`, `matching_confirmed_values`, `difference_to_review`, `not_evaluable`. Anche valori confermati concordanti non certificano titolarità, regolarità o vendibilità. Una differenza richiede controllo e può essere legittima: non è etichettata difformità edilizia.

Prove obsolete o fatti respinti impediscono il confronto; valori non valutabili non vengono restituiti. Fonti private e fatti inesistenti producono lo stesso diniego. Sono richiesti accessi correnti alla pratica. Nessun confronto attraverso unità, soggetti o campi diversi. Normalizzazione limitata a Unicode/spazi e maiuscole per nome/comune; nessun fuzzy matching, eliminazione di zeri o tolleranza numerica arbitraria.

Il fingerprint include ambito e snapshot dei fatti selezionati, decisioni e prove. Rimane stabile se cambia il nome della pratica o l'ordine della selezione; cambia dopo decisione, sostituzione della fonte o modifica dell'ambito. Servirà alle risoluzioni per non conservare una chiusura dopo un cambiamento materiale. In questa fase non esiste ancora un registro persistente di gruppi/risoluzioni né un endpoint di confronto.

## Caso sintetico da portare nella verticale

`SUC-DEMO-001`: abitazione ereditata da Luca e Sara, con cantina distinta. Il fascicolo contiene atto storico della madre, dichiarazione di successione e visura attuale. Sono ruoli e tempi diversi: non generare una contraddizione fra nome della madre e nomi degli eredi. L'agente associa esplicitamente ogni fatto al soggetto/unità pertinente; documenti e dichiarazioni restano prove da verificare, non certificazione automatica dei diritti.

L'atto storico propone subalterno12, la visura propone13: creare una domanda riferita alla medesima abitazione e all'epoca che l'agente intende verificare. Il motore segnala la differenza; il tecnico può individuare una variazione storica legittima. Il motore non sceglie il numero vincente. Cantina sub14 resta su un'altra unità, senza confronto con l'abitazione.

La planimetria mostra una distribuzione che il sopralluogo dichiara cambiata (parete interna spostata). Registrare l'osservazione dell'agente e richiedere verifica tecnica: questo motore scalare non rileva né risolve tale difformità. La coincidenza dei metri quadrati non deve chiudere la verifica. Identificare nel futuro registro fonte dell'osservazione, responsabile, scadenza, risposta del tecnico e documenti aggiornati; sostituire un documento deve riaprire i confronti dipendenti.

## Prossimo incremento

Persistenza di gruppi e risoluzioni motivate con lock/CAS, autore e fingerprint, ricalcolo prima della risoluzione e riapertura automatica. Supporto esplicito alle osservazioni manuali non deducibili dai campi, distinto dal confronto automatico. Test PostgreSQL dedicati dopo questo incremento. Poi storage bytes e confine HTTP autenticato; UI soltanto dopo backend verificato.
