import {ForbiddenException} from '@nestjs/common';
import { rejectDeletedReplay } from './trash';
import {Prisma} from '../../generated/client';
import {DocumentPolicy,canReadDocument} from './access';
import {currentOrganization,organizationView} from '../document-intake/organization';
import {conflict,invalid,object,uuid} from '../review/domain';
import {digest} from '../security';
import {STORED_FAMILIES,archiveFamily} from './families';

export function effectiveHouseFamily(org:{houseFamily:string|null;parts:unknown;collections:string[]}){
 if(org.houseFamily)return org.houseFamily;
 if(Array.isArray(org.parts)&&org.parts.some(p=>p&&typeof p==='object'&&'kind' in p&&p.kind==='floor_plan'))return 'plans';
 if(org.collections.includes('building'))return 'building';if(org.collections.includes('energy'))return 'energy';if(org.collections.includes('contracts'))return 'contracts';return 'other';
}
/** Metadata only: caller supplies a transaction; files, types, links and costs are never changed. */
export async function changeHouseFamily(tx:Prisma.TransactionClient,policy:DocumentPolicy,a:string,h:string,id:string,input:unknown,key?:string){
 uuid(h);uuid(id);const body=object(input,['expectedOrganizationVersion','documentVersion','sha256','family','scope']);
 if(!Number.isSafeInteger(body.expectedOrganizationVersion)||Number(body.expectedOrganizationVersion)<1||!Number.isSafeInteger(body.documentVersion)||Number(body.documentVersion)<1||typeof body.sha256!=='string'||!/^[a-f0-9]{64}$/.test(body.sha256)||body.family!==null&&(typeof body.family!=='string'||!STORED_FAMILIES.includes(body.family as typeof STORED_FAMILIES[number]))||body.scope!==undefined&&body.scope!=='archive'||!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();
 const payload={expectedOrganizationVersion:body.expectedOrganizationVersion,documentVersion:body.documentVersion,sha256:body.sha256,family:body.family,...(body.scope==='archive'?{scope:'archive'}:{})};
 await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:'+h},0))::text AS locked`;
 await policy.requireLocked(tx,a,h);await policy.require(a,h,'edit',tx);
 await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${id} FOR SHARE`;
 const doc=await tx.document.findUnique({where:{id},include:{original:true}});
 if(!doc||doc.homeId!==h||!canReadDocument(doc,a)||!doc.original)throw new ForbiddenException();
 if(doc.original.version!==body.documentVersion||doc.original.sha256!==body.sha256)throw conflict('document_version_conflict','Il file è cambiato. Aggiorna l’elenco prima di riprovare.');
 const lookup={accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:'document-house-family-v1',target:id,key}},fingerprint=digest(JSON.stringify(payload));
 const prior=await tx.objectOnboardingRequest.findUnique({where:lookup});
 if(prior){if(prior.digest!==fingerprint)throw conflict('idempotency_conflict','Chiave già usata per una scelta diversa.');rejectDeletedReplay(prior.response);return prior.response;}
 const org=await currentOrganization(tx,a,h,doc);
 if(!org||org.version!==body.expectedOrganizationVersion)throw conflict('organization_version_conflict','La classificazione è cambiata. Aggiorna l’elenco prima di riprovare.');
 const houseDocument=body.scope==='archive'?org.houseDocument:true;
 const after=org.houseFamily===body.family&&org.houseDocument===houseDocument?org:await tx.documentOrganization.update({where:{id:org.id},data:{houseFamily:body.family as string|null,houseDocument,version:{increment:1},updatedAt:new Date()}});
 const response={organization:organizationView(after),effectiveFamily:effectiveHouseFamily(after),archiveFamily:archiveFamily(after)};
 await tx.objectOnboardingRequest.create({data:{...lookup.accountId_homeId_operation_target_key,digest:fingerprint,response:JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue}});
 await policy.require(a,h,'edit',tx);return response;
}
