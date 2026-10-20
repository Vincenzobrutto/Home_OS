// Isolated test/browser fixture: every write is confined to these in-memory objects.
import { ApiClient, type FetchLike } from '../api/client';
import type { Contact, ContactLink, Resource } from '../contacts/types';
import { contactCatalogFixture } from './contactCatalogFixture';

export async function contactActionsFixture(){
 const fixture=await contactCatalogFixture(),contact=fixture.rows[0]!;
 contact.note='Contatto fittizio per il collaudo delle azioni.';
 let links:ContactLink[]=[
  {id:'link-invoice',resource:{kind:'document',id:'synthetic-invoice'},name:'Fattura impianto di collaudo',href:'/home/'+fixture.home.id+'/documenti/synthetic-invoice'},
  {id:'link-object',resource:{kind:'object',id:'synthetic-object'},name:'Impianto di collaudo',href:'/home/'+fixture.home.id+'/oggetti/object/synthetic-object'},
 ];
 const writes:Array<{path:string;body:{expectedVersion:number;resource?:Resource};key:string|null}>=[],receipts=new Map<string,Contact>();
 let rejectNext=false;
 const fetch:FetchLike=async(url,init)=>{
  const u=new URL(url,'http://synthetic.test'),prefix='/api/v5/homes/'+fixture.home.id+'/contacts/'+contact.id;
  if(u.pathname===prefix+'/links')return Response.json({items:links,nextCursor:null});
  if(u.pathname.startsWith(prefix+'/')&&init.method==='POST'){
   const op=u.pathname.slice(prefix.length+1),body=JSON.parse(String(init.body)),key=new Headers(init.headers).get('Idempotency-Key');
   writes.push({path:u.pathname,body,key});
   if(rejectNext){rejectNext=false;return Response.json({error:{code:'version_conflict',message:'Il contatto è cambiato. Rileggi i dati prima di riprovare.'}},{status:409});}
   if(receipts.has(key!))return Response.json({contact:receipts.get(key!)});
   if(body.expectedVersion!==contact.version)return Response.json({error:{code:'version_conflict',message:'Versione non aggiornata.'}},{status:409});
   if(op==='archive')contact.state='archived';
   else if(op==='restore')contact.state='active';
   else if(op==='unlink')links=links.filter(l=>l.resource.kind!==body.resource?.kind||l.resource.id!==body.resource?.id);
   else return Response.json({error:{code:'fixture_read_only',message:'Operazione non prevista dal collaudo.'}},{status:409});
   contact.version++;receipts.set(key!,structuredClone(contact));return Response.json({contact});
  }
  return fixture.fetch(url,init);
 };
 const api=new ApiClient({fetch});await api.getSession();
 return {...fixture,api,fetch,contact,writes,getLinks:()=>links,rejectNext:()=>{rejectNext=true;}};
}
