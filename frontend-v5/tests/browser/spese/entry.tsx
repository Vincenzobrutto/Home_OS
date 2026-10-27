import {createRoot} from 'react-dom/client';
import {RouterProvider,createMemoryRouter} from 'react-router';
import {ApiClient} from '../../../src/api/client';
import {routes} from '../../../src/routes/routes';
import {AppProviders} from '../../../src/session/session';
import {createQueryClient} from '../../../src/session/queryClient';
import {FakeBackend} from '../../../src/test/fakeBackend';
import '../../../src/styles/tokens.css';
import '../../../src/styles/global.css';
const backend=new FakeBackend();backend.economy.enabled=true;
const owner=backend.seedAccount('Persona Demo','spese-browser@example.test','password-demo-001'),home=backend.seedHome(owner.id,'Casa dimostrativa','Via Demo 1');
for(const body of [
 {title:'Bolletta elettricità',category:'electricity',supplier:'Fornitore Alfa',amountCents:11240,spentOn:'2026-10-07',invoiceMonth:'2026-09',documentDate:'2026-10-07',dueOn:'2026-10-28',competenceFrom:'2026-08-15',competenceTo:'2026-09-14'},
 {title:'Bolletta internet',category:'internet_services',supplier:'Rete Beta',amountCents:3290,spentOn:'2026-09-10',invoiceMonth:'2026-09',documentDate:'2026-09-10',dueOn:'2026-09-30'},
 {title:'Lavatrice',category:'purchase_replacement',supplier:'Negozio Demo',amountCents:49900,spentOn:'2026-09-14'},
 {title:'Riparazione rubinetto',category:'repairs_works',supplier:'Tecnico Demo',amountCents:8500,spentOn:'2026-10-08'},
 {title:'Quota condominio',category:'condominium_ordinary',amountCents:14000,spentOn:'2026-10-03'},
 {title:'Acquisto precedente',category:'purchase_replacement',amountCents:39900,spentOn:'2025-09-14'},
 {title:'Febbraio demo',category:'purchase_replacement',amountCents:2000,spentOn:'2025-02-10'},
 {title:'Febbraio precedente',category:'purchase_replacement',amountCents:1500,spentOn:'2024-02-28'},
 {title:'Giorno bisestile demo',category:'purchase_replacement',amountCents:9900,spentOn:'2024-02-29'},
 {title:'Intervento precedente',category:'repairs_works',amountCents:12000,spentOn:'2025-10-08'},
 ]){const r=await backend.economy.handle({method:'POST',path:'',headers:{'idempotency-key':crypto.randomUUID()},body},owner.id,home.id,'expenses');if(r.status!==201)throw Error('Seed mock failed');}
let failure:403|503|null=null;
const handle=backend.handle.bind(backend);
backend.handle=async req=>{
 if(failure&&req.method==='GET'&&req.path.includes('/economy/summary')&&req.path.includes('from=2026-09-01'))return {status:failure,body:{error:{code:failure===403?'forbidden':'unavailable',message:'Errore simulato',requestId:'mock-monthly-check'}}};
 return handle(req);
};
let cookie: string | undefined;
const api=new ApiClient({fetch:async(url,init)=>{
 const headers: Record<string,string>={};new Headers(init.headers).forEach((v,k)=>headers[k]=v);
 const res=await backend.handle({method:init.method??'GET',path:url.replace(/^\/api\/v5/,''),headers,body:typeof init.body==='string'?JSON.parse(init.body):undefined,cookie:init.credentials==='include'?cookie:undefined});
 if(res.setCookie!==undefined)cookie=res.setCookie??undefined;
 return new Response(res.status===204?null:JSON.stringify(res.body),{status:res.status,headers:{'Content-Type':'application/json'}});
}});
await api.login({email:owner.email,password:'password-demo-001'});
const router=createMemoryRouter(routes,{initialEntries:[`/home/${home.id}/spese`]});
const queryClient=createQueryClient();
Object.assign(window,{speseMock:{backend,router,homeId:home.id,async failMonthly(status:403|503|null){failure=status;await queryClient.invalidateQueries({predicate:q=>q.queryKey.includes('summary')&&String(q.queryKey.at(-1)).includes('2026-09-01')});}}});
createRoot(document.getElementById('root')!).render(<AppProviders api={api} queryClient={queryClient}><RouterProvider router={router}/></AppProviders>);
