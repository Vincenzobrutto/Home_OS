import { calendar } from '../activities/domain';
import { amountCents, expenseLimits, spentOn } from '../expenses/domain';
import { invalid, object, uuid, version } from '../review/domain';

export const categories = ['electricity','gas','water','internet_services','condominium_ordinary','condominium_extraordinary','insurance','taxes','maintenance','repairs_works','purchase_replacement','financing','other'] as const;
export type Category = typeof categories[number];
export const families = ['utilities','condominium','taxes_insurance','maintenance_repairs','works_purchases','financing','unclassified'] as const;
export type Family = typeof families[number];
export const categoryLabels = ['Energia elettrica','Gas','Acqua','Internet e servizi','Condominio ordinario','Condominio straordinario','Assicurazione','Tributi','Manutenzione','Riparazioni e lavori','Acquisti e sostituzioni','Finanziamento','Altro'];
export const familyLabels = ['Bollette','Condominio','Tasse e assicurazioni','Manutenzione e riparazioni','Lavori e acquisti','Mutuo e finanziamenti','Altro / Non classificata'];
export type ObjectRef = {kind:'object'|'boiler';id:string};
export function family(category: Category | null, workId: string | null): Family {
  if (category && ['electricity','gas','water','internet_services'].includes(category)) return 'utilities';
  if (category === 'condominium_ordinary') return 'condominium';
  if (category === 'taxes' || category === 'insurance') return 'taxes_insurance';
  if (category === 'maintenance' || (category === 'repairs_works' && !workId)) return 'maintenance_repairs';
  if (category && ['condominium_extraordinary','purchase_replacement','repairs_works'].includes(category)) return 'works_purchases';
  return category === 'financing' ? 'financing' : 'unclassified';
}
export function text(input: unknown, max: number, nullable = false): string | null {
  if (input === null && nullable) return null;
  if (typeof input !== 'string') throw invalid();
  const value = input.trim().normalize('NFC');
  if ([...value].length > max || (!value && !nullable)) throw invalid();
  return value || null;
}
export function category(input: unknown): Category | null {
  if (input === null) return null;
  if (typeof input !== 'string' || !categories.includes(input as Category)) throw invalid();
  return input as Category;
}
export function ref(input: unknown): ObjectRef | null {
  if (input === null) return null;
  const row = object(input, ['kind','id']);
  if (row.kind !== 'object' && row.kind !== 'boiler') throw invalid();
  return {kind:row.kind,id:uuid(row.id)};
}
export const metadataFields = ['category','supplier','documentNumber','documentDate','invoiceMonth','competenceFrom','competenceTo','dueOn','workId'] as const;
export const valueFields = ['title','amountCents','spentOn','note','documentId','objectRef',...metadataFields];
export function expenseValues(input: unknown, today: string, update = false) {
  const row = object(input, update ? ['expectedVersion',...valueFields] : valueFields);
  if (update && !valueFields.some(k=>Object.hasOwn(row,k))) throw invalid();
  const result: Record<string, unknown> = update ? {expectedVersion:version(row.expectedVersion)} : {};
  for (const key of valueFields) {
    if (update && !Object.hasOwn(row,key)) continue;
    const value = row[key];
    if(key==='invoiceMonth'){if(value!==undefined){if(value!==null&&(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value.startsWith('0000')))throw invalid();result[key]=value;}continue;}
    if (key === 'title') result.title = text(value,120);
    else if (key === 'amountCents') result.amountCents = amountCents(value);
    else if (key === 'spentOn') result.spentOn = spentOn(value,today);
    else if (key === 'category') result[key] = value === undefined ? null : category(value);
    else if (key === 'objectRef') result[key] = value === undefined ? null : ref(value);
    else if (key === 'workId' || key === 'documentId') result[key] = value == null ? null : uuid(value);
    else if (['documentDate','competenceFrom','competenceTo','dueOn'].includes(key)) result[key] = value === undefined ? null : calendar(value);
    else result[key] = value === undefined ? null : text(value,key === 'note' ? 500 : key === 'documentNumber' ? 80 : 120,true);
  }
  if (!update) competence(result);
  return result;
}
export function competence(row: {competenceFrom?:unknown;competenceTo?:unknown}) {
  if (Boolean(row.competenceFrom)!==Boolean(row.competenceTo) || (row.competenceFrom && row.competenceTo && String(row.competenceFrom)>String(row.competenceTo))) throw invalid('Indica entrambi gli estremi della competenza, in ordine.');
}
function queryText(input: unknown, allowed: readonly string[]) {
  if (input === undefined) return undefined;
  if (typeof input !== 'string' || !allowed.includes(input)) throw invalid(); return input;
}
export function pageQuery(input: Record<string,unknown>) {
  const limit=input.limit,cursor=input.cursor;
  if (limit!==undefined && (typeof limit!=='string'||!/^[1-9]\d?$/.test(limit)||Number(limit)>expenseLimits.maxPageSize)) throw invalid();
  if (cursor!==undefined && (typeof cursor!=='string'||!/^[A-Za-z0-9_-]{1,512}$/.test(cursor))) throw invalid();
  return {limit:Number(limit??20),cursor:cursor as string|undefined};
}
export function economyQuery(input: unknown, today: string, summary = false) {
  const row=object(input,['year','from','to','q','category','family','source','objectKind','objectId','roomId','workId','documentId',...(summary?[]:['state','limit','cursor'])]);
  if (row.year!==undefined && (typeof row.year!=='string'||!/^\d{4}$/.test(row.year)||row.year==='0000')) throw invalid();
  if (row.year!==undefined && (row.from!==undefined||row.to!==undefined)) throw invalid();
  if ((row.from===undefined)!==(row.to===undefined)) throw invalid();
  const year=row.year===undefined ? (row.from===undefined?today.slice(0,4):null) : row.year as string;
  const from=year?year+'-01-01':calendar(row.from)!,to=year?(year===today.slice(0,4)?today:year+'-12-31'):calendar(row.to)!;
  if (!from||!to||from>to) throw invalid();
  const cat=queryText(row.category,[...categories,'unclassified']),fam=queryText(row.family,families);
  if (cat && fam && ![family(cat==='unclassified'?null:cat as Category,null),...(cat==='repairs_works'?['works_purchases']:[])].includes(fam)) throw invalid('Categoria e famiglia non compatibili.');
  if ((row.objectKind===undefined)!==(row.objectId===undefined)) throw invalid();
  const objectKind=queryText(row.objectKind,['object','boiler']);
  return {year,from,to,category:cat,family:fam,source:queryText(row.source,['all','manual','document'])??'all',state:summary?'active':queryText(row.state,['active','archived','all'])??'active',
    q:row.q===undefined?'':text(row.q,120,true)??'',objectRef:objectKind?ref({kind:objectKind,id:row.objectId}):null,
    roomId:row.roomId===undefined?null:uuid(row.roomId),workId:row.workId===undefined?null:uuid(row.workId),documentId:row.documentId===undefined?null:uuid(row.documentId),...pageQuery(row)};
}
export function comparisonPeriod(from: string,to: string) {
  if (from.startsWith('0001')||to.startsWith('0001')) return null;
  let adjusted=false;
  const prior=(date:string)=>{const y=String(Number(date.slice(0,4))-1).padStart(4,'0');let value=y+date.slice(4);try{calendar(value)}catch{if(date.endsWith('-02-29')){value=y+'-02-28';adjusted=true}else throw invalid()}return value};
  const result={from:prior(from),to:prior(to)};
  return {...result,calendarAdjustment:adjusted?'leap_day_clamped' as const:'none' as const};
}
export function percent(delta: bigint,base: bigint): string|null {
  if (base<=0n) return null;
  const absolute=delta<0n?-delta:delta,scaled=absolute*10000n,rounded=(scaled+base/2n)/base;
  return (delta<0n?-rounded:rounded).toString();
}
export function workBody(input:unknown,update=false) {
  const row=object(input,update?['expectedVersion','name','note','activityId']:['name','note','activityId']);
  if(update&&!['name','note','activityId'].some(k=>Object.hasOwn(row,k)))throw invalid();
  return {...(update?{expectedVersion:version(row.expectedVersion)}:{}),...(!update||row.name!==undefined?{name:text(row.name,120)!}:{}),...(!update||row.note!==undefined?{note:row.note===undefined?null:text(row.note,500,true)}:{}),...(!update||row.activityId!==undefined?{activityId:row.activityId==null?null:uuid(row.activityId)}:{})};
}
