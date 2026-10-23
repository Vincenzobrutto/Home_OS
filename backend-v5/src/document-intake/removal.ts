import type { Prisma, DocumentIntakeItem } from '../../generated/client';

/** Only disposable intake content: never an analyzed, organized, shared or linked original. */
export async function removalTarget(tx:Prisma.TransactionClient,a:string,h:string,item:DocumentIntakeItem){
 if(item.reviewState!=='unreviewed'||['uploading'].includes(item.uploadState)||['queued','running'].includes(item.analysisState))return null;
 if(await tx.objectOnboardingRequest.count({where:{accountId:a,homeId:h,operation:'automatic-intake-v1',target:item.batchId}}))return null;
 if(!item.documentId)return ['pending','failed'].includes(item.uploadState)?{}:null;
 const doc=await tx.document.findFirst({where:{id:item.documentId,homeId:h,uploaderId:a,visibility:'private',trashedAt:null},include:{original:{include:{file:true}},_count:true}});
 if(!doc?.original||doc.original.version!==item.documentVersion||doc.original.sha256!==item.documentSha256)return null;
 if(item.uploadState==='duplicate')return {};
 if(item.uploadState!=='stored'||Object.entries(doc._count).some(([key,n])=>key==='intakeItems'?n!==1:n!==0))return null;
 if(await tx.contactResourceLink.count({where:{resourceKind:'document',resourceId:doc.id}})||await tx.shareRecord.count({where:{homeId:h}})||await tx.sharePreview.count({where:{homeId:h}})||await tx.analysisJob.count({where:{homeId:h}}))return null;
 return {documentId:doc.id,fileId:doc.original.fileId,storageKey:doc.original.file.storageKey};
}
