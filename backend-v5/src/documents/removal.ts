import type { Prisma } from '../../generated/client';

/** A source with economic, AI or shared history is retained; no cascading business deletion. */
export async function documentRemoval(tx:Prisma.TransactionClient,accountId:string,homeId:string,documentId:string){
 const doc=await tx.document.findFirst({where:{id:documentId,homeId,uploaderId:accountId,visibility:'private'},include:{original:{include:{file:true}},_count:true,intakeItems:{include:{batch:true}}}});
 if(!doc?.original)return null;
 if(Object.entries(doc._count).some(([name,count])=>!['intakeItems','requests'].includes(name)&&count>0))return {allowed:false as const,reason:'Questo originale ha già analisi, proposte o collegamenti. Lo conserviamo per mantenere consultabili oggetti, spese e storico AI. Nessuno di questi dati verrà eliminato.'};
 if(doc.intakeItems.some(i=>i.batch.accountId!==accountId||i.batch.homeId!==homeId||i.reviewState!=='unreviewed'||i.uploadState==='uploading'||['queued','running','uncertain'].includes(i.analysisState)))return {allowed:false as const,reason:'Il documento è in elaborazione o ha già una revisione salvata. Completa l’operazione prima di rimuoverlo.'};
 if(await tx.contactResourceLink.count({where:{resourceKind:'document',resourceId:documentId}})||await tx.shareRecord.count({where:{homeId}})||await tx.sharePreview.count({where:{homeId}})||await tx.analysisJob.count({where:{homeId}})||await tx.objectOnboardingRequest.count({where:{accountId,homeId,operation:'automatic-intake-v1',target:{in:doc.intakeItems.map(i=>i.batchId)}}}))return {allowed:false as const,reason:'L’originale è coinvolto in un’elaborazione o in una condivisione e va conservato.'};
 return {allowed:true as const,reason:null,doc};
}
