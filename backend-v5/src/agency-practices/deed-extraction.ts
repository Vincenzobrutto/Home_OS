import { createHash } from 'node:crypto';
import { PracticeError, requirePractice, sourceReadable, type Actor, type Practice } from './domain';

// Inputs named Trusted must be obtained by the server from its decoder/storage.
// This adapter is not a decoder, provider client or legal/semantic verifier.
export type TrustedDeedText = { sourceId:string; version:number; sha256:string; parserVersion:string; pages:Array<{page:number;text:string}> };
const FIELDS = ['party.name','cadastral.municipality','cadastral.sheet','cadastral.parcel','cadastral.subaltern','deed.date'] as const;
const ROLES = ['historical_owner','acquirer_in_deed','deceased','declared_heir','unresolved'] as const;
function invalid():never { throw new PracticeError('invalid_input'); }
function object(v:unknown,keys:string[]) {
  if (!v || typeof v!=='object' || Array.isArray(v) || Object.getPrototypeOf(v)!==Object.prototype || Object.keys(v).some(k=>!keys.includes(k))) invalid();
  return v as Record<string,unknown>;
}
function text(v:unknown,max:number,multiline=false):string {
  if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32&&!(multiline&&['\n','\r','\t'].includes(c)))) invalid();
  return v.trim();
}
function positive(v:unknown) { if(!Number.isSafeInteger(v)||Number(v)<1) invalid(); return Number(v); }
const normalized=(s:string)=>s.normalize('NFC').replace(/\s+/gu,' ').trim();
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function literalValue(excerpt:string,value:string) {
  let at=excerpt.indexOf(value);
  while(at>=0) {
    const before=at?Array.from(excerpt.slice(0,at)).at(-1)!:'',after=Array.from(excerpt.slice(at+value.length))[0]||'';
    if(!/[\p{L}\p{N}_]/u.test(before)&&!/[\p{L}\p{N}_]/u.test(after)) return true;
    at=excerpt.indexOf(value,at+1);
  }
  return false;
}

export function reviewDeedExtraction(actor:Actor,practice:Practice,trusted:TrustedDeedText,input:unknown,now:string) {
  requirePractice(actor,practice,'read',now);
  const source=practice.sources.find(s=>s.id===trusted.sourceId);
  if(!source||!sourceReadable(actor,practice,source,now)) throw new PracticeError('access_denied');
  const current=source.versions.at(-1)!;
  if(current.version!==trusted.version||current.sha256!==trusted.sha256) throw new PracticeError('source_changed');
  if(!['deed','succession'].includes(source.kind)) invalid();
  const parserVersion=text(trusted.parserVersion,100);
  if(!Array.isArray(trusted.pages)||trusted.pages.length>50) invalid();
  const pages=trusted.pages.map(p=>{
    const r=object(p,['page','text']);
    if(typeof r.text!=='string'||r.text.length>200_000) invalid();
    return {page:positive(r.page),text:r.text,canonical:normalized(r.text),textSha256:digest(r.text)};
  }).sort((a,b)=>a.page-b.page);
  if(pages.reduce((n,p)=>n+p.text.length,0)>2_000_000) invalid();
  if(new Set(pages.map(p=>p.page)).size!==pages.length) invalid();
  const r=object(input,['sourceId','version','sha256','candidates']);
  if(r.sourceId!==source.id||r.version!==current.version||r.sha256!==current.sha256) throw new PracticeError('source_changed');
  if(!Array.isArray(r.candidates)||r.candidates.length>100) invalid();
  const candidates=r.candidates.map(value=>{
    const c=object(value,['id','field','value','subjectRef','unitRef','role','page','excerpt']);
    const id=text(c.id,100),field=text(c.field,100),proposedValue=text(c.value,500),subjectRef=text(c.subjectRef,100),unitRef=text(c.unitRef,100),role=text(c.role,100),page=positive(c.page),excerpt=text(c.excerpt,4000,true);
    if(!FIELDS.includes(field as typeof FIELDS[number])||!ROLES.includes(role as typeof ROLES[number])) invalid();
    if(field!=='party.name'&&role!=='unresolved') invalid();
    return {id,field,proposedValue,subjectRef,unitRef,role,page,excerpt};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  if(new Set(candidates.map(c=>c.id)).size!==candidates.length) invalid();
  const issues:Array<{candidateId:string|null;code:'text_unavailable'|'page_unavailable'|'excerpt_not_found'|'value_not_in_excerpt'|'date_not_supported'}>=[];
  const proposals=candidates.flatMap(c=>{
    const page=pages.find(p=>p.page===c.page);
    const reject=(code:typeof issues[number]['code'])=>{issues.push({candidateId:c.id,code});return [];};
    if(!page) return reject('page_unavailable');
    if(!page.canonical) return reject('text_unavailable');
    const excerpt=normalized(c.excerpt),value=normalized(c.proposedValue);
    if(!page.canonical.includes(excerpt)) return reject('excerpt_not_found');
    if(!literalValue(excerpt,value)) return reject('value_not_in_excerpt');
    // This first contract supports only literal ISO dates. Italian written
    // dates need a separately tested converter; no inferred transformation.
    if(c.field==='deed.date'&&(!/^\d{4}-\d{2}-\d{2}$/u.test(value)||Number(value.slice(0,4))<1||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)) return reject('date_not_supported');
    return [{candidateId:c.id,field:c.field,proposedValue:c.proposedValue,documentSubjectRef:c.subjectRef,documentUnitRef:c.unitRef,proposedDocumentRole:c.role,status:'unbound_proposal' as const,evidence:{sourceId:source.id,version:current.version,sha256:current.sha256,page:c.page,excerpt:c.excerpt},pageTextSha256:page.textSha256,lexicalEvidenceVerified:true as const,semanticEvidenceVerified:false as const,requiresHumanBinding:true as const}];
  });
  if(!pages.some(p=>p.canonical)&&!candidates.length) issues.push({candidateId:null,code:'text_unavailable'});
  const basis={practiceId:practice.id,sourceId:source.id,version:current.version,sha256:current.sha256,parserVersion,pages:pages.map(p=>[p.page,p.textSha256]),candidates};
  return {sourceId:source.id,version:current.version,sha256:current.sha256,parserVersion,proposals,issues,fingerprint:digest(basis),certification:false as const,completenessAssessed:false as const,canApplyAutomatically:false as const};
}
