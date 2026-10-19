import {ArrowRight} from '@phosphor-icons/react/dist/csr/ArrowRight';
import {Coffee} from '@phosphor-icons/react/dist/csr/Coffee';
import {Television} from '@phosphor-icons/react/dist/csr/Television';
import {Robot} from '@phosphor-icons/react/dist/csr/Robot';
import {WashingMachine} from '@phosphor-icons/react/dist/csr/WashingMachine';
import {Oven} from '@phosphor-icons/react/dist/csr/Oven';
import {Flame} from '@phosphor-icons/react/dist/csr/Flame';
import {Fan} from '@phosphor-icons/react/dist/csr/Fan';
import {Plug} from '@phosphor-icons/react/dist/csr/Plug';
import {Drop} from '@phosphor-icons/react/dist/csr/Drop';
import {ShieldCheck} from '@phosphor-icons/react/dist/csr/ShieldCheck';
import {Lightbulb} from '@phosphor-icons/react/dist/csr/Lightbulb';
import {Package} from '@phosphor-icons/react/dist/csr/Package';
import {CalendarBlank} from '@phosphor-icons/react/dist/csr/CalendarBlank';
import {Link} from 'react-router';
import type {CatalogItem} from '../api/types';
import {objectPath} from '../lib/objects';
import {roomsText,typeLabel} from './components';
import styles from './catalog.module.css';

export function catalogNotice(item:CatalogItem,today:string|undefined){
 const next=item.summary?.nextActivity;
 if(next?.dueDate){const close=today&&next.dueDate<=new Date(new Date(today+'T12:00:00Z').getTime()+30*86400000).toISOString().slice(0,10);
  if(close)return {label:next.title,date:next.dueDate,urgent:true,overdue:next.dueDate<today!};
 }
 const warranty=item.profile?.fields.warrantyEnd?.value;
 if(warranty)return {label:today&&warranty<today?'Garanzia scaduta il':'Garanzia fino al',date:warranty,urgent:false,overdue:false};
 return next?.dueDate?{label:next.title,date:next.dueDate,urgent:false,overdue:false}:null;
}
function Glyph({item}:{item:CatalogItem}){
 const name=item.name.toLocaleLowerCase('it');
 const Icon=item.type==='boiler'||item.type==='heating'?Flame:item.type==='cooling'?Fan:item.type==='plumbing'?Drop:item.type==='security'?ShieldCheck:/caff[eè]|coffee/.test(name)?Coffee:/\btv\b|televisor|crystal/.test(name)?Television:/robot|aspirapolver|dreame/.test(name)?Robot:/lavatrice|lavastoviglie/.test(name)?WashingMachine:/forno/.test(name)?Oven:/lampad/.test(name)?Lightbulb:item.type==='electrical'?Plug:Package;
 return <Icon size={44} weight="regular" aria-hidden="true"/>;
}
function date(value:string){return new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));}
export function CatalogTile({item,homeId,state,today,onOpen}:{item:CatalogItem;homeId:string;state:unknown;today?:string;onOpen:()=>void}){
 const brand=item.summary?.brand??item.profile?.fields.brand?.value,model=item.summary?.model??item.profile?.fields.model?.value;
 const subtitle=[brand,model].filter(Boolean).join(' · '),notice=catalogNotice(item,today);
 return <li className={styles.tile}><Link id={`catalog-${item.ref.kind}-${item.ref.id}`} to={objectPath(homeId,item.ref)} state={state} className={styles.tileLink} aria-label={item.name} onClick={onOpen}>
  <span className={styles.visual}><Glyph item={item}/></span><span className={styles.body}>
   <strong className={styles.name}>{item.name}</strong><span className={styles.brand}>{subtitle||typeLabel(item)}</span>
   <span className={styles.room}>{roomsText(item.position.rooms)}</span>{item.state==='archived'&&<span className={styles.archived}>Archiviato</span>}
  </span>
  {notice&&<span className={`${styles.notice} ${notice.urgent?styles.urgent:''}`}><CalendarBlank size={18} aria-hidden="true"/><span><span>{notice.overdue?'Attività scaduta · ':''}{notice.label}</span><strong>{date(notice.date)}</strong></span></span>}
  <ArrowRight className={styles.arrow} size={18} aria-hidden="true"/>
 </Link></li>;
}
