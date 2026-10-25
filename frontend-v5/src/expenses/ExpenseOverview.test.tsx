import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {ExpenseOverview} from './ExpenseOverview';
const bill={amountCents:9339,supplier:'Fornitore fittizio',category:'electricity' as const,spentOn:'2026-01-17',documentDate:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-06'};
it('groups saved amount, supplier and reference month before distinct issue/due dates',()=>{
 render(<ExpenseOverview expense={bill}/>);
 expect(screen.getByText('93,39 €')).toBeVisible();expect(screen.getByText('Fornitore fittizio')).toBeVisible();expect(screen.getByText('dicembre 2025')).toBeVisible();
 expect(screen.getByText('Emissione').nextSibling).toHaveTextContent('17 gennaio 2026');expect(screen.getByText('Scadenza').nextSibling).toHaveTextContent('6 febbraio 2026');expect(screen.queryByText('Data della spesa')).not.toBeInTheDocument();
});
it('does not substitute spentOn or today for missing billing period, emission or deadline',()=>{
 render(<ExpenseOverview expense={{...bill,supplier:null,competenceFrom:null,competenceTo:null,documentDate:null,dueOn:null}}/>);
 expect(screen.getByText('Non indicato')).toBeVisible();expect(screen.getByText('Da completare')).toBeVisible();expect(screen.getAllByText('Non indicata')).toHaveLength(2);expect(screen.queryByText(/17 gennaio/)).not.toBeInTheDocument();
});
it('shows a multi-month period without converting it into the issue month',()=>{
 render(<ExpenseOverview expense={{...bill,competenceFrom:'2025-11-01'}}/>);expect(screen.getByText('01/11/2025 – 31/12/2025')).toBeVisible();
});
it('ordinary expenses retain their expense date and only show document dates when present',()=>{
 const {rerender}=render(<ExpenseOverview expense={{...bill,category:'purchase_replacement',competenceFrom:null,competenceTo:null,documentDate:null,dueOn:null}}/>);
 expect(screen.getByText('Data della spesa')).toBeVisible();expect(screen.queryByText('Emissione')).not.toBeInTheDocument();expect(screen.queryByText('Periodo di riferimento')).not.toBeInTheDocument();
 rerender(<ExpenseOverview expense={{...bill,category:'purchase_replacement',competenceFrom:null,competenceTo:null}}/>);expect(screen.getByText('Emissione')).toBeVisible();expect(screen.getByText('Scadenza')).toBeVisible();
});

it('shows invoice January and service December as different saved facts',()=>{
 render(<ExpenseOverview expense={{...bill,invoiceMonth:'2026-01'}}/>);
 expect(screen.getByText('Mese di riferimento della fattura').nextSibling).toHaveTextContent('gennaio 2026');
 expect(screen.getByText('Periodo dei servizi').nextSibling).toHaveTextContent('dicembre 2025');
 expect(screen.getByText('Emissione').nextSibling).toHaveTextContent('17 gennaio 2026');
});
