const { test } = require('node:test');
const assert = require('node:assert/strict');
const d = require('../dist/activities/domain');
test('H1: calendario gregoriano 0001–9999 e date impossibili', () => {
  for (const date of ['0001-01-01', '9999-12-31', '2028-02-29', '2000-02-29']) assert.equal(d.calendar(date), date);
  for (const date of ['0000-01-01', '2026-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '', '2026-1-01', '2026-01-01T00:00:00Z', 123]) assert.throws(() => d.calendar(date));
  assert.equal(d.calendar(null), null);
});
test('H1: giorno Roma indipendente da UTC, ora legale e dispositivo', () => {
  assert.equal(d.temporal(new Date('2026-10-13T21:59:59Z')).today, '2026-10-13');
  assert.equal(d.temporal(new Date('2026-10-13T22:00:00Z')).today, '2026-10-14');
  assert.equal(d.temporal(new Date('2026-03-28T23:00:00Z')).today, '2026-03-29');
  assert.equal(d.temporal(new Date('2026-10-25T23:00:00Z')).today, '2026-10-26');
  assert.equal(d.plusDays('2028-02-25', 7), '2028-03-03');
  assert.equal(d.dueState({ state: 'open', dueDate: '2026-10-13' }, '2026-10-14'), 'overdue');
  assert.equal(d.dueState({ state: 'completed', dueDate: '2026-10-13' }, '2026-10-14'), 'closed');
});
test('H1: NFC/code point, nullable, note e input non fidati', () => {
  assert.equal(d.createBody({ title: ' e\u0301 ' }).title, 'é');
  assert.equal(d.createBody({ title: '🏠'.repeat(120), description: '' }).description, null);
  for (const body of [{ title: '🏠'.repeat(121) }, { title: 'x', state: 'completed' }, { title: 'x', dueDate: '' }, { title: 'x', description: 'x'.repeat(2001) }]) assert.throws(() => d.createBody(body));
  assert.throws(() => d.updateBody({ expectedVersion: 1 }));
  assert.throws(() => d.actionBody({ expectedVersion: 1, note: null }));
  assert.equal(d.actionBody({ expectedVersion: 1, note: ' ' }).note, null);
});
test('H1: filtri stretti, nessuna lista multipla o filtro privato implicito', () => {
  for (const q of [{ state: ['open'] }, { due: ['today'] }, { limit: '51' }, { limit: 10 }, { state: 'completed', due: 'today' }, { unknown: 'x' }, { cursor: '!' }]) assert.throws(() => d.listQuery(q));
  assert.equal(d.listQuery({ limit: '50' }).limit, 50);
});


test('H1 ricerca: NFC, limite, input stretti e nessuna ricerca nella storia',()=>{
 assert.equal(d.listQuery({q:' e\u0301 '}).q,'é');
 assert.equal(d.listQuery({q:'   '}).q,'');
 assert.equal(d.listQuery({q:'🏠'.repeat(120)}).q.length,240);
 for(const q of [null,[],42,'x'.repeat(121)])assert.throws(()=>d.listQuery({q}));
 assert.throws(()=>d.listQuery({q:'x'},true));
});
test('H1 servizio: ricerca scoped prima delle pagine, totale e cursore vincolato alla ricerca',async()=>{
 const {ActivitiesService}=require('../dist/activities/activities.service');
 const service=new ActivitiesService(null,null,{now:()=>new Date('2026-10-21T10:00:00Z')});
 const rows=Array.from({length:30},(_,i)=>({id:crypto.randomUUID(),accountId:'account-a',homeId:'home-a',title:i<25?'Controllo caldaia '+i:'Finestre '+i,description:null,dueDate:'2026-10-22',state:'open',assetId:null,version:1,createdAt:new Date(2026,9,21,0,i),updatedAt:new Date(2026,9,21),completedAt:null,cancelledAt:null}));
 const tx={homeActivity:{findMany:async({where})=>{
  assert.equal(where.accountId,'account-a');assert.equal(where.homeId,'home-a');assert.equal(where.title.mode,'insensitive');
  return rows.filter(r=>r.title.toLowerCase().includes(where.title.contains.toLowerCase()));
 }}};
 service.read=async(a,h,run)=>{assert.equal(a,'account-a');assert.equal(h,'home-a');return run(tx,true,{today:'2026-10-21',asOf:'2026-10-21T10:00:00Z',timeZone:'Europe/Rome'});};
 const first=await service.list('account-a','home-a',{q:' CALDAIA ',limit:'20'});
 assert.equal(first.total,25);assert.equal(first.items.length,20);assert.ok(first.nextCursor);
 const next=await service.list('account-a','home-a',{q:'CALDAIA',limit:'20',cursor:first.nextCursor});
 assert.equal(next.items.length,5);assert.equal(next.nextCursor,null);
 assert.equal(new Set([...first.items,...next.items].map(r=>r.id)).size,25);
 await assert.rejects(()=>service.list('account-a','home-a',{q:'Finestre',cursor:first.nextCursor}));
});
