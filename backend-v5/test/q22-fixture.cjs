// Constructed offline reply, not an unstored live payload; frozen synthetic Q22 only.
const {randomUUID}=require('node:crypto');
const {load}=require('./corpus-v3/corpus.cjs');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
async function q22(){
 const original=load().cases.find(c=>c.id==='Q22'),snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:original.sha256};
 const [parsed]=await new PdfTextExtractor().extract([{snapshot,bytes:original.bytes}]);
 const lines=parsed.pages[0].split('\n'),rows=lines.filter(l=>/Quantità: 1/u.test(l));
 const ev=excerpt=>({page:1,excerpt,region:null}),value=(v,excerpt=v)=>({value:v,evidence:ev(excerpt)});
 const items=[['Forno Nubeo N4','Nubeo','N4'],['Frigorifero Vetravia R3','Vetravia','R3']].map(([name,brand,model],i)=>({fields:{name:value(name,rows[i].trim()),brand:value(brand,rows[i].trim()),model:value(model,rows[i].trim())},objectType:{value:'appliance',certainty:'certain',evidence:ev(rows[i].trim())},quantity:null,purchaseAmount:null,nameTruncated:false,disposition:'household_object',confidence:'high'}));
 return{original,rows,context:{kind:'text',snapshot,pages:parsed.pages},raw:{documentKind:'purchase_document',documentInfo:[{kind:'invoice',title:'Fattura due articoli',evidence:ev('Fattura due articoli')}],facts:[],items,hasMoreItems:false,requiresHumanReview:false,houseExpenses:[],purchaseTotal:{amountCents:80000,evidence:ev('Totale documento: 800.00 EUR')}}};
}
module.exports={q22};
