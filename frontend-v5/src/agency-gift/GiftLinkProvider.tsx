import {createContext,useContext,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useLocation,useNavigate} from 'react-router';
import {useSession} from '../session/session';
import {createGiftLinkMemory,safeGiftNext} from './gift-link-memory';
import {isGiftRoutePath} from './gift-route-path';

type Links={next:string|null;revision:number;get(id:string):string|null;signupProof(id:string):string|null;forget(id:string):void;forgetSignup(id:string):void};
type PendingNext={path:string;owner:string|null};
const Context=createContext<Links|null>(null);
function createCustody(){
 const tokens=createGiftLinkMemory();let pending:PendingNext|null=null;
 return {...tokens,pending:()=>pending,setNext(value:PendingNext|null){if(pending?.path===value?.path&&pending?.owner===value?.owner)return false;pending=value;return true;}};
}
/** Lives above keyed authenticated routes. Only a guest→first login carries credentials. */
export function GiftLinkProvider({children}:{children:ReactNode}){
 const [memory]=useState(createCustody),[revision,setRevision]=useState(0);
 const session=useSession(),location=useLocation(),navigate=useNavigate();
 const account=session.data===undefined?undefined:session.data.account?.id??null;
 const previous=useRef<string|null|undefined>(undefined);
 useLayoutEffect(()=>{
  let changed=false,identityCleared=false;
  if(account!==undefined){
   if(previous.current!=null&&previous.current!==account){memory.clearAll();memory.setNext(null);changed=true;identityCleared=true;}
   previous.current=account;
  }
  const canonical=safeGiftNext(location.pathname),pending=memory.pending();
  if(!identityCleared){
   if(canonical!=='/')changed=memory.setNext({path:canonical,owner:account??null})||changed;
   else if(account!==undefined&&account!==null&&pending?.owner===null)changed=memory.setNext({...pending,owner:account})||changed;
  }
  if(location.hash&&(isGiftRoutePath(location.pathname)||/^\/gift(?:\/|$)/iu.test(location.pathname))){
   // Recognition follows router decoding; adoption remains strict and canonical.
   changed=(canonical!=='/'&&memory.capture(location.pathname.slice(6),location.hash))||changed;
   void navigate({pathname:location.pathname,search:'',hash:''},{replace:true});
  }
  if(account)changed=memory.forgetSignup()||changed;
  if(changed)setRevision(v=>v+1);
 },[account,location.pathname,location.hash,location.key,memory,navigate]);
 const value=useMemo<Links>(()=>{
  const pending=memory.pending(),next=pending&&(account===undefined||pending.owner===null||pending.owner===account)?pending.path:null;
  return {next,revision,
   get(id){return previous.current!=null&&account!==undefined&&previous.current!==account?null:memory.get(id);},
   signupProof(id){return account===null?memory.signupProof(id):null;},
   forgetSignup(id){if(memory.forgetSignup(id))setRevision(v=>v+1);},
   forget(id){if(memory.get(id)!==null){memory.clear(id);setRevision(v=>v+1);}},
  };
 },[memory,account,revision]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGiftLinks(){const value=useContext(Context);if(!value)throw new Error('Gift link context unavailable');return value;}
