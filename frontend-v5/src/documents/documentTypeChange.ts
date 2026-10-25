import type { DocumentDetail } from '../api/types';
import { canonical, KINDS, type DocumentKind } from '../document-intake/model';
import type { BatchWire } from '../intake-integration/client';
import type { OrganizationPayload } from '../intake-integration/organization';

export const TYPE_CHANGED = 'Il documento o la classificazione sono cambiati. Rileggi i dati prima di salvare.';
export function typeParts(doc: DocumentDetail) {
  return doc.organization?.parts ?? [{kind:'',pageFrom:null,pageTo:null}];
}
export function sameTypeSource(before: DocumentDetail, after: DocumentDetail) {
  const snapshot=(doc:DocumentDetail)=>({id:doc.id,homeId:doc.homeId,version:doc.version,sha256:doc.sha256,name:doc.name,organization:doc.organization?{version:doc.organization.version,title:doc.organization.title,parts:doc.organization.parts}:null});
  return after.permissions.includes('read') && /^[a-f0-9]{64}$/.test(after.sha256) && canonical(snapshot(before))===canonical(snapshot(after));
}
/** Only the user's kinds change; page ranges, title and existing resource links are preserved. */
export function documentTypePayload(doc: DocumentDetail, kinds: readonly string[], batch: BatchWire): OrganizationPayload {
  const item=batch.items[0],original=typeParts(doc),org=doc.organization;
  if(batch.homeId!==doc.homeId||batch.state!=='open'||!batch.permissions.includes('edit')||batch.items.length!==1||!item||item.documentLink.state!=='linked'||item.documentLink.document?.id!==doc.id||!item.permissions.includes('edit')||!['stored','duplicate'].includes(item.uploadState)||item.reviewState!=='unreviewed'||['queued','running','uncertain'].includes(item.analysisState)||item.selectionStale||item.selection||
    (item.organizationVersion??0)!==(org?.version??0)||canonical(item.organization?{title:item.organization.title,parts:item.organization.parts}:null)!==canonical(org?{title:org.title,parts:org.parts}:null)) throw Error(TYPE_CHANGED);
  if(kinds.length!==original.length||kinds.some(k=>!KINDS.includes(k as DocumentKind)))throw Error('Scegli un tipo per ogni parte del documento.');
  const title=org?.title??doc.name.normalize('NFC').trim().slice(0,120);
  if(!title)throw Error('Il documento richiede un titolo prima di essere classificato.');
  return {batchId:batch.id,expectedVersion:batch.version,mode:'single',items:[{itemId:item.id,expectedVersion:item.version,expectedOrganizationVersion:org?.version??0,replaceOrganization:!!org,selection:{action:'organize',title,parts:original.map((part,i)=>({...part,kind:kinds[i] as DocumentKind})),target:{kind:'home'}}}]};
}
