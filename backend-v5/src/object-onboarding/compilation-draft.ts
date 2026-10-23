import {invalid,object,uuid,version} from '../review/domain';
/** Form input only. Business validation still happens exclusively at confirmation. */
export function compilationDraft(input:unknown){
 const row=object(input,['saved','documentTarget','documentTitle','documentKind','replaceOrganization','reuseCopy','documentOnly','manualTotal','contacts','houseForms']);
 if(row.saved!==true)throw invalid();
 if(row.documentTarget!==undefined&&row.documentTarget!==null){const target=object(row.documentTarget,['kind','id','expectedVersion','name']);if(!['object','boiler'].includes(String(target.kind))||typeof target.name!=='string'||target.name.length>120)throw invalid();uuid(target.id);version(target.expectedVersion);}
 const string=(v:unknown)=>{if(typeof v!=='string'||v.length>4000)throw invalid();};
 const boolean=(v:unknown)=>{if(typeof v!=='boolean')throw invalid();};
 for(const k of ['documentTitle','documentKind','manualTotal'])string(row[k]);
 for(const k of ['replaceOrganization','reuseCopy','documentOnly'])boolean(row[k]);
 if(!Array.isArray(row.contacts)||row.contacts.length>20)throw invalid();
 for(const c of row.contacts){const contact=object(c,['proposalId','action','contactId','expectedVersion','values','createDistinct']);string(contact.proposalId);if(!['save','skip'].includes(contact.action as string))throw invalid();if(contact.contactId!==undefined)string(contact.contactId);if(contact.expectedVersion!==undefined&&(!Number.isSafeInteger(contact.expectedVersion)||Number(contact.expectedVersion)<1))throw invalid();if(contact.createDistinct!==undefined)boolean(contact.createDistinct);if(contact.values!==undefined){const values=object(contact.values,['name','kind','profession','phone','email','fiscalId','note']);for(const v of Object.values(values))if(v!==null)string(v);}}
 if(!row.houseForms||typeof row.houseForms!=='object'||Array.isArray(row.houseForms)||Object.keys(row.houseForms).length>20)throw invalid();
 for(const [id,value] of Object.entries(row.houseForms)){string(id);const form=object(value,['candidateId','amount','manual','title','supplier','date','category','mode','expenseId','ack','periodFrom','periodTo','dueOn','periodDraft','objectChoice','objectSuggestionReviewed','objectLabel','documentNumber','documentDate','note','purchaseMode','purchaseTotal']);for(const k of ['candidateId','amount','title','supplier','date','category','mode','expenseId','periodFrom','periodTo','dueOn'])string(form[k]);if(form.objectSuggestionReviewed!==undefined)boolean(form.objectSuggestionReviewed);if(form.objectChoice!==undefined)string(form.objectChoice);if(form.objectLabel!==undefined)string(form.objectLabel);for(const k of ['documentNumber','documentDate','note','purchaseMode','purchaseTotal'])if(form[k]!==undefined)string(form[k]);boolean(form.manual);boolean(form.ack);if(form.periodDraft!==undefined){const period=object(form.periodDraft,['mode','month','range']);if(!['month','range'].includes(period.mode as string))throw invalid();string(period.month);const range=object(period.range,['from','to']);string(range.from);string(range.to);}}
 return row;
}

/** Keep only unresolved form inputs; an executed pending request must never be restored. */
export function reviewAfterConfirmation(input:unknown,remainingIds:ReadonlySet<string>){
 const saved=input&&typeof input==='object'&&!Array.isArray(input)?input as {forms?:Record<string,unknown>;compilation?:unknown;manualPurchaseTotalCents?:number}:{};
 const forms=Object.fromEntries(Object.entries(saved.forms??{}).filter(([id])=>remainingIds.has(id)));
 let compilation;
 if(remainingIds.size&&saved.compilation){try{const value=compilationDraft(saved.compilation);compilation={...value,houseForms:Object.fromEntries(Object.entries(value.houseForms as Record<string,unknown>).filter(([id])=>remainingIds.has(id)))};}catch{/* Invalid legacy compilation is never promoted to a saved form. */}}
 return {forms,...(compilation?{compilation}:{}),...(remainingIds.size&&Number.isSafeInteger(saved.manualPurchaseTotalCents)&&saved.manualPurchaseTotalCents!>0?{manualPurchaseTotalCents:saved.manualPurchaseTotalCents}:{})};
}
