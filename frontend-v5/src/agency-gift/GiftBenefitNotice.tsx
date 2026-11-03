import {useQuery} from '@tanstack/react-query';
import {useAccount,useApi} from '../session/session';
import {Banner} from '../components/ui';
/** Account capability only. It does not grant access to other people's data or impose free limits. */
export function GiftBenefitNotice(){
 const api=useApi(),account=useAccount();
 const result=useQuery({queryKey:['account',account.id,'gift','benefits'],queryFn:({signal})=>api.gift.benefits(account.id,signal),staleTime:30_000});
 if(!result.data?.fullAccess||!result.data.validUntil||result.isError)return null;
 return <Banner title="Un anno di Dimora incluso"><p>Tutte le funzioni proprietario sono abilitate sul tuo account fino al {new Date(result.data.validUntil).toLocaleString('it-IT',{dateStyle:'long',timeStyle:'short'})}. Casa e documenti restano tuoi anche dopo questa data. Nessun rinnovo automatico.</p></Banner>;
}
