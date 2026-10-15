import { digest } from '../security';
import { object, uuid, version, invalid } from '../review/domain';
import { ProviderFailure, type Snapshot } from '../review/provider';
import { amountCents } from '../expenses/domain';
import { calendar } from '../activities/domain';
import { categories, category, expenseValues, text } from './domain';
export type Citation={documentId:string;documentVersion:number;sha256:string;page:number;excerpt:string};
export type Candidate={id:string;amountCents:number;role:string;label:string;sources:Citation[]};
export type Proposed={value:string;sources:Citation[]};
export type EconomicOutput={documentKind:'utility_bill'|'simple_invoice';proposedFields:Record<string,Proposed>;amountCandidates:Candidate[];amountSelectionRequired:boolean};
const roles=['current_document_total','amount_due','arrears_balance','taxable','tax','line_total','other'];
const dateKeys=['documentDate','competenceFrom','competenceTo','dueOn'];
const keys=['title','supplier','category','documentNumber',...dateKeys];
const normalized=(s:string)=>s.normalize('NFC').replace(/\s+/g,' ').trim();
export function citation(input:unknown,pages:string[],snapshot:Snapshot):Citation {
  const r=object(input,['documentId','documentVersion','sha256','page','excerpt']);
  if(r.documentId!==snapshot.documentId||r.documentVersion!==snapshot.documentVersion||r.sha256!==snapshot.documentSha256||typeof r.page!=='number'||!Number.isSafeInteger(r.page)||r.page<1||r.page>pages.length||typeof r.excerpt!=='string'||![...r.excerpt].length||[...r.excerpt].length>2000||!normalized(pages[r.page-1]).includes(normalized(r.excerpt)))throw new ProviderFailure('evidence_unverified');
  return {documentId:snapshot.documentId,documentVersion:snapshot.documentVersion,sha256:snapshot.documentSha256,page:r.page,excerpt:r.excerpt};
}
function sources(input:unknown,pages:string[],snapshot:Snapshot){if(!Array.isArray(input)||!input.length||input.length>10)throw new ProviderFailure('evidence_unverified');return input.map(s=>citation(s,pages,snapshot));}
export function validateOutput(input:unknown,pages:string[],snapshot:Snapshot):EconomicOutput {
  try {
    const r=object(input,['documentKind','proposedFields','amountCandidates']);
    if(r.documentKind!=='utility_bill'&&r.documentKind!=='simple_invoice')throw invalid();
    const proposed=object(r.proposedFields,keys),fields:Record<string,Proposed>={};
    for(const [key,raw]of Object.entries(proposed)) {
      const row=object(raw,['value','sources']),refs=sources(row.sources,pages,snapshot);
      const value=key==='category'?category(row.value):dateKeys.includes(key)?calendar(row.value):text(row.value,key==='documentNumber'?80:120);
      if(!value)throw invalid();
      const claims=refs.map(s=>normalized(s.excerpt).toLocaleLowerCase('it')).join(' ');
      if(key==='category') {
        const labels:Record<string,RegExp>={electricity:/elettric|electric/,gas:/\bgas\b/,water:/acqua|water/,internet_services:/internet/,maintenance:/manutenzion/,repairs_works:/riparazion/,purchase_replacement:/acquisto|sostituzion/};
        if(!labels[value]?.test(claims))throw new ProviderFailure('evidence_unverified');
      }else if(!claims.includes(normalized(value).toLocaleLowerCase('it')))throw new ProviderFailure('evidence_unverified');
      fields[key]={value,sources:refs};
    }
    if(!Array.isArray(r.amountCandidates)||!r.amountCandidates.length||r.amountCandidates.length>10)throw new ProviderFailure('no_supported_economic_data');
    const ids=new Set<string>(),candidates=r.amountCandidates.map(raw=>{const row=object(raw,['id','amountCents','role','label','sources']);if(typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id)||typeof row.role!=='string'||!roles.includes(row.role))throw invalid();ids.add(row.id);const amount=amountCents(row.amountCents),refs=sources(row.sources,pages,snapshot);const values=refs.flatMap(s=>[...s.excerpt.matchAll(/(?<![\d.,])([0-9]+)[.,]([0-9]{2})(?!\d)/g)].map(m=>BigInt(m[1])*100n+BigInt(m[2])));if(!values.includes(BigInt(amount)))throw new ProviderFailure('evidence_unverified');return {id:row.id,amountCents:amount,role:row.role,label:text(row.label,120)!,sources:refs};});
    const current=candidates.filter(c=>c.role==='current_document_total');
    return {documentKind:r.documentKind,proposedFields:fields,amountCandidates:candidates,amountSelectionRequired:candidates.some(c=>c.role==='arrears_balance')||current.length!==1};
  }catch(e){if(e instanceof ProviderFailure)throw e;throw new ProviderFailure('analysis_invalid_output');}
}
export function analysisBody(input:unknown){const r=object(input,['documentId','provider','consentToProviderTransfer']);if(r.provider!=='test_fixture_v1'&&r.provider!=='anthropic')throw invalid('Scegli esplicitamente il provider.');if(r.consentToProviderTransfer!==undefined&&typeof r.consentToProviderTransfer!=='boolean')throw invalid();if(r.provider==='anthropic'&&r.consentToProviderTransfer!==true)throw invalid('Autorizza esplicitamente l’invio ad Anthropic.');return {documentId:uuid(r.documentId),provider:r.provider,consentToProviderTransfer:r.consentToProviderTransfer??false};}
export function confirmBody(input:unknown,today:string){const r=object(input,['expectedVersion','mode','values','amountSelection','expenseId','expectedExpenseVersion']);const expectedVersion=version(r.expectedVersion);
  if(r.mode==='link_existing'){if(Object.hasOwn(r,'values')||Object.hasOwn(r,'amountSelection'))throw invalid();return {expectedVersion,mode:'link_existing' as const,expenseId:uuid(r.expenseId),expectedExpenseVersion:version(r.expectedExpenseVersion)};}
  if(r.mode!=='create'||Object.hasOwn(r,'expenseId')||Object.hasOwn(r,'expectedExpenseVersion'))throw invalid();const selection=object(r.amountSelection,['mode','candidateId']);if(selection.mode!=='candidate'&&selection.mode!=='manual'||selection.mode==='manual'&&selection.candidateId!==undefined||selection.mode==='candidate'&&(typeof selection.candidateId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(selection.candidateId)))throw invalid();const raw=object(r.values,['title','amountCents','spentOn','note','category','supplier','documentNumber','documentDate','competenceFrom','competenceTo','dueOn','objectRef','workId']);return {expectedVersion,mode:'create' as const,values:expenseValues(raw,today),amountSelection:{mode:selection.mode as 'candidate'|'manual',...(selection.candidateId!==undefined?{candidateId:String(selection.candidateId)}:{})}};
}
export function outputDigest(output:EconomicOutput){return digest(JSON.stringify(output));}
export const supportedCategories=categories.filter(c=>['electricity','gas','water','internet_services','maintenance','repairs_works','purchase_replacement'].includes(c));
