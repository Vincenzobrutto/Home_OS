import { Prisma } from '../../generated/client';
const utilities=['electricity','gas','water','internet_services'];
export function referenceDate(row:{invoiceMonth?:string|null;category?:string|null;competenceFrom?:string|null;competenceTo?:string|null;spentOn:string}){return utilities.includes(row.category??'')&&row.invoiceMonth?row.invoiceMonth+'-01':utilities.includes(row.category??'')&&row.competenceFrom&&row.competenceTo?row.competenceFrom:row.spentOn;}
/** Explicit invoice month takes precedence. Legacy rows retain their previous service-date fallback. */
export const referenceDateSql=Prisma.sql`(CASE WHEN e.category IN ('electricity','gas','water','internet_services') AND e."invoiceMonth" IS NOT NULL THEN e."invoiceMonth" || '-01' WHEN e.category IN ('electricity','gas','water','internet_services') AND e."competenceFrom" IS NOT NULL AND e."competenceTo" IS NOT NULL THEN e."competenceFrom" ELSE e."spentOn" END)`;

export function referenceYearWhere(year:string):Prisma.HomeExpenseWhereInput {const range={gte:year+'-01-01',lte:year+'-12-31'};return {OR:[{category:{in:utilities},invoiceMonth:{gte:year+'-01',lte:year+'-12'}},{invoiceMonth:null,category:{in:utilities},competenceFrom:range,competenceTo:{not:null}},{AND:[{OR:[{category:null},{category:{notIn:utilities}},{invoiceMonth:null,OR:[{competenceFrom:null},{competenceTo:null}]}]},{spentOn:range}]}]};}
