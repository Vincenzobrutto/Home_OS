/** Exact service descriptions only: never identify an issuer from a service. */
export function isBillServiceHeading(value:string):boolean{
 const text=value.trim().replace(/[\s,–-]+/gu,' ').replace(/[.:]$/u,'').trim();
 return /^(?:(?:servizio|fornitura|bolletta)(?: di)? )?(?:energia elettrica|gas(?: naturale)?|acqua(?: potabile)?|telefonia(?: e internet)?|internet(?: e telefonia)?)(?: (?:del )?mercato (?:libero|tutelato))?$/iu.test(text);
}

/** Display only. Legal suffixes do not define an alias or merge issuer identities. */
export function billSupplierLabel(value:string|null|undefined):string|undefined{
 const raw=value?.trim().replace(/\s+/gu,' ');
 if(!raw||isBillServiceHeading(raw))return undefined;
 const name=raw.replace(/[\s,]+(?:[-–]\s*)?(?:s\s*\.\s*p\s*\.\s*a\.?|s\s*\.\s*r\s*\.\s*l(?:\s*\.\s*s)?\.?)$/iu,'').replace(/[\s,]+(?:[-–]\s*)?(?:SPA|SRL|SRLS)$/u,'').trim();
 return name.length>=2&&!isBillServiceHeading(name)?name:raw;
}
