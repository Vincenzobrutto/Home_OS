import {CaretDown} from '@phosphor-icons/react/dist/csr/CaretDown';
import {CaretRight} from '@phosphor-icons/react/dist/csr/CaretRight';
import type {ReactNode} from 'react';
import type {DocumentGroup,DocumentViewSummary} from '../api/types';
import {FieldInfo} from '../components/FieldInfo';
import {Icon} from '../components/Icon';
import {ARCHIVE_GROUPS} from './families';
import docs from '../routes/documents.module.css';

/** One primary family per authorized original. Counts are global server counts, before paging. */
export function ArchiveFamilies({summary,selected,onChange,children}:{summary:DocumentViewSummary;selected?:DocumentGroup;onChange:(group?:DocumentGroup)=>void;children?:ReactNode}){
 return <div className={docs.archiveFamilies} aria-label="Famiglie dei documenti">{ARCHIVE_GROUPS.filter(([key])=>key!=='unclassified'||(summary.groups.unclassified??0)>0||selected===key).map(([key,label,description])=>{
  const count=summary.groups[key]??0;
  return <section className={docs.houseGroup} key={key}>
   <div className={docs.archiveFamilyHead}><h3><button type="button" aria-expanded={selected===key} aria-controls={'archive-family-'+key} aria-label={`${label}, ${count} document${count===1?'o':'i'}`} onClick={()=>onChange(selected===key?undefined:key)}><Icon name="document"/><span className={docs.groupLabel}>{label}</span><strong>{count}</strong>{selected===key?<CaretDown size={16} aria-hidden/>:<CaretRight size={16} aria-hidden/>}</button></h3><FieldInfo label={label}><p>{description}</p></FieldInfo></div>
   <div id={'archive-family-'+key} hidden={selected!==key}>{selected===key&&children}</div>
  </section>;
 })}</div>;
}
