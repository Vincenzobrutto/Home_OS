import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '../api/client';
import type { Draft, ExpenseCandidate, Form, Item } from './model';

export function useExpenseCandidates(api:ApiClient,accountId:string,base:string,draft:Draft,item:Item,form:Form,change:(form:Form)=>void,enabled=true){
 const expense=useQuery({queryKey:['account',accountId,'onboarding',draft.id,'expenses',draft.version],queryFn:({signal})=>api.callJson<{items:ExpenseCandidate[];nextCursor:string|null}>(base+'/drafts/'+encodeURIComponent(draft.id)+'/expense-candidates?limit=50',{accountId,signal}),enabled:enabled&&draft.documentKind==='purchase_document'&&draft.items.length===1&&(item.quantity?.value??1)===1,retry:false,gcTime:0});
 const duplicateCount=expense.data?.items.filter(row=>row.rank>0).length??0;
 useEffect(()=>{if(form.action==='skip'||form.expenseAutoState!=='pending'||!expense.data)return;change({...form,expenseAutoState:duplicateCount?'review':'ready',expense:duplicateCount?'skip':'create'});},[form,expense.data,duplicateCount,change]);
 return expense;
}
