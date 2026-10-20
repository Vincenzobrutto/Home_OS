import { expect, it } from 'vitest';
import { contactNavigationState, contactOrigin } from './navigation';

it('preserves the original home page, query and navigation context',()=>{
  const state={accountId:'a',expenseRestore:{id:'e',y:500,pages:2}};
  const result=contactNavigationState('a','h',{pathname:'/home/h/spese',search:'?vista=elenco&anno=2025',state});
  expect(contactOrigin(result,'a','h')).toEqual({path:'/home/h/spese?vista=elenco&anno=2025',label:'Spese',returnState:state});
});

it('rejects returns to other accounts, homes and unsafe or unrelated routes',()=>{
  const source={contactsAccountId:'a',contactsOrigin:{path:'/home/h/oggetti/object/o',label:'Oggetto'}};
  expect(contactOrigin(source,'b','h')).toBeNull();
  expect(contactOrigin(source,'a','other')).toBeNull();
  for(const path of ['https://example.test','//example.test','/home/h/../case','/home/h/oggetti/%2e%2e','/home/h/casa#bad','/home/h/casa\\bad','/home/h/casa\n','/home/h/account']){
    expect(contactOrigin({...source,contactsOrigin:{path,label:'Indietro'}},'a','h')).toBeNull();
  }
});

it('keeps a list and its origin as separate return steps',()=>{
  const object=contactNavigationState('a','h',{pathname:'/home/h/oggetti/object/o',search:'',state:null});
  const list=contactNavigationState('a','h',{pathname:'/home/h/rubrica',search:'',state:object});
  expect(contactOrigin(list,'a','h')).toMatchObject({path:'/home/h/rubrica',label:'Rubrica',returnState:object});
  const detail=contactNavigationState('a','h',{pathname:'/home/h/rubrica/contact',search:'',state:list});
  expect(detail).toEqual(list);
});
