import { Prisma } from '../../generated/client';
const utilities=['electricity','gas','water','internet_services'];
export function referenceDate(row:{category?:string|null;competenceFrom?:string|null;competenceTo?:string|null;spentOn:string}){return utilities.includes(row.category??'')&&row.competenceFrom&&row.competenceTo?row.competenceFrom:row.spentOn;}
/** Whole bill counted once at the start of its printed service period, never prorated. */
export const referenceDateSql=Prisma.sql`(CASE WHEN e.category IN ('electricity','gas','water','internet_services') AND e."competenceFrom" IS NOT NULL AND e."competenceTo" IS NOT NULL THEN e."competenceFrom" ELSE e."spentOn" END)`;

export function referenceYearWhere(year:string):Prisma.HomeExpenseWhereInput {const range={gte:year+'-01-01',lte:year+'-12-31'};return {OR:[{category:{in:utilities},competenceFrom:range,competenceTo:{not:null}},{AND:[{OR:[{category:null},{category:{notIn:utilities}},{competenceFrom:null},{competenceTo:null}]},{spentOn:range}]}]};}
