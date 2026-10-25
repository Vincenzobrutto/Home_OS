# Bollette — importi prudenti e consegna frontend, 25 ottobre 2026

## Perimetro e riproduzione

Lotto registrato con `062dd38`, prima del codice, sul branch `codex/bollette-importi-prudenti-20261025`, dal consolidamento `730b93d`. Il merge locale `714e8b6` include la PR #38 e, attraverso questa, #37/#35/#36. Nessun merge nel consolidamento o aggiornamento dell'app. Esclusi backend, API, schema, OCR, ItemEditor/model e lotto Claude.

Il parser locale dei totali accettava il prefisso numerico anche con valuta straniera o seguito malformato: per esempio `37,82 USD` e `12,34,56 EUR`. Poteva così proporre un valore in euro non sostenuto dal documento. La prima riproduzione ha dato **26 fallimenti e 82 successi** nei 108 casi mirati complessivi. Non sono prove su documenti del cliente: sono variazioni sintetiche di valori, formati, valuta e posizione delle righe.

## Correzione generale

`localBillMoney.ts` isola la lettura degli importi; `localBill.ts` lo usa senza cambiare classificazione, fornitore, date o periodo. Proposte soltanto da etichette di totale/importo già riconosciute e da numeri completi nel formato supportato, positivi e nei limiti esistenti. EUR, Euro e € sono accettati prima o dopo il valore, anche su righe separate. Restano supportate le etichette spezzate su più righe.

- Valute esplicite diverse da EUR, simboli monetari incompatibili e dichiarazioni `Valuta`/`Currency` anche spezzate impediscono la proposta economica. Nessuna conversione o tasso implicito.
- Seguiti numerici malformati, intervalli, più importi distinti nella stessa riga o totali incompatibili non vengono troncati, sommati o ripartiti.
- Totali EUR identici ripetuti restano utilizzabili; una controparte esplicitamente in altra valuta non viene ignorata, nemmeno su un'altra pagina.
- Note estranee in altra valuta non invalidano un totale EUR correttamente etichettato; le normali note su IVA e periodo restano ammesse.
- In caso ambiguo rimane vuoto soltanto l'importo: gli altri dati sostenuti dal testo restano proposti e il normale controllo del modulo richiede il dato mancante prima della conferma.

La precedente interpretazione degli importi italiani privi di valuta non viene ampliata o sostituita. Questa correzione non certifica tutte le valute o i formati numerici internazionali. Nessuna riscrittura delle bozze o dei dati già salvati; nessun riempimento automatico di campi manuali.

## Verifica

Codice finale `b601ea6`, dopo `1800b60`. I **61 casi preesistenti** dei due file del parser restano invariati; **54 nuovi casi** coprono importi/valute, ambiguità, pagine multiple e righe spezzate. Un caso genera inoltre 84 variazioni di maiuscole, spazi e prefissi. Mirati finali **115/115**. Le sei prove aggiunte sulle righe spezzate sono state prima riprodotte in rosso e poi superate, preservando la capacità del parser precedente.

Typecheck, lint e build superati sulla versione finale. Il primo lint aveva segnalato quattro escape superflui nelle nuove espressioni regolari: rimossi prima di avviare la suite completa, senza modificare asserzioni o timeout. Suite mock completa **1109/1109 in 124 file**, zero fallimenti o test saltati, un worker e retry 0; durata 849.41 secondi. Fixture PDF/OCR **5/5**. Dopo la prova sono state tolte soltanto righe vuote a fine file in due test propri delle PR antecedenti; nessuna asserzione o istruzione modificata.

Evidenze locali nel task: `work/bill-money-red.json`, `work/bill-money-wrapping-red.log`, `work/bill-money-focus.json`, `work/bill-money-checks-final.log`, `work/bill-money-fixtures.json`, `work/bill-money-full.json`. Questi percorsi sono artefatti del collaudo, non file distribuiti nell'app.

## Misura della build

Rispetto alla PR #38, l'entry JS resta **486791 byte**; il chunk OnboardingPage passa da 152451 a **154124 byte** (+1673; gzip livello 9 da 46154 a 46810, +656). IntakePage e PDF invariati in byte, asset OCR invariati (17 file, 31899517 byte). Differenze minime di gzip nei chunk invariati derivano dai riferimenti con hash diversi. Le mappe dell'entry non contengono i moduli pesanti PDF/OCR/onboarding ricercati. Sono misure dei file distribuiti, non traffico, latenza o memoria osservati nel browser. Dati locali: `work/bill-money-bundle.json`.

## Limiti e integrazione

Solo test offline e mock, senza AI/email, originali o contenuti personali, DB/API/storage reale, `.env`, migrazioni, salvataggi automatici o riavvii. Nessun accesso browser alternativo per aggirare il blocco già riscontrato. Test DOM e fixture non equivalgono a una prova su Safari, telefono o lettore di schermo.

Questo candidato frontend comprende le correzioni della PR #38; non richiede di integrare nuovamente i suoi antecedenti. Il lotto backend offline è indipendente e non è incluso. Merge e successivo aggiornamento dell'app restano decisioni del committente.

[PR #40](https://github.com/Vincenzobrutto/Home_OS/pull/40) verso il consolidamento, senza merge; push verificato con confronto HEAD/git ls-remote. La [PR #39](https://github.com/Vincenzobrutto/Home_OS/pull/39) consegna separatamente le verifiche server. Al fetch finale il consolidamento resta `730b93d`. Le vecchie PR non sono state chiuse o modificate.
