const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const TOKEN=/^[A-Za-z0-9_-]{43}$/u;
function giftId(input:unknown):string|null{
 return typeof input==='string'&&input.length===36&&UUID.test(input)?input.toLowerCase():null;
}
function giftToken(input:unknown):input is string{return typeof input==='string'&&input.length===43&&TOKEN.test(input);}

/** Personal-link credentials live only in this instance and are lost on reload. */
export function createGiftLinkMemory(){
 const tokens=new Map<string,{token:string;proof?:string}>();
 const clearAll=()=>{tokens.clear();};
 return {
  capture(invitationId:unknown,fragment:unknown):boolean{
   const id=giftId(invitationId);
   if(!id||typeof fragment!=='string'||(fragment.length!==50&&fragment.length!==101))return false;
   const match=/^#token=([A-Za-z0-9_-]{43})(?:&signup=([A-Za-z0-9_-]{43}))?$/u.exec(fragment);
   if(!match)return false;
   tokens.set(id,{token:match[1]!,...(match[2]?{proof:match[2]}:{})});return true;
  },
  get(invitationId:unknown):string|null{const id=giftId(invitationId);return id?tokens.get(id)?.token??null:null;},
  signupProof(invitationId:unknown):string|null{const id=giftId(invitationId);return id?tokens.get(id)?.proof??null:null;},
  forgetSignup(invitationId?:string):boolean{
   let changed=false;
   for(const [id,entry] of tokens){
    if(entry.proof&&(invitationId===undefined||id===giftId(invitationId))){delete entry.proof;changed=true;}
   }
   return changed;
  },
  clear(invitationId?:unknown):void{if(invitationId===undefined){clearAll();return;}const id=giftId(invitationId);if(id)tokens.delete(id);},
  clearAll,
 };
}

/** Authentication may return only to the token-free Gift path, never an arbitrary redirect. */
export function safeGiftNext(input:unknown):string{
 if(typeof input!=='string'||input.length!==42||!input.startsWith('/gift/'))return '/';
 const id=giftId(input.slice(6));return id?'/gift/'+id:'/';
}

/** Manual copying only; callers decide when to use the clipboard. No browser state is accessed. */
export function buildGiftLink(baseOrigin:string,invitationId:string,secret:string):string{
 const invalid=()=>new TypeError('Invalid Gift link input');
 const id=giftId(invitationId);
 if(!id||!giftToken(secret)||typeof baseOrigin!=='string'||baseOrigin.length>2048||/[\s\\]/u.test(baseOrigin))throw invalid();
 // Check the literal authority before URL normalization can hide dot paths or empty userinfo.
 const originMatch=/^https?:\/\/([^/?#]+)\/?$/iu.exec(baseOrigin);
 if(!originMatch||originMatch[1]!.includes('@'))throw invalid();
 let base:URL;
 try{base=new URL(baseOrigin);}catch{throw invalid();}
 if(!['http:','https:'].includes(base.protocol)||!base.hostname||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw invalid();
 const link=new URL('/gift/'+id,base.origin);link.hash='token='+secret;return link.toString();
}
