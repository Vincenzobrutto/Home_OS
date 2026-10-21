import {Prisma} from '../../generated/client';
export const ARCHIVE_FAMILIES=['property','building','energy','condo','utilities','works','tax','insurance','warranty','safety','unclassified'] as const;
export const LEGACY_FAMILIES=['plans','building','energy','contracts','other'] as const;
export const STORED_FAMILIES=[...ARCHIVE_FAMILIES,'plans','contracts','other'] as const;
export type ArchiveFamily=typeof ARCHIVE_FAMILIES[number];
/** Only unambiguous existing types. Invoices/contracts need an explicit contextual choice. */
export const KIND_FAMILY:Record<string,ArchiveFamily>={floor_plan:'building',cila:'building',scia:'building',building_permit:'building',habitability:'building',agibility:'building',agibility_record:'building',ape:'energy',energy_certificate:'energy',system_diagram:'energy',conformity_declaration:'energy',system_booklet:'energy',condominium_rules:'condo',condominium_minutes:'condo',millesimal_tables:'condo',utility_bill:'utilities',manual:'warranty',warranty:'warranty',product_label:'warranty'};
export function archiveFamily(org:{houseFamily:string|null;parts:unknown}|null):ArchiveFamily{
 if(org?.houseFamily){if(org.houseFamily==='plans')return 'building';if(['contracts','other'].includes(org.houseFamily))return 'unclassified';if(ARCHIVE_FAMILIES.includes(org.houseFamily as ArchiveFamily))return org.houseFamily as ArchiveFamily;}
 const groups=new Set((Array.isArray(org?.parts)?org.parts:[]).map(p=>p&&typeof p==='object'&&'kind' in p?KIND_FAMILY[String(p.kind)]??'unclassified':'unclassified'));
 return groups.size===1?[...groups][0]:'unclassified';
}
/** Same mapping as archiveFamily; organization is already scoped to readable current source. */
export function archiveFamilySql(){
 const inferred=Prisma.sql`(SELECT CASE WHEN COUNT(DISTINCT mapped.family)=1 THEN MIN(mapped.family) ELSE 'unclassified' END FROM
   (SELECT CASE ${Prisma.join(Object.entries(KIND_FAMILY).map(([kind,family])=>Prisma.sql`WHEN part->>'kind'=${kind} THEN ${family}`),' ')} ELSE 'unclassified' END AS family
    FROM jsonb_array_elements(COALESCE(o.parts,'[]'::jsonb)) part) mapped)`;
 return Prisma.sql`CASE WHEN o."houseFamily"='plans' THEN 'building' WHEN o."houseFamily" IN ('contracts','other') THEN 'unclassified'
 WHEN o."houseFamily" IS NOT NULL THEN o."houseFamily" ELSE ${inferred} END`;
}
