import { objectTypes } from '../home-objects/domain';
import { invalid, object } from '../review/domain';
import type { ProductSource } from './domain';

export type ObjectTypeProposal = { value: typeof objectTypes[number]; certainty: 'certain' | 'uncertain'; source: ProductSource };
// Taxonomy is not a verbatim field; certainty still needs explicit subject wording.
const words: Record<typeof objectTypes[number], RegExp> = {
 appliance: /elettrodomestic|lavatrice|lavastoviglie|asciugatrice|frigorif|congelator|forno|macchina.{0,15}caff|macc\s+caffe|tostap|televisor|robot|router|modem/iu,
 heating: /riscaldamento|caldaia|radiatore|termosifone|pannello\s+radiante|termoarredo|pompa\s+di\s+calore/iu,
 cooling: /climatizzatore|climatizzazione|condizionatore|raffrescamento/iu,
 electrical: /impianto\s+elettric|quadro\s+elettric|videocitof|citofon|interruttore|presa\s+elettrica/iu,
 plumbing: /idraulic|impianto\s+idric|pompa\s+acqua|rubinetto|scaldacqua/iu,
 security: /allarme|sicurezza|antifurto|videosorveglianza/iu,
 fixture: /serramento|finestra|porta\s+interna|tapparella|dotazione\s+fissa/iu,
 other: /altro\s+oggetto|other\s+object/iu,
};
export function readObjectType(input: unknown, readEvidence: (value: unknown) => ProductSource, primary:string): ObjectTypeProposal | undefined {
 if(input==null)return undefined;
 const row=object(input,['value','certainty','evidence']);
 if(!(objectTypes as readonly unknown[]).includes(row.value)||!['certain','uncertain'].includes(String(row.certainty)))throw invalid();
 const value=row.value as ObjectTypeProposal['value'],source=readEvidence(row.evidence);
 const normalized=(s:string)=>s.normalize('NFC').replace(/\s+/gu,' ').trim();
 const certainty=row.certainty==='certain'&&words[value].test(source.excerpt)&&normalized(source.excerpt).includes(normalized(primary))?'certain':'uncertain';
 return {value,certainty,source};
}
