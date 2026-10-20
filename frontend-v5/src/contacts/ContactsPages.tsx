import {useAccount} from '../session/session';
import {ContactCatalog} from './ContactCatalog';
import { useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { useCurrentHome } from '../routes/HomePages';
import { ContactCard, ContactForm } from './components';
import { contactBase, useContactsQuery, useContactSave, type Contact, type ContactLink } from './api';
import styles from './contacts.module.css';
import { ContactsBackLink, useContactNavigationState } from './navigation';
export function ContactsPage(){const h=useCurrentHome(),account=useAccount();return <ContactPageContent key={account.id+':'+h.id}/>;}
function ContactPageContent(){const h=useCurrentHome(),contactState=useContactNavigationState(h.id),navigate=useNavigate(),[creating,setCreating]=useState(false);useDocumentTitle('Rubrica · '+h.name);return <div className={cx(styles.stack,styles.catalogPage)}><ContactsBackLink homeId={h.id}/><div className={styles.actions}><h1>Rubrica</h1>{h.permissions.includes('edit')&&!creating&&<button className={cx(ui.btn,ui.primary)} onClick={()=>setCreating(true)}>Nuovo contatto</button>}</div><p className={styles.hint}>I contatti per questa casa, visibili solo a te.</p>{creating?<ContactForm homeId={h.id} onCancel={()=>setCreating(false)} onDone={c=>navigate('/home/'+h.id+'/rubrica/'+c.id,{state:contactState})}/>:<ContactCatalog homeId={h.id}/>}</div>;}
export function ContactDetailPage(){
 const h=useCurrentHome(),account=useAccount(),{contactId=''}=useParams();
 return <ContactDetailContent key={account.id+':'+h.id+':'+contactId} contactId={contactId}/>;
}
function ContactDetailContent({contactId}:{contactId:string}){
 const h=useCurrentHome(),[edit,setEdit]=useState(false),[cursor,setCursor]=useState(''),[feedback,setFeedback]=useState('');
 const id=useId(),linksHeading=useRef<HTMLHeadingElement>(null),managementButton=useRef<HTMLButtonElement>(null);
 const query=useContactsQuery<{contact:Contact}>(h.id,contactBase(h.id)+'/'+contactId);
 const links=useContactsQuery<{items:ContactLink[];nextCursor:string|null}>(h.id,contactBase(h.id)+'/'+contactId+'/links'+(cursor?'?cursor='+encodeURIComponent(cursor):''));
 const save=useContactSave(h.id);
 useDocumentTitle('Contatto · '+h.name);
 if(query.isPending)return <Loading label="Caricamento contatto…"/>;
 if(query.isError)return <><ContactsBackLink homeId={h.id} detail/><ErrorState error={query.error} onRetry={()=>void query.refetch()}/></>;
 const c=query.data.contact,canEdit=c.permissions.includes('edit');
 async function mutate(op:'archive'|'restore'|'unlink',resource?:ContactLink){
  setFeedback('');
  try{
   await save.mutateAsync({path:contactBase(h.id)+'/'+c.id+'/'+op,body:{expectedVersion:c.version,...(resource?{resource:resource.resource}:{})}});
   setFeedback(op==='archive'?'Contatto archiviato. Recapiti, note e collegamenti sono conservati.':op==='restore'?'Contatto ripristinato tra gli Attivi. Recapiti, note e collegamenti sono conservati.':'Collegamento con «'+resource!.name+'» rimosso. Il contatto e l’elemento collegato restano salvati.');
   if(op==='unlink')linksHeading.current?.focus({preventScroll:true});
   else requestAnimationFrame(()=>managementButton.current?.focus({preventScroll:true}));
  }catch{/* Keep the current information visible; the error does not imply a successful operation. */}
 }
 return <div className={styles.stack}>
  <ContactsBackLink homeId={h.id} detail/><h1 tabIndex={-1}>{c.name}</h1>
  {c.state==='archived'&&<Tag>Archiviato</Tag>}
  {edit?<ContactForm key={c.version} contact={c} homeId={h.id} onCancel={()=>setEdit(false)} onDone={()=>setEdit(false)}/>:<section className={cx(ui.card,styles.stack)}>
   <ContactCard contact={c} homeId={h.id}/>
   {c.fiscalId&&<p>Partita IVA / codice fiscale: {c.fiscalId}</p>}{c.note&&<p className={styles.note}>{c.note}</p>}
   {canEdit&&<div className={styles.actions}><button className={ui.btn} disabled={save.isPending} onClick={()=>{setFeedback('');setEdit(true);}}>Modifica contatto</button></div>}
   <div className={styles.contactManagement}>
    <h2>{c.state==='active'?'Archiviazione del contatto':'Contatto archiviato'}</h2>
    <p id={id+'-archive'} className={styles.hint}>{c.state==='active'?'Archivia contatto lo toglie dall’elenco Attivi. Recapiti, note e tutti i collegamenti restano salvati. Puoi ritrovarlo scegliendo Archiviati nella Rubrica e ripristinarlo.':'Il contatto non compare tra gli Attivi. Recapiti, note e tutti i collegamenti sono conservati. Ripristinalo per riportarlo tra gli Attivi e aggiungere nuovi collegamenti.'}</p>
    {canEdit&&<div className={styles.actions}><button ref={managementButton} className={ui.btn} disabled={save.isPending} aria-describedby={id+'-archive'} onClick={()=>void mutate(c.state==='active'?'archive':'restore')}>{c.state==='active'?'Archivia contatto':'Ripristina contatto'}</button></div>}
   </div>
  </section>}
  <div role="status" className={styles.actionFeedback}>{feedback}</div>
  {save.isError&&<ErrorState error={save.error} title="Operazione non completata"/>}
  <section className={cx(ui.card,styles.stack)} aria-label="Collegamenti del contatto">
   <h2 ref={linksHeading} tabIndex={-1}>Collegamenti</h2>
   {links.isPending?<Loading label="Caricamento collegamenti…"/>:links.isError?<ErrorState error={links.error} onRetry={()=>void links.refetch()}/>:<>
    {!!links.data.items.length&&<p id={id+'-unlink'} className={styles.hint}>Rimuovi collegamento toglie solo l’associazione con l’elemento scelto. Il contatto, i suoi recapiti, le note e l’elemento collegato restano salvati. Gli altri collegamenti non cambiano.</p>}
    {links.data.items.length?links.data.items.map(l=><div className={styles.contactLinkRow} key={l.id}>
     <Link to={l.href}>{l.name}</Link>
     {canEdit&&<button className={ui.btn} disabled={save.isPending} aria-label={'Rimuovi collegamento con «'+l.name+'»'} aria-describedby={id+'-unlink'} onClick={()=>void mutate('unlink',l)}>Rimuovi collegamento</button>}
    </div>):<p>Nessun collegamento disponibile. Puoi collegare questo contatto dalla scheda di un documento, oggetto, spesa o lavoro.</p>}
    {links.data.nextCursor&&<button className={ui.btn} onClick={()=>setCursor(links.data.nextCursor!)}>Altri collegamenti</button>}
    {cursor&&<button className={ui.btn} onClick={()=>setCursor('')}>Torna ai primi collegamenti</button>}
   </>}
  </section>
 </div>;
}
