import {fireEvent,screen,waitFor,within} from '@testing-library/react';
import {expect,it} from 'vitest';
import {FakeBackend} from '../test/fakeBackend';
import {renderApp} from '../test/harness';

async function setup(){
 const backend=new FakeBackend();backend.economy.enabled=true;
 const owner=backend.seedAccount('Persona demo','unified@example.test','password-unified-001');
 const home=backend.seedHome(owner.id,'Casa sintetica','Via Demo 1');
 for(const body of [
  {title:'Acquisto nuovo',category:'purchase_replacement',amountCents:4000,spentOn:'2026-09-10'},
  {title:'Riparazione',category:'repairs_works',amountCents:2500,spentOn:'2026-09-10'},
  {title:'Manutenzione',category:'maintenance',amountCents:1000,spentOn:'2025-09-10'},
  {title:'Riparazione precedente',category:'repairs_works',amountCents:3000,spentOn:'2025-09-10'},
  {title:'Internet',category:'internet_services',supplier:'Rete Demo',amountCents:3290,spentOn:'2026-09-10',invoiceMonth:'2026-09',competenceFrom:'2026-08-01',competenceTo:'2026-08-31'},
 ]){
  const r=await backend.economy.handle({method:'POST',path:'',headers:{'idempotency-key':crypto.randomUUID()},body},owner.id,home.id,'expenses');expect(r.status).toBe(201);
 }
 const app=renderApp({backend,path:'/accedi'});
 await app.user.type(await screen.findByLabelText('Email'),owner.email);await app.user.type(screen.getByLabelText('Password'),'password-unified-001');await app.user.click(screen.getByRole('button',{name:'Accedi'}));
 await waitFor(()=>expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
 const start=backend.log.length;await app.router.navigate(`/home/${home.id}/spese`);await screen.findByRole('link',{name:'Riparazione'});
 return {app,backend,home,start};
}

it('pagina unica: elenco e grafico coesistono, confronti vengono da summary filtrati e nessuna scrittura',async()=>{
 const {backend,start}=await setup();
 expect(screen.queryByRole('group',{name:'Viste delle spese'})).not.toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Elenco'})).toBeVisible();expect(screen.getByRole('img',{name:/Grafico ad anello/})).toBeVisible();
 const region=await screen.findByRole('region',{name:'Acquisti e interventi'});
 await waitFor(()=>expect(within(region).getByRole('button',{name:'Filtra Acquisti'})).toHaveTextContent('40,00 €'));
 expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
 expect(backend.log.slice(start).some(r=>r.path.includes('summary')&&r.path.includes('family=works_purchases'))).toBe(true);
});

it('categoria mantenuta nel confronto: solo riparazioni nel vecchio anno, mai manutenzione o acquisti',async()=>{
 const {app,backend,start}=await setup();
 await app.user.selectOptions(screen.getByRole('combobox',{name:'Gruppo di spesa'}),'maintenance_repairs');
 await app.user.click(screen.getByText(/^Filtri(?: · \d+ attiv[oi])?$/));
 await app.user.selectOptions(screen.getByRole('combobox',{name:'Categoria'}),'repairs_works');await app.user.click(screen.getByRole('button',{name:'Applica filtri'}));
 const region=await screen.findByRole('region',{name:'Acquisti e interventi'});
 await waitFor(()=>expect(region).toHaveTextContent('30,00 €'));
 expect(region).not.toHaveTextContent('40,00 €');expect(within(region).queryByRole('button',{name:'Filtra Acquisti'})).not.toBeInTheDocument();
 expect(backend.log.slice(start).some(r=>r.path.includes('summary')&&r.path.includes('category=repairs_works')&&r.path.includes('family=maintenance_repairs'))).toBe(true);
 expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('mese è un intervallo server, persiste nei filtri e nel ritorno senza inviare dati di ricerca nell’URL',async()=>{
 const {app,backend,start}=await setup();await app.user.click(screen.getByRole('button',{name:'Mese'}));
 const month=screen.getByLabelText('Mese della fattura o della spesa');fireEvent.change(month,{target:{value:'2026-09'}});
 await waitFor(()=>expect(new URLSearchParams(app.router.state.location.search).get('mese')).toBe('2026-09'));
 await app.user.selectOptions(screen.getByRole('combobox',{name:'Gruppo di spesa'}),'utilities');
 expect(new URLSearchParams(app.router.state.location.search).get('mese')).toBe('2026-09');
 await app.user.type(screen.getByRole('searchbox',{name:'Cerca in descrizione o fornitore'}),'Rete Demo');await app.user.click(screen.getByRole('button',{name:'Cerca'}));
 expect(app.router.state.location.search).not.toContain('Rete');
 expect(backend.log.slice(start).some(r=>r.path.includes('from=2026-09-01')&&r.path.includes('to=2026-09-30'))).toBe(true);
 expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('archiviate: nessun riepilogo attivo presentato come totale delle righe archiviate',async()=>{
 const {app,backend,home,start}=await setup();await app.router.navigate(`/home/${home.id}/spese?stato=archived`);
 await screen.findByText(/Stai consultando anche registrazioni archiviate/);
 expect(screen.queryByRole('region',{name:/Costi registrati nel periodo/})).not.toBeInTheDocument();
 expect(screen.queryByRole('region',{name:'Acquisti e interventi'})).not.toBeInTheDocument();
 await app.router.navigate(`/home/${home.id}/spese?vista=riepilogo&stato=archived`);
 expect(screen.queryByRole('region',{name:'Riepilogo per gruppo di spesa e categoria'})).not.toBeInTheDocument();
 expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('la scheda di confronto filtra e rimuove il gruppo con un clic, senza duplicare o scrivere spese',async()=>{
 const {app,backend,start}=await setup();
 const region=await screen.findByRole('region',{name:'Acquisti e interventi'});
 await app.user.click(await within(region).findByRole('button',{name:'Filtra Acquisti'}));
 await screen.findByRole('link',{name:'Acquisto nuovo'});
 expect(screen.queryByRole('link',{name:'Riparazione'})).not.toBeInTheDocument();
 await app.user.click(await within(screen.getByRole('region',{name:'Acquisti e interventi'})).findByRole('button',{name:'Rimuovi filtro Acquisti'}));
 await screen.findByRole('link',{name:'Riparazione'});
 expect(new URLSearchParams(app.router.state.location.search).has('famiglia')).toBe(false);
 expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});
