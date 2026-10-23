import { labels as profileLabels } from './model';
import type { Draft } from './model';
import { KIND_LABEL, kindCollection, collectionLabel, type DocumentKind } from '../document-intake/model';
import { FieldInfo } from '../components/FieldInfo';
import { ui } from '../components/ui';
import styles from './onboarding.module.css';
const labels:Record<string,string>={shippingCost:'Spese di spedizione',purchaseTotal:'Totale del documento',purchaseAmount:'Prezzo dell’articolo',issuer:'Impresa o emittente',issuerPhone:'Telefono dell’impresa',issuerEmail:'Email dell’impresa',issuerVatId:'Partita IVA dell’impresa',issuerFiscalId:'Codice fiscale dell’impresa',documentDate:'Data del documento',installationDate:'Data di installazione',interventionDescription:'Intervento descritto',availablePowerKw:'Potenza impegnabile (kW)',systemType:'Tipo di impianto'};
export const understandingFieldLabel=(field:string)=>{const key=field.split(':').at(-1)??field;return labels[key]??profileLabels[key as keyof typeof profileLabels]??'dato del documento';};
const systems:Record<string,string>={electrical:'Elettrico',heating:'Riscaldamento',cooling:'Climatizzazione',plumbing:'Idraulica',security:'Sicurezza'};
export function DocumentUnderstandingSummary({draft}:{draft:Draft}){
 const info=draft.documentInfo;if(!info)return null;
 return <section className={ui.card} aria-label="Dati riconosciuti del documento"><h3>{KIND_LABEL[info.kind as DocumentKind]??'Documento riconosciuto'}</h3><p>Destinazione: {collectionLabel(kindCollection(info.kind as DocumentKind))}</p>
 <dl>{info.facts.filter(fact=>info.kind!=='conformity_declaration'||fact.subjectIndex===-1&&['issuer','documentDate'].includes(fact.field)).map(fact=><div className={styles.card} key={fact.subjectIndex+':'+fact.field}><dt className={styles.fieldHead}><strong>{labels[fact.field]??fact.field}</strong><FieldInfo label={labels[fact.field]??fact.field}><p>Pagina {fact.source.page}: «{fact.source.excerpt}»</p>{fact.field==='documentDate'&&<p>Questa è la data del documento, non una data di acquisto.</p>}{fact.field==='availablePowerKw'&&<p>Non è la potenza assorbita di un apparecchio.</p>}</FieldInfo></dt><dd>{(fact.field==='systemType'?systems[fact.value]:undefined)??(fact.field.endsWith('Date')?fact.value.split('-').reverse().join('/'):fact.value)}</dd></div>)}</dl>
 </section>;
}
