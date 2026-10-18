import { digest } from '../security';
import type { ProductSource } from '../object-onboarding/domain';
import type { DocumentUnderstanding } from '../object-onboarding/understanding';
import { values } from './domain';
export type ContactProposal={id:string;values:ReturnType<typeof values>;sources:Record<string,ProductSource>;warnings:string[]};
const compact=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('it').replace(/[^\p{L}\p{N}]/gu,'');
export function vatValid(s:string){if(!/^\d{11}$/.test(s))return false;let n=0;for(let i=0;i<10;i++){let d=Number(s[i]);if(i%2){d*=2;if(d>9)d-=9;}n+=d;}return (10-n%10)%10===Number(s[10]);}
/** A party is accepted only inside a proven issuer block, never from the customer's or manufacturers' data. */
export function contactProposal(info:DocumentUnderstanding|undefined,pages?:string[]):ContactProposal|null {
 if(!info||!['conformity_declaration','invoice','system_diagram','system_booklet','other'].includes(info.kind))return null;
 const facts=info.facts.filter(f=>f.subjectIndex===-1),name=facts.find(f=>f.field==='issuer');if(!name)return null;
 const source=name.source,quote=source.excerpt,cleanName=name.value.replace(/^(?:titolare o legale rappresentante dell['’]impresa\s*\(ragione sociale\)|(?:impresa\s+installatrice|ragione\s+sociale|installatore|cedente\s*\/\s*prestatore)\s*:?)\s*/iu,'').trim(),professional=/impresa|ditta|installatric|installatore|cedente|prestatore|ragione\s+sociale/iu,recipient=/cessionario|committente|destinatario|cliente|costruttore|produttore/iu;
 let end=Infinity,start=-1,page='';const normalize=(s:string)=>s.normalize('NFKC').replace(/\s+/gu,' ').trim();
 if(pages){page=normalize(pages[source.page-1]??'');start=page.indexOf(normalize(name.value));const boundary=page.search(/cessionario|committente|destinatario|cliente/iu);if(boundary>=0)end=boundary;if(start<0||start>=end)return null;}
 const work=info.facts.find(f=>f.field==='interventionDescription')?.value??'';
 const works=/(?:installaz|adeguamento|manutenz|riparaz|sostituz|intervento|lavori)/iu.test(work);
 if(recipient.test(quote)||!(professional.test(quote)||info.kind==='invoice'&&!!pages&&end!==Infinity&&works))return null;
 if(info.kind==='invoice'&&!works&&!/installatore|installatrice|tecnico|elettricista|idraulico/iu.test(quote))return null;
 const proposal:ContactProposal={id:digest(source.documentId+':issuer:'+compact(cleanName)),values:values({name:cleanName,kind:/impresa|ditta|ragione\s+sociale/iu.test(quote)?'company':'person',profession:/elettric/iu.test(work+' '+quote)?'Elettricista / installatore':'Installatore / professionista'}),sources:{name:source},warnings:[]};
 const owned=(proof:ProductSource,value:string)=>{if(proof.page!==source.page)return false;if(pages){const text=normalize(proof.excerpt),at=page.indexOf(text);return at>=0&&at>=Math.max(0,start-200)&&(at>=start||compact(text).includes(compact(name.value)))&&at+text.length<=end&&at-start<1500&&page.indexOf(text,at+1)<0;}return compact(proof.excerpt).includes(compact(name.value))&&!recipient.test(proof.excerpt)&&compact(proof.excerpt).includes(compact(value));};
 for(const [field,key]of [['issuerPhone','phone'],['issuerEmail','email'],['issuerVatId','fiscalId'],['issuerFiscalId','fiscalId']] as const){const fact=facts.find(f=>f.field===field);if(!fact||key==='fiscalId'&&proposal.values.fiscalId)continue;try{if(!owned(fact.source,fact.value))throw Error('party');let value=fact.value;if(field==='issuerPhone')value=value.replace(/^(?:tel(?:efono)?\.?|cell(?:ulare)?\.?)\s*:?\s*/iu,'');if(field==='issuerEmail')value=value.replace(/^(?:e-?mail)\s*:?\s*/iu,'');if(field==='issuerVatId')value=value.replace(/^(?:partita\s*iva|p\.?\s*iva)\s*:?\s*/iu,'');if(field==='issuerFiscalId')value=value.replace(/^(?:codice\s*fiscale|c\.?\s*f\.?)\s*:?\s*/iu,'');if(field==='issuerVatId'){value=value.replace(/^IT\s*/i,'').replace(/\s/g,'');if(!vatValid(value))throw Error('vat');}if(field==='issuerFiscalId'&&!/^[A-Z0-9]{16}$/i.test(value.replace(/\s/g,'')))throw Error('fiscal');proposal.values=values({...proposal.values,[key]:value});proposal.sources[key]=fact.source;}catch{proposal.warnings.push(key);}}
 return proposal;
}
