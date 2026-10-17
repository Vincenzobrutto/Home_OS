import { Link } from 'react-router';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ui } from '../components/ui';
import { lockModalScroll } from '../components/modalScroll';
import styles from './onboarding.module.css';

export function ItemReviewPanel({children,footer,onClose,originalHref}:{children:ReactNode;footer:ReactNode;onClose:()=>void;originalHref?:string}){
 const panel=useRef<HTMLDivElement>(null),close=useRef(onClose),title=useId();
 useEffect(()=>{close.current=onClose;},[onClose]);
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null,root=document.getElementById('root'),inert=root?.inert,unlock=lockModalScroll();
  if(root)root.inert=true;panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(event:KeyboardEvent)=>{
   if([...document.querySelectorAll('[aria-modal="true"]')].at(-1)!==panel.current)return;
   if(event.key==='Escape'){event.preventDefault();close.current();return;}
   if(event.key!=='Tab')return;
   const items=[...panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')].filter(el=>el.getClientRects().length>0),first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);unlock();if(root)root.inert=inert??false;(trigger?.isConnected?trigger:document.querySelector<HTMLElement>('main'))?.focus();};
 },[]);
 return createPortal(<div className={styles.backdrop}><div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={title}>
  <header className={styles.panelHead}><div><h2 id={title}>Rivedi l’articolo</h2>{originalHref&&<Link className={styles.originalLink} to={originalHref} target="_blank" rel="noopener noreferrer" aria-label="Vedi documento originale (si apre in una nuova scheda)">Vedi documento originale ↗</Link>}</div><button type="button" className={ui.btn} onClick={onClose}>Chiudi</button></header>
  <div className={styles.panelBody}>{children}</div><footer className={styles.panelFoot}>{footer}</footer>
 </div></div>,document.body);
}
