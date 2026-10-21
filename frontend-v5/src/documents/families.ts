import type {DocumentGroup} from '../api/types';
export const DOCUMENT_FAMILIES:ReadonlyArray<readonly [DocumentGroup,string,string]>=[
['property','Proprietà e affitto','Rogito, atti di acquisto, mutuo, contratti di affitto e documenti di consegna.'],
['building','Catasto e pratiche edilizie','Planimetrie, visure, permessi, pratiche dei lavori e documenti di agibilità.'],
['energy','Energia e impianti','APE, dichiarazioni di conformità, libretti degli impianti e rapporti di controllo.'],
['condo','Condominio','Regolamento, tabelle millesimali, verbali, bilanci e comunicazioni dell’amministratore.'],
['utilities','Utenze e servizi','Bollette, contratti di fornitura, letture, volture e disdette.'],
['works','Lavori, ristrutturazioni e bonus','Preventivi, contratti con imprese, fatture, pagamenti e pratiche per le detrazioni.'],
['tax','Tasse e tributi','Documenti fiscali della casa, dichiarazioni, avvisi e ricevute di pagamento.'],
['insurance','Assicurazioni','Polizze della casa, rinnovi, denunce di sinistro, perizie e rimborsi.'],
['warranty','Acquisti, garanzie e manuali','Fatture e scontrini di acquisto degli elettrodomestici, garanzie, istruzioni e schede tecniche di elettrodomestici, componenti e materiali.'],
['safety','Sicurezza e vincoli','Documenti su vincoli, servitù, prevenzione incendi e altri aspetti di sicurezza dell’immobile.']];

export const UNCLASSIFIED_FAMILY:readonly [DocumentGroup,string,string]=['unclassified','Da classificare','Documenti per cui non è stata ancora scelta una famiglia. Usa Cambia famiglia sui documenti già compilati; per gli altri scegli Compila.'];
export const ARCHIVE_GROUPS=[...DOCUMENT_FAMILIES,UNCLASSIFIED_FAMILY];
export function canonicalFamily(group?:DocumentGroup):DocumentGroup|undefined {return group==='plans'?'building':group==='contracts'||group==='other'?'unclassified':group;}
export function familyLabel(group?:DocumentGroup){return ARCHIVE_GROUPS.find(([key])=>key===canonicalFamily(group))?.[1]??'Da classificare';}
