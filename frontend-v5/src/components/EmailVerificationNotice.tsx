import { useState } from 'react';
import { userMessage } from '../api/errors';
import { useApi, useSession } from '../session/session';
import { Banner, ui } from './ui';
export function EmailVerificationNotice() {
  const api=useApi(),session=useSession();const account=session.data?.account;
  const [pending,setPending]=useState(false),[message,setMessage]=useState('');
  if(!account||account.emailVerifiedAt||!session.data?.authRecovery?.enabled)return null;
  return <Banner tone="warning" title="Conferma la tua email"><p>{account.email} · {account.requiresEmailVerification?'Serve prima di caricare documenti e per recuperare l’accesso.':'Il tuo accesso attuale resta disponibile. Conferma il recapito per poter recuperare l’accesso.'}</p><button className={ui.btn} disabled={pending} onClick={async()=>{setPending(true);try{await api.requestEmailVerification(account.id);setMessage('Richiesta registrata. Controlla la casella e lo spam. Il link vale 24 ore.');}catch(e){setMessage(userMessage(e));}finally{setPending(false);}}}>{pending?'Richiesta in corso…':'Richiedi link di conferma'}</button>{message&&<p role="status">{message}</p>}</Banner>;
}
