import { ProviderFailure } from '../review/provider';
import { productFields } from './domain';

/** Normalize the compact provider representation; reject duplicate/unknown field names. */
export function onboardingWireOutput(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProviderFailure('analysis_invalid_output');
  const singleton=(value:unknown)=>{if(!Array.isArray(value))return value;if(value.length>1)throw new ProviderFailure('analysis_invalid_output');return value[0]??null;};
  const root = { ...value as Record<string, unknown> };
  if(Object.hasOwn(root,'purchaseTotal'))root.purchaseTotal=singleton(root.purchaseTotal);
  if(Array.isArray(root.items))root.items=root.items.map((item:Record<string,unknown>)=>({...item,...(Object.hasOwn(item,'objectType')?{objectType:singleton(item.objectType)}:{})}));
  if(!Array.isArray(root.items))throw new ProviderFailure('analysis_invalid_output');
  if(root.sources!==undefined){
    if(!Array.isArray(root.sources)||root.sources.length>256)throw new ProviderFailure('analysis_invalid_output');
    const sources=root.sources;delete root.sources;
    const expand=(value:unknown):void=>{if(!value||typeof value!=='object')return;const row=value as Record<string,unknown>;if(Object.hasOwn(row,'evidence')){const index=row.evidence;if(!Number.isSafeInteger(index)||Number(index)<0||Number(index)>=sources.length)throw new ProviderFailure('analysis_invalid_output');row.evidence=sources[Number(index)];}for(const [key,child] of Object.entries(row))if(key!=='evidence')expand(child);};
    // Do not mutate a provider reply shared with diagnostics or recovery code.
    root.items=JSON.parse(JSON.stringify(root.items));if(root.houseExpenses!==undefined)root.houseExpenses=JSON.parse(JSON.stringify(root.houseExpenses));if(root.purchaseTotal!==undefined)root.purchaseTotal=JSON.parse(JSON.stringify(root.purchaseTotal));for(const key of ['documentInfo','facts'])if(root[key]!==undefined)root[key]=JSON.parse(JSON.stringify(root[key]));expand(root);
  }
  if (!Array.isArray(root.items)) throw new ProviderFailure('analysis_invalid_output');
  const houseExpenses=root.houseExpenses===undefined?undefined:(()=>{if(!Array.isArray(root.houseExpenses))throw new ProviderFailure('analysis_invalid_output');return root.houseExpenses.map(raw=>{const r=raw as Record<string,unknown>;if(!r||!Array.isArray(r.fields)||Object.keys(r).some(k=>!['fields','amountCandidates'].includes(k)))throw new ProviderFailure('analysis_invalid_output');const fields:Record<string,unknown>={};for(const entry of r.fields){if(!entry||typeof entry.field!=='string'||Object.hasOwn(fields,entry.field)||Object.keys(entry).some(k=>!['field','value','evidence'].includes(k)))throw new ProviderFailure('analysis_invalid_output');fields[entry.field]={value:entry.value,evidence:entry.evidence};}return {...r,fields};});})();
  return { ...root,...(houseExpenses!==undefined?{houseExpenses}:{}), items: root.items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ProviderFailure('analysis_invalid_output');
    const row = item as Record<string, unknown>;
    if (!Array.isArray(row.fields) || row.fields.length > productFields.length) throw new ProviderFailure('analysis_invalid_output');
    const fields: Record<string, unknown> = {};
    for (const field of row.fields) {
      if (!field || typeof field !== 'object' || Array.isArray(field)) throw new ProviderFailure('analysis_invalid_output');
      const entry = field as Record<string, unknown>;
      if (Object.keys(entry).some(key => !['field', 'value', 'evidence'].includes(key)) || typeof entry.field !== 'string' || !(productFields as readonly string[]).includes(entry.field) || Object.hasOwn(fields, entry.field)) throw new ProviderFailure('analysis_invalid_output');
      fields[entry.field] = { value: entry.value, evidence: entry.evidence };
    }
    return { ...row, fields, ...(Object.hasOwn(row,'quantity')?{quantity:singleton(row.quantity)}:{}), ...(Object.hasOwn(row,'purchaseAmount')?{purchaseAmount:singleton(row.purchaseAmount)}:{}) };
  }) };
}
