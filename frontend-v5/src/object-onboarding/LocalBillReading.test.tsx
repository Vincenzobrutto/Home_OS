import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it} from 'vitest';
import {LocalBillTrace} from './LocalBillReading';
import {emptyBillTrace,type BillTrace} from './localBillTrace';
function sample():BillTrace{
 const trace=emptyBillTrace('bill');trace.source={sha256:'a'.repeat(64),verified:true,pagesRead:[1],ocr:'completed'};
 trace.fields.amount={state:'conflicting',rule:'labelled_total',method:'pdf_ocr'};
 trace.fields.supplier={state:'proposed',rule:'supplier_label',method:'pdf'};
 trace.fields.period={state:'not_found',rule:'labelled_period_or_layout',method:'pdf_ocr'};
 return trace;
}
it('explains initial proposals and missing/conflicting fields without a save or an AI action',async()=>{
 render(<LocalBillTrace trace={sample()} sha256={'a'.repeat(64)} documentVersion={3}/>);
 await userEvent.click(screen.getByText('Origine dei dati e campi non riconosciuti'));
 expect(screen.getByText(/lettura iniziale: 1 dati proposti/i)).toBeVisible();
 expect(screen.getByText(/Sono emerse indicazioni diverse/)).toBeVisible();
 expect(screen.getByText(/Il mese della fattura non viene usato/)).toBeVisible();
 expect(screen.getByText(/non le tue successive correzioni/)).toBeVisible();
 expect(screen.getByText(/Versione documento 3/)).toBeVisible();
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'Traccia della lettura locale'})).queryByRole('textbox')).not.toBeInTheDocument();
});
it('hides traces whose SHA does not match the current source',()=>{
 const {container}=render(<LocalBillTrace trace={sample()} sha256={'b'.repeat(64)} documentVersion={3}/>);expect(container).toBeEmptyDOMElement();
});
it('does not present field methods when no page was interpreted',async()=>{
 const trace=emptyBillTrace('source_mismatch');trace.source={sha256:'a'.repeat(64),verified:false,pagesRead:[],ocr:'unused'};
 render(<LocalBillTrace trace={trace} sha256={'a'.repeat(64)} documentVersion={3}/>);
 await userEvent.click(screen.getByText('Perché non sono stati proposti i dati?'));
 expect(screen.getByText('Nessuna pagina è stata interpretata.')).toBeVisible();
 expect(screen.queryByText('Fornitore')).not.toBeInTheDocument();expect(screen.queryByText(/Testo e disposizione/)).not.toBeInTheDocument();
});
it('reports failed optional OCR without presenting retained native fields as OCR-derived',async()=>{
 const trace=sample();trace.source!.ocr='failed';trace.fields.supplier.method='pdf';
 render(<LocalBillTrace trace={trace} sha256={'a'.repeat(64)} documentVersion={3}/>);
 await userEvent.click(screen.getByText('Origine dei dati e campi non riconosciuti'));
 expect(screen.getByText(/L’arricchimento OCR non è riuscito/)).toBeVisible();
});
