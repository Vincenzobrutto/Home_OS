import {invalid,object} from '../review/domain';
/** Form input only. Business validation still happens exclusively at confirmation. */
export function compilationDraft(input:unknown){
 const row=object(input,['saved','documentTitle','documentKind','replaceOrganization','reuseCopy','documentOnly','manualTotal','contacts','houseForms']);
 if(row.saved!==true)throw invalid();
 const string=(v:unknown)=>{if(typeof v!=='string'||v.length>4000)throw invalid();};
 const boolean=(v:unknown)=>{if(typeof v!=='boolean')throw invalid();};
 for(const k of ['documentTitle','documentKind','manualTotal'])string(row[k]);
 for(const k of ['replaceOrganization','reuseCopy','documentOnly'])boolean(row[k]);
 if(!Array.isArray(row.contacts)||row.contacts.length>20)throw invalid();
 for(const c of row.contacts){const contact=object(c,['proposalId','action','contactId','expectedVersion','values','createDistinct']);string(contact.proposalId);if(!['save','skip'].includes(contact.action as string))throw invalid();if(contact.contactId!==undefined)string(contact.contactId);if(contact.expectedVersion!==undefined&&(!Number.isSafeInteger(contact.expectedVersion)||Number(contact.expectedVersion)<1))throw invalid();if(contact.createDistinct!==undefined)boolean(contact.createDistinct);if(contact.values!==undefined){const values=object(contact.values,['name','kind','profession','phone','email','fiscalId','note']);for(const v of Object.values(values))if(v!==null)string(v);}}
 if(!row.houseForms||typeof row.houseForms!=='object'||Array.isArray(row.houseForms)||Object.keys(row.houseForms).length>20)throw invalid();
 for(const [id,value] of Object.entries(row.houseForms)){string(id);const form=object(value,['candidateId','amount','manual','title','supplier','date','category','mode','expenseId','ack','periodFrom','periodTo','dueOn','periodDraft','objectChoice']);for(const k of ['candidateId','amount','title','supplier','date','category','mode','expenseId','periodFrom','periodTo','dueOn'])string(form[k]);if(form.objectChoice!==undefined)string(form.objectChoice);boolean(form.manual);boolean(form.ack);if(form.periodDraft!==undefined){const period=object(form.periodDraft,['mode','month','range']);if(!['month','range'].includes(period.mode as string))throw invalid();string(period.month);const range=object(period.range,['from','to']);string(range.from);string(range.to);}}
 return row;
}
