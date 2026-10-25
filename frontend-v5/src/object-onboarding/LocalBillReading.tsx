import {ui} from '../components/ui';
import {BILL_TRACE_FIELDS,type BillTrace,type BillTraceField} from './localBillTrace';
import styles from './localBillTrace.module.css';
const labels:Record<BillTraceField,string>={invoiceMonth:'Mese di riferimento della fattura',category:'Servizio',supplier:'Fornitore',amount:'Importo della bolletta',documentDate:'Data di emissione',period:'Periodo dei servizi',dueOn:'Scadenza'};
const missing:Record<BillTraceField,string>={
 invoiceMonth:'Non è stato individuato un mese esplicito della fattura. Emissione e periodo dei servizi non vengono usati al suo posto.',
 category:'Non è stato individuato un servizio univoco.',
 supplier:'Non è stato individuato un nome con un ruolo di fornitore sufficientemente chiaro.',
 amount:'Non è stato individuato un totale etichettato o un riepilogo utilizzabile.',
 documentDate:'Non è stata individuata una data di emissione esplicitamente etichettata.',
 period:'Non è stato individuato un periodo esplicito. Il mese della fattura non viene usato al suo posto.',
 dueOn:'Non è stata individuata una scadenza esplicitamente etichettata.',
};
const outcomes={unrecognized:'Non è stata riconosciuta una bolletta con le regole locali.',excluded:'Il documento contiene indicazioni che escludono una proposta automatica di bolletta.',multiple_invoices:'Sono stati individuati più numeri di fattura: non vengono uniti in un solo totale.',limits:'Il file supera i limiti della lettura locale.',source_mismatch:'Non è stato possibile verificare che il file corrisponda alla versione del documento.'};
function explanation(trace:BillTrace,field:BillTraceField){
 const entry=trace.fields[field];
 if(entry.state==='proposed')return 'Dato proposto: controllalo nell’originale prima di confermare.';
 if(entry.state==='not_found')return missing[field];
 if(entry.state==='conflicting')return field==='category'?'Sono stati riconosciuti più servizi; non viene scelta una categoria arbitraria.':'Sono emerse indicazioni diverse: il dato resta da confermare, senza scegliere o sommare valori.';
 if(entry.state==='not_read')return 'Il documento non ha superato il riconoscimento necessario per proporre questo dato.';
 if(entry.rule==='unsupported_currency')return 'La valuta indicata non è compatibile con il totale in euro.';
 return 'È stato individuato un riferimento, ma il formato o la lettura non consentono una proposta affidabile.';
}
export function LocalBillTrace({trace,sha256,documentVersion}:{trace:BillTrace;sha256:string;documentVersion:number}){
 if(!trace.source||trace.source.sha256!==sha256)return null;
 const proposed=BILL_TRACE_FIELDS.filter(field=>trace.fields[field].state==='proposed').length;
 const readable=trace.outcome==='bill'&&trace.source.verified;
 return <section aria-label="Traccia della lettura locale">
  <details className={ui.card}>
   <summary>{readable?'Origine dei dati e campi non riconosciuti':'Perché non sono stati proposti i dati?'}</summary>
   <p>{readable?`Lettura iniziale: ${proposed} ${proposed===1?'dato proposto':'dati proposti'}, ${BILL_TRACE_FIELDS.length-proposed} ${BILL_TRACE_FIELDS.length-proposed===1?'non proposto':'non proposti'}.`:outcomes[trace.outcome==='bill'?'source_mismatch':trace.outcome]}</p>
   <p>{trace.source.pagesRead.length?'È stata letta solo la prima pagina. Un dato non riconosciuto potrebbe essere presente nel documento.':'Nessuna pagina è stata interpretata.'}</p>
   {trace.source.ocr==='failed'&&<p>L’arricchimento OCR non è riuscito. Sono conservati solo i dati leggibili dal PDF.</p>}
   {readable&&<dl className={styles.list}>{BILL_TRACE_FIELDS.map(field=><div key={field}>
    <dt>{labels[field]}</dt><dd>{explanation(trace,field)}<br/><span>{trace.fields[field].method==='pdf_ocr'?'PDF e OCR locale':'Testo e disposizione del PDF'} · pagina 1</span></dd>
   </div>)}</dl>}
   <p>Questa traccia descrive la lettura iniziale, non le tue successive correzioni. Nessun pagamento viene dedotto.</p>
   <small>Versione documento {documentVersion} · lettore {trace.version}. Traccia temporanea: non viene salvata con la conferma.</small>
  </details>
 </section>;
}
