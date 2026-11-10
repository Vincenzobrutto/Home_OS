import {useEffect,useRef,useState} from 'react';
import type {ApiTransport} from '../api/transport';
import {ApiError} from '../api/errors';

export const stageLabels={preparation:'Preparazione',marketing:'Annuncio e visite',negotiation:'Trattativa',closing:'Verso la stipula',completed:'Stipula conclusa'} as const;
export type Profile={seller:string;email:string;phone:string;address:string;cadastral:string;accessories:string;askingPrice:string;mandateStart:string;mandateEnd:string;commission:string;exclusive:string};
export const profileLabels:Record<keyof Profile,string>={seller:'Venditore',email:'Email',phone:'Telefono',address:'Indirizzo immobile',cadastral:'Identificativi catastali',accessories:'Pertinenze',askingPrice:'Prezzo richiesto',mandateStart:'Inizio incarico',mandateEnd:'Scadenza incarico',commission:'Provvigione venditore',exclusive:'Esclusiva'};
export const emptyProfile=():Profile=>Object.fromEntries(Object.keys(profileLabels).map(k=>[k,''])) as Profile;
export type ChecklistState={answers:Record<string,'yes'|'no'|'check'>;custom:Array<{id:string;label:string;when:string}>;assignments:Record<string,string>;waiting:string[];purchaseRequests?:Array<'floor_plan'|'cadastral'>};
export type Journey={profile:Profile;mandateSourceId:string|null;mandateVersion:number|null;checklist:ChecklistState;stage:keyof typeof stageLabels;listing:{title:string;description:string};transaction:{buyer:string;offerPrice:string;outcome:string;mortgage:string;notary:string;closingDate:string;tasks:string}};
export type JourneySnapshot={revision:number;state:Journey;profileStale:boolean};
export type JourneyCommand=
 |{operation:'profile';profile:Profile;sourceId:string|null;version:number|null}
 |{operation:'checklist';checklist:ChecklistState}
 |{operation:'stage';stage:Journey['stage']}
 |{operation:'listing';listing:Journey['listing']}
 |{operation:'transaction';transaction:Journey['transaction']};

export function useJourney(api:Pick<ApiTransport,'callJson'>,root:string,accountId:string,onSaved:()=>void){
 const [snapshot,setSnapshot]=useState<JourneySnapshot|null>(null);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const flight=useRef(false),live=useRef(true);
 const pending=useRef<{key:string;body:{expectedRevision:number;command:JourneyCommand}}|null>(null);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{const c=new AbortController();api.callJson<JourneySnapshot>(root+'/journey',{accountId,signal:c.signal}).then(s=>{if(!c.signal.aborted){setSnapshot(s);setError('');}}).catch(()=>{if(!c.signal.aborted)setError('Dati della pratica non disponibili. Riprova.');});return()=>c.abort();},[api,root,accountId,reload]);
 async function save(command:JourneyCommand){
  if(flight.current||!snapshot)return false;
  flight.current=true;setBusy(true);setError('');setNotice('');
  try{
   let request=pending.current;
   if(!request){
    const current=await api.callJson<JourneySnapshot>(root+'/journey',{accountId});
    const section=command.operation;
    if(JSON.stringify(current.state[section])!==JSON.stringify(snapshot.state[section]))throw new ApiError({kind:'http',status:409,code:'revision_conflict',message:'Changed'});
    request={key:crypto.randomUUID(),body:{expectedRevision:current.revision,command}};
    pending.current=request;setUncertain(true);
   }
   const result=await api.callJson<JourneySnapshot>(root+'/journey',{method:'POST',accountId,idempotencyKey:request.key,body:request.body});
   if(live.current){pending.current=null;setUncertain(false);setSnapshot(result);setNotice('Modifiche salvate nella pratica.');onSaved();}
   return true;
  }catch(e){
   if(live.current){
    if(e instanceof ApiError&&e.kind==='http'&&e.status<500&&e.status!==408){pending.current=null;setUncertain(false);}
    setError(e instanceof ApiError&&e.status===409?'La pratica è cambiata. Ricarica i dati prima di salvare.':'Salvataggio non concluso. Riprova lo stesso salvataggio.');
   }
   return false;
  }finally{flight.current=false;if(live.current)setBusy(false);}
 }
 function refresh(){if(flight.current)return;pending.current=null;setUncertain(false);setReload(v=>v+1);}
 return {snapshot,error,notice,dismissNotice:()=>setNotice(''),busy,save,refresh,retry:()=>pending.current?save(pending.current.body.command):Promise.resolve(false),uncertain};
}
