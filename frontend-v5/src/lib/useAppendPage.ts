import {useLayoutEffect, useRef, useState} from 'react';

type Anchor = {scope:string; count:number; id:string; top:number};
/** Keep the last existing row stationary and focus the first appended link. */
export function useAppendPage(scope:string, ids:string[], fetchNextPage:()=>Promise<unknown>) {
  const pending=useRef<Anchor | null>(null);
  const [notice,setNotice]=useState<{scope:string;added:number;total:number} | null>(null);
  useLayoutEffect(()=>{
    const anchor=pending.current;
    if(!anchor)return;
    if(anchor.scope!==scope){pending.current=null;return;}
    if(ids.length<=anchor.count)return;
    pending.current=null;
    const element=document.getElementById(anchor.id);
    if(element)window.scrollTo(0,Math.max(0,window.scrollY+element.getBoundingClientRect().top-anchor.top));
    document.getElementById(ids[anchor.count]!)?.focus({preventScroll:true});
    setNotice({scope,added:ids.length-anchor.count,total:ids.length});
  },[scope,ids]);
  const loadMore=()=>{
    const id=ids.at(-1),element=id?document.getElementById(id):null;
    if(element&&id){
      pending.current={scope,count:ids.length,id,top:element.getBoundingClientRect().top};
      element.focus({preventScroll:true});
    }
    return fetchNextPage();
  };
  return {loadMore,notice:notice?.scope===scope?notice:null};
}
