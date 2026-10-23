import type { ProductItem } from './domain';

// Conservative, local title parsing. A recognized prefix is not a catalog identity.
// Unknown brands, accessories and truncated model fragments need manual review.
const brands = ['Strong', 'Amazon', 'Amazon Basics', 'Moulinex', 'De’Longhi', "De'Longhi", 'DeLonghi', 'Philips', 'Bosch', 'Siemens', 'Samsung', 'LG', 'Whirlpool', 'Electrolux', 'AEG', 'Beko', 'Candy', 'Haier', 'Hisense', 'Dyson', 'Apple', 'Sony', 'Panasonic', 'Rowenta', 'Braun', 'Krups', 'Nespresso', 'Smeg', 'Ariston', 'Ariete', 'Kenwood', 'Tefal'].sort((a,b)=>b.length-a.length);
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
export function productNameIdentity(item: ProductItem): Partial<Record<'brand'|'model', string>> {
 const original=(item.fullName??item.fields.name?.value)?.normalize('NFC').replace(/\s+/gu,' ').trim();
 if(!original || /\b(?:compatibil[ei]|compatible|ricambi?o?|custodia|cover|accessori[oa]|vendut[oa]|spedit[oa])\b/iu.test(original))return {};
 const brand=brands.find(b=>new RegExp('^'+escaped(b)+'\\s+','iu').test(original));
 if(!brand)return {};
 const rest=original.slice(brand.length).trim();
 if(brand==='Strong'&&!/^(?:router|modem|ripetitore|SRT[ -]?\d)\b/iu.test(rest))return {};
 if(brand==='Amazon'&&!/^(?:Echo|Fire|Kindle|eero)\b/iu.test(rest))return {};
 if(brands.some(b=>b!==brand&&new RegExp('(?:^|\\s)'+escaped(b)+'(?:\\s|$)','iu').test(rest)))return {};
 // Parenthesized marketing text can be cropped without cropping the product name.
 const boundary=rest.search(/\s*(?:\(|\s[-–—]\s|\s[|]\s|,)/u);
 const model=(boundary>=0?rest.slice(0,boundary):rest).trim();
 const result:Partial<Record<'brand'|'model',string>>={brand:original.slice(0,brand.length)};
 if(!model||model.length>120||/[…]|\.\./u.test(model)||item.nameTruncated&&boundary<0)return result;
 if(/^(?:router|modem|ripetitore|lavatrice|lavastoviglie|frigorifero|friggitrice|tostapane|cavo|adattatore|forno|aspirapolvere|macchina|offerta|ordine|consegna)\b/iu.test(model))return result;
 result.model=model;return result;
}
