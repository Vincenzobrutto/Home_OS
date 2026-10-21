import {Link} from 'react-router';
import {DoorOpen} from '@phosphor-icons/react/dist/csr/DoorOpen';
import {CookingPot} from '@phosphor-icons/react/dist/csr/CookingPot';
import {Couch} from '@phosphor-icons/react/dist/csr/Couch';
import {Bed} from '@phosphor-icons/react/dist/csr/Bed';
import {Bathtub} from '@phosphor-icons/react/dist/csr/Bathtub';
import {WashingMachine} from '@phosphor-icons/react/dist/csr/WashingMachine';
import {Sun} from '@phosphor-icons/react/dist/csr/Sun';
import {ArrowRight} from '@phosphor-icons/react/dist/csr/ArrowRight';
import type {Room} from '../api/types';
import {roomPath,ROOM_TYPE_LABEL} from '../lib/objects';
import {cx} from '../components/ui';
import cards from './catalog.module.css';
import styles from '../routes/rooms.module.css';

const glyphs={kitchen:CookingPot,living:Couch,bedroom:Bed,bathroom:Bathtub,hall:DoorOpen,utility:WashingMachine,outdoor:Sun,other:DoorOpen};
export function RoomCard({room,meta,count,homeId,returnState}:{room:Pick<Room,'id'|'name'|'state'>;meta?:Room;count?:number;homeId:string;returnState:unknown}){
 const Glyph=meta?glyphs[meta.type]??DoorOpen:DoorOpen;
 const type=meta&&meta.type!=='other'?ROOM_TYPE_LABEL[meta.type]:null;
 return <li className={cards.tile}><Link to={roomPath(homeId,room.id)} state={returnState} aria-label={room.name} aria-describedby={`room-${room.id}-summary`} className={cx(cards.tileLink,styles.card)}>
  <span className={cards.visual}><Glyph size={40} aria-hidden="true"/></span>
  <span className={cards.body}><strong className={cards.name}>{room.name}</strong>
   <span id={`room-${room.id}-summary`} className={styles.summary}>
   {type&&type.toLocaleLowerCase('it')!==room.name.trim().toLocaleLowerCase('it')&&<span className={cards.brand}>{type}</span>}
   {meta?.note&&<span className={styles.note}>{meta.note}</span>}
   {count!==undefined&&<span className={cx(styles.count,count===0&&styles.emptyCount)}>{count===0?'Nessun oggetto':`${count} ${count===1?'oggetto':'oggetti'}`}</span>}
   {room.state==='archived'&&<span className={cards.archived}>Archiviato</span>}
   </span>
  </span><ArrowRight className={cards.arrow} size={18} aria-hidden="true"/>
 </Link></li>;
}
