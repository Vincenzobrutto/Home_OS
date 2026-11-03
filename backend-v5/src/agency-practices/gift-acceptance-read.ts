import type {Prisma,AgencyGiftAcceptanceReceipt} from '../../generated/client';
import {GiftInvitationError} from './gift-invitations';
import {giftAcceptanceDigest} from './gift-acceptance-preparation';
import {parseGiftAcceptanceReceipt} from './gift-acceptance-receipt';

/** Accepted receipt reads deliberately have no Agency/token/source joins. */
export async function readAcceptedGift(tx:Prisma.TransactionClient,row:AgencyGiftAcceptanceReceipt,accountId:string){
 if(row.accountId!==accountId)throw new GiftInvitationError('unavailable');
 const r=parseGiftAcceptanceReceipt(row.snapshot);
 if(r.id!==row.id||r.practiceId!==row.practiceId||r.invitationId!==row.invitationId||r.jobId!==row.jobId||r.accountId!==accountId||r.requestKey!==row.requestKey||r.commandDigest!==row.commandDigest||r.sourceFingerprint!==row.sourceFingerprint||r.homeId!==row.homeId||r.acceptedAt!==row.acceptedAt.toISOString())throw new GiftInvitationError('invalid_input');
 await tx.$queryRaw`SELECT id FROM "HomeMembership" WHERE "homeId"=${r.homeId} AND "accountId"=${accountId} FOR SHARE`;
 const membership=await tx.homeMembership.findUnique({where:{accountId_homeId:{accountId,homeId:r.homeId}}}),now=new Date();
 if(!membership||!['owner','member','viewer'].includes(membership.role)||membership.revokedAt||membership.validFrom>now||membership.validUntil&&membership.validUntil<=now)throw new GiftInvitationError('unavailable');
 const grant=await tx.accountGiftBenefit.findUnique({where:{receiptId:r.id}});
 if(r.benefit){
  if(!grant||giftAcceptanceDigest(r.benefit)!==giftAcceptanceDigest({schemaVersion:1,id:grant.id,receiptId:grant.receiptId,accountId:grant.accountId,offerId:grant.offerId,offerVersion:grant.offerVersion,startsAt:grant.startsAt.toISOString(),endsAt:grant.endsAt.toISOString()}))throw new GiftInvitationError('invalid_input');
 }else if(grant)throw new GiftInvitationError('invalid_input');
 // Logical document references survive owner purge; never require/recreate the originals here.
 return r;
}
export const acceptedGiftSummary=(r:Awaited<ReturnType<typeof readAcceptedGift>>,replay:boolean)=>({jobId:r.jobId,state:'accepted' as const,receiptId:r.id,receiptVersion:1,replay,homeId:r.homeId,acceptedAt:r.acceptedAt,documents:r.documents,benefit:r.benefit,createsHome:true as const,activatesBenefit:r.benefit!==null});