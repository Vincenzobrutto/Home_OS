import {describe,it,expect} from 'vitest';
import type {CatalogItem} from '../api/types';
import {catalogNotice} from './CatalogTile';
const item=(next:CatalogItem['summary'],warranty?:string)=>({summary:next,profile:{fields:warranty?{warrantyEnd:{value:warranty}}:{}}}) as CatalogItem;
describe('catalogue signals from confirmed data',()=>{
 it('does not invent a notice without dates',()=>expect(catalogNotice(item(undefined),'2026-10-19')).toBeNull());
 it('prioritizes an actual open overdue activity over warranty',()=>expect(catalogNotice(item({brand:null,model:null,nextActivity:{title:'Controllo reale',dueDate:'2026-10-18'}},'2028-01-01'),'2026-10-19')).toMatchObject({label:'Controllo reale',urgent:true,overdue:true}));
 it('keeps distant activities neutral',()=>expect(catalogNotice(item({brand:null,model:null,nextActivity:{title:'Controllo',dueDate:'2027-01-01'}}),'2026-10-19')).toMatchObject({urgent:false,overdue:false}));
 it('shows an expired warranty without calling it an urgent activity',()=>expect(catalogNotice(item(undefined,'2026-09-01'),'2026-10-19')).toMatchObject({label:'Garanzia scaduta il',urgent:false}));
});
