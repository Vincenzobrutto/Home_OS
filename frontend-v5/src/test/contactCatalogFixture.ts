// Isolated test/browser fixture. All contacts and requests stay in memory.
import {FakeBackend} from './fakeBackend';
import {ApiClient,type FetchLike} from '../api/client';
import type {Contact} from '../contacts/types';
export async function contactCatalogFixture(){
 const backend=new FakeBackend(),account=backend.seedAccount('Demo Rubrica','rubrica@example.test','synthetic-password'),home=backend.seedHome(account.id,'Casa dimostrativa','Indirizzo fittizio');
 const names=['Anna Bianchi','Boreale Impianti','Carlo Fontana','Elena Costa','Luca Moretti','Officina Verde','Paolo Conti','Sofia Riva','Studio Alba','Tecnica Nord','Ugo Ferrari','Valeria Russo','Walter Galli','Zeno Fabbri'];
 const rows:Contact[]=names.map((name,i)=>({id:'contact-'+i,homeId:home.id,name,profession:['Architetta','Riscaldamento','Idraulico','Elettricista','Serramentista','Giardinaggio','Tecnico caldaia','Amministratrice'][i%8]!,phone:i===8?null:'000 000 '+String(i+1).padStart(4,'0'),email:i===6||i===8?null:'contatto'+i+'@example.test',kind:i===1?'company':'person',fiscalId:null,note:null,state:i===13?'archived':'active',version:1,permissions:['read','edit']}));
 let cookie:string|undefined;const calls:Array<{path:string;method:string}>=[];
 const fetch:FetchLike=async(url,init)=>{
  const path=url.replace(/^\/api\/v5/,''),method=init.method??'GET';calls.push({path,method});
  const u=new URL(path,'http://synthetic.test');
  if(u.pathname.includes('/contacts')){
   if(method!=='GET')return Response.json({error:{code:'fixture_read_only',message:'Collaudo in sola lettura: nessun dato salvato'}},{status:409});
   const suffix=u.pathname.split('/contacts')[1];
   if(suffix?.endsWith('/links'))return Response.json({items:[{id:'link-demo',resource:{kind:'document',id:'synthetic-source'},name:'Fattura di collaudo',href:'/home/'+home.id+'/documenti/synthetic-source'}],nextCursor:null});
   if(suffix)return Response.json({contact:rows.find(c=>c.id===suffix.slice(1))});
   const q=(u.searchParams.get('q')??'').toLowerCase(),state=u.searchParams.get('state')??'active',offset=Number(u.searchParams.get('cursor')??0);
   const filtered=rows.filter(c=>(state==='all'||c.state===state)&&(!q||c.name.toLowerCase().includes(q)||c.profession?.toLowerCase().includes(q)));
   return Response.json({items:filtered.slice(offset,offset+8),nextCursor:offset+8<filtered.length?String(offset+8):null});
  }
  const headers:Record<string,string>={};new Headers(init.headers).forEach((v,k)=>{headers[k.toLowerCase()]=v;});
  const reply=await backend.handle({method,path,headers,body:typeof init.body==='string'?JSON.parse(init.body):undefined,cookie});
  if(reply.setCookie!==undefined)cookie=reply.setCookie??undefined;
  return Response.json(reply.body,{status:reply.status});
 };
 const api=new ApiClient({fetch});await api.login({email:account.email,password:'synthetic-password'});await api.getSession();
 return {backend,account,home,api,fetch,rows,calls};
}
