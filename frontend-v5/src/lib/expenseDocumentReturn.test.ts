import {expect,it} from 'vitest';
import {expenseDocumentReturn} from './expenseDocumentReturn';
it('restores only the originating document and its original navigation state',()=>{
 const saved={documentsAccountId:'a',documentsSearch:'workflow=completed&q=luce'};
 expect(expenseDocumentReturn({accountId:'a',expenseDocumentReturn:{homeId:'h',documentId:'document-123',documentState:saved}},'a','h')).toEqual({path:'/home/h/documenti/document-123',state:saved});
});
it('rejects cross-account/home contexts and malformed or external identifiers',()=>{
 const state={accountId:'a',expenseDocumentReturn:{homeId:'h',documentId:'doc'}};
 expect(expenseDocumentReturn(state,'b','h')).toBeNull();expect(expenseDocumentReturn(state,'a','other')).toBeNull();
 for(const documentId of ['','../account','https://example.test','doc?next=other','%2fescape'])expect(expenseDocumentReturn({...state,expenseDocumentReturn:{homeId:'h',documentId}},'a','h')).toBeNull();
 expect(expenseDocumentReturn({accountId:'a',expensesSearch:'vista=elenco'},'a','h')).toBeNull();
});
