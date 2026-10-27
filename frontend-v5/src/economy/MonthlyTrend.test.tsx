import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';

async function setup() {
  const backend=new FakeBackend(); backend.economy.enabled=true;
  const owner=backend.seedAccount('Persona demo','monthly@example.test','password-monthly-001');
  const home=backend.seedHome(owner.id,'Casa sintetica','Via Demo 1');
  // Più della prima pagina: il totale del mese deve includere anche le righe non caricate.
  for(let i=0;i<25;i++) await backend.economy.handle({method:'POST',path:'',headers:{'idempotency-key':crypto.randomUUID()},body:{title:`Costo demo ${i}`,category:'purchase_replacement',amountCents:1000,spentOn:'2026-09-10',supplier:'Negozio Demo'}},owner.id,home.id,'expenses');
  await backend.economy.handle({method:'POST',path:'',headers:{'idempotency-key':crypto.randomUUID()},body:{title:'Anno precedente',category:'purchase_replacement',amountCents:15000,spentOn:'2025-09-10'}},owner.id,home.id,'expenses');
  const app=renderApp({backend,path:'/accedi'});
  await app.user.type(await screen.findByLabelText('Email'),owner.email);await app.user.type(screen.getByLabelText('Password'),'password-monthly-001');await app.user.click(screen.getByRole('button',{name:'Accedi'}));
  await waitFor(()=>expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  const start=backend.log.length;await app.router.navigate(`/home/${home.id}/spese`);
  await screen.findByRole('button',{name:/settembre 2026: 250,00 €; anno precedente: 150,00 €/});
  return {backend,app,home,owner,start};
}

it('tre coppie complete dal server, non dalla pagina; espandere non cambia periodo o totale',async()=>{
  const {backend,app,start}=await setup();
  const trend=screen.getByRole('region',{name:'Andamento per mese'});
  expect(within(trend).getAllByRole('button',{name:/Apri dettaglio del mese/})).toHaveLength(3);
  expect(screen.getAllByRole('link',{name:/Costo demo/})).toHaveLength(20);
  const route=app.router.state.location.search;
  await app.user.click(within(trend).getByRole('button',{name:'Mostra tutto l’anno'}));
  await waitFor(()=>expect(within(trend).getAllByRole('button',{name:/Apri dettaglio del mese/})).toHaveLength(10));
  expect(app.router.state.location.search).toBe(route);
  expect(screen.getByRole('region',{name:/Costi registrati nel periodo/})).toHaveTextContent('250,00 €');
  await app.user.click(within(trend).getByRole('button',{name:'Mostra ultimi 3 mesi'}));
  expect(within(trend).getAllByRole('button',{name:/Apri dettaglio del mese/})).toHaveLength(3);
  expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('drill da tastiera: mese, filtri e ricerca privata restano coerenti e il dettaglio prende focus',async()=>{
  const {app,backend,start}=await setup();
  await app.user.selectOptions(screen.getByRole('combobox',{name:'Gruppo di spesa'}),'works_purchases');
  await app.user.type(screen.getByRole('searchbox',{name:'Cerca in descrizione o fornitore'}),'Negozio Demo');await app.user.click(screen.getByRole('button',{name:'Cerca'}));
  const month=await screen.findByRole('button',{name:/settembre 2026: 250,00 €/});month.focus();await app.user.keyboard('{Enter}');
  await waitFor(()=>expect(new URLSearchParams(app.router.state.location.search).get('mese')).toBe('2026-09'));
  const p=new URLSearchParams(app.router.state.location.search);expect(p.get('dal')).toBe('2026-09-01');expect(p.get('al')).toBe('2026-09-30');expect(p.get('famiglia')).toBe('works_purchases');expect(p.toString()).not.toContain('Negozio');
  expect(app.router.state.location.state).toMatchObject({economyQ:'Negozio Demo'});
  expect(document.activeElement?.textContent).toBe('Acquisti e interventi · dettaglio del confronto');
  expect(await screen.findByRole('region',{name:'Acquisti e interventi'})).toBeVisible();
  expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('nessuno storico non diventa zero; il mese corrente mantiene il limite del giorno',async()=>{
  const {backend,start}=await setup();
  expect(screen.getByRole('button',{name:/ottobre 2026, periodo parziale: nessuna registrazione; anno precedente: Nessuna registrazione precedente/})).toBeVisible();
  expect(backend.log.slice(start).some(r=>r.path.includes('from=2026-10-01')&&r.path.includes('to=2026-10-13'))).toBe(true);
  expect(screen.getByText('Acquisti e interventi · dettaglio del confronto').closest('details')).not.toHaveAttribute('open');
});

it('errore mensile: nessuna vecchia barra mostrata, riprova esplicito senza scritture',async()=>{
  const {backend,app,start}=await setup();
  const handle=backend.handle.bind(backend);
  let failing=true;
  backend.handle=async req=>req.path.includes('/economy/summary')&&req.path.includes('from=2026-09-01')&&failing
    ? {status:503,body:{error:{code:'unavailable',message:'Non disponibile',requestId:'mock-monthly-error'}}} : handle(req);
  await app.queryClient.invalidateQueries({predicate:q=>q.queryKey.includes('summary')&&String(q.queryKey.at(-1)).includes('2026-09-01')});
  const region=await screen.findByRole('region',{name:'Andamento per mese'});
  await within(region).findByText('Andamento non disponibile');
  expect(within(region).queryByRole('button',{name:/Apri dettaglio del mese/})).not.toBeInTheDocument();
  failing=false;await app.user.click(within(region).getByRole('button',{name:/Riprova/}));
  await screen.findByRole('button',{name:/settembre 2026: 250,00/});
  expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('cambio casa e membership revocata non espongono gli aggregati mensili precedenti',async()=>{
  const {backend,app,home,owner,start}=await setup();
  const other=backend.seedHome(owner.id,'Seconda casa sintetica','Via Demo 2');
  await app.router.navigate(`/home/${other.id}/spese`);
  await screen.findByRole('button',{name:/settembre 2026: nessuna registrazione/});
  expect(screen.queryByRole('button',{name:/settembre 2026: 250,00/})).not.toBeInTheDocument();
  backend.memberships=backend.memberships.filter(m=>m.homeId!==home.id);
  await app.router.navigate(`/home/${home.id}/spese`);
  await waitFor(()=>expect(screen.queryByRole('button',{name:/settembre 2026: 250,00/})).not.toBeInTheDocument());
  expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('cambio ambito: i vecchi importi spariscono prima della nuova risposta e nessuna mutazione',async()=>{
  const {backend,app,start}=await setup();
  await app.user.selectOptions(screen.getByRole('combobox',{name:'Gruppo di spesa'}),'utilities');
  await waitFor(()=>expect(screen.getByRole('button',{name:/settembre 2026: nessuna registrazione/})).toBeVisible());
  expect(screen.queryByRole('button',{name:/settembre 2026: 250,00/})).not.toBeInTheDocument();
  expect(backend.log.slice(start).some(r=>r.path.includes('summary')&&r.path.includes('family=utilities')&&r.path.includes('from=2026-09-01'))).toBe(true);
  expect(backend.log.slice(start).filter(r=>r.method!=='GET')).toEqual([]);
});

it('un intervallo parziale si apre con gli stessi estremi, senza estenderlo al mese intero',async()=>{
  const {app,home}=await setup();
  await app.router.navigate(`/home/${home.id}/spese?dal=2026-09-05&al=2026-09-20`);
  const button=await screen.findByRole('button',{name:/settembre 2026, periodo parziale: 250,00/});fireEvent.click(button);
  expect(new URLSearchParams(app.router.state.location.search).get('dal')).toBe('2026-09-05');
  expect(new URLSearchParams(app.router.state.location.search).get('al')).toBe('2026-09-20');
  expect(new URLSearchParams(app.router.state.location.search).has('mese')).toBe(false);
  expect(screen.queryByRole('button',{name:'Mostra tutto l’anno'})).not.toBeInTheDocument();
});

it('403 di un singolo riepilogo mensile rimuove tutte le vecchie barre senza retry automatici',async()=>{
  const {backend,app}=await setup();
  const handle=backend.handle.bind(backend);let refused=0;
  backend.handle=async req=>{
    if(req.path.includes('/economy/summary')&&req.path.includes('from=2026-09-01')) {
      refused++;
      return {status:403,body:{error:{code:'forbidden',message:'Accesso non consentito.',requestId:'mock-monthly-403'}}};
    }
    return handle(req);
  };
  await app.user.selectOptions(screen.getByRole('combobox',{name:'Gruppo di spesa'}),'works_purchases');
  await waitFor(()=>expect(refused).toBeGreaterThan(0));
  await waitFor(()=>expect(screen.queryByRole('button',{name:/settembre 2026: 250,00/})).not.toBeInTheDocument());
  expect(refused).toBe(1);
  const trend=screen.getByRole('region',{name:'Andamento per mese'});
  expect(within(trend).getByText('Andamento non disponibile')).toBeVisible();
  expect(within(trend).queryByRole('button',{name:/Riprova/})).not.toBeInTheDocument();
  expect(within(trend).queryByRole('button',{name:/Apri dettaglio del mese/})).not.toBeInTheDocument();
});
