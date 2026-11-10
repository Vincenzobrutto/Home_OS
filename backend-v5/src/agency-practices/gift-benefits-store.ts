import {Prisma,type AccountGiftBenefit} from '../../generated/client';
import type {PrismaService} from '../prisma.service';
import {GiftInvitationError} from './gift-invitations';
import {activeGiftBenefit,makeGiftBenefit,type GiftBenefit} from './gift-benefit';
import {parseGiftAcceptanceReceipt} from './gift-acceptance-receipt';
import {giftAcceptanceDigest} from './gift-acceptance-preparation';

type Row=Prisma.AccountGiftBenefitGetPayload<{include:{receipt:true}}>;
export type GiftAccountCapabilities={fullAccess:boolean;scope:'all_owner_features';validUntil:string|null};
function invalid():never{throw new GiftInvitationError('invalid_input');}
function unavailable():never{throw new GiftInvitationError('unavailable');}
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value);
function iso(value:Date):string{
  if(!(value instanceof Date)||!Number.isFinite(value.getTime()))invalid();return value.toISOString();
}
function benefit(row:AccountGiftBenefit,now:string):{value:GiftBenefit;active:boolean}{
  try{
    const value={...makeGiftBenefit({id:row.id,receiptId:row.receiptId,accountId:row.accountId,acceptedAt:iso(row.startsAt),offerId:row.offerId,offerVersion:row.offerVersion}),endsAt:iso(row.endsAt)};
    return {value,active:activeGiftBenefit(value,now)};
  }catch{invalid();}
}
function validate(row:Row,accountId:string,now:string){
  const linked=row.receipt;
  if(!linked||linked.accountId!==accountId||linked.id!==row.receiptId)invalid();
  const parsed=parseGiftAcceptanceReceipt(linked.snapshot);
  if(parsed.id!==linked.id||parsed.practiceId!==linked.practiceId||parsed.invitationId!==linked.invitationId||parsed.jobId!==linked.jobId||parsed.accountId!==accountId||parsed.requestKey!==linked.requestKey||parsed.commandDigest!==linked.commandDigest||parsed.sourceFingerprint!==linked.sourceFingerprint||parsed.homeId!==linked.homeId||parsed.acceptedAt!==iso(linked.acceptedAt))invalid();
  const grant=benefit(row,now);
  if(!parsed.benefit||giftAcceptanceDigest(parsed.benefit)!==giftAcceptanceDigest(grant.value))invalid();
  return grant;
}

/**
 * Read-only Gift grant summary for an account resolved by server authentication.
 * It neither proves account existence nor defines the free plan, billing, admin, consent or AI budgets.
 * No Agency/source/HomeMembership dependency is consulted: accepted account grants are independent.
 */
export class GiftBenefitsStore{
  constructor(private readonly db:Pick<PrismaService,'$transaction'>,private readonly clock:()=>Date=()=>new Date()){}
  async capabilities(accountId:string):Promise<GiftAccountCapabilities>{
    if(!validId(accountId))invalid();
    try{
      const now=iso(this.clock());
      return await this.db.$transaction(async tx=>{
        // No date filter/truncation: validate every owned row, including expired or future grants.
        const rows=await tx.accountGiftBenefit.findMany({where:{accountId},include:{receipt:true}});
        if(!Array.isArray(rows))invalid();
        // Defensive scope check precedes any receipt/snapshot parsing from a returned row.
        for(const row of rows)if(!row||row.accountId!==accountId)unavailable();
        const ids=new Set<string>(),receipts=new Set<string>();let until:number|null=null;
        for(const row of rows){
          if(ids.has(row.id)||receipts.has(row.receiptId))invalid();ids.add(row.id);receipts.add(row.receiptId);
          const grant=validate(row,accountId,now);
          if(grant.active){const end=Date.parse(grant.value.endsAt);if(until===null||end>until)until=end;}
        }
        return {fullAccess:until!==null,scope:'all_owner_features' as const,validUntil:until===null?null:new Date(until).toISOString()};
      },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:5000,timeout:15000});
    }catch(error){
      if(error instanceof GiftInvitationError)throw new GiftInvitationError(error.code);
      unavailable();
    }
  }
}
