import {useCallback,useEffect,useEffectEvent,useLayoutEffect,useRef,useState} from 'react';

/** Refresh only reads. Dirty forms and uncertain requests retain their original state and key. */
export function useDeferredRefresh(token:number|undefined,blocked:boolean,refresh:()=>void,liveBlocked?:()=>boolean){
 const [seen,setSeen]=useState(token),due=token!==undefined&&token!==seen;
 const update=useEffectEvent(()=>{if(blocked||liveBlocked?.())return;setSeen(token);refresh();});
 useEffect(()=>{if(!due||blocked)return;let active=true;queueMicrotask(()=>{if(active)update();});return()=>{active=false;};},[token,due,blocked]);
 return due;
}
export function useDraftRegistry(){
 const [drafts,setDrafts]=useState<Record<string,boolean>>({}),current=useRef(drafts);
 const track=useCallback((id:string,dirty:boolean)=>{current.current={...current.current,[id]:dirty};setDrafts(old=>old[id]===dirty||!dirty&&!old[id]?old:{...old,[id]:dirty});},[]);
 const isDirty=useCallback(()=>Object.values(current.current).some(Boolean),[]);
 return {dirty:Object.values(drafts).some(Boolean),track,isDirty};
}
export function useDraftSignal(id:string,dirty:boolean,track:((id:string,dirty:boolean)=>void)|undefined){
 useLayoutEffect(()=>{track?.(id,dirty);return()=>track?.(id,false);},[id,dirty,track]);
}
export const deferredRefreshMessage='Nuovi dati disponibili. Le tue scelte e gli invii in corso sono conservati: questa scheda si aggiornerà quando avrai concluso.';
