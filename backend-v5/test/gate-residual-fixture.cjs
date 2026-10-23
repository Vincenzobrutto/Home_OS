// Constructed replies from frozen synthetic originals, never reconstructed live responses.
const {randomUUID}=require('node:crypto');
const {load}=require('./corpus-v3/corpus.cjs');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
async function residual(id){
 const original=load().cases.find(c=>c.id===id),snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:original.sha256};
 const visual=id==='Q20',pages=visual?undefined:await new PdfTextExtractor().parse(original.bytes);
 const ev=excerpt=>({page:1,excerpt,region:visual?{x:.08,y:.1,width:.84,height:.7}:null});
 const value=(v,excerpt=v)=>({value:v,evidence:ev(excerpt)});
 const item=(name,brand,model,type)=>({subjectKind:'product',fields:{name:value(name),brand:value(brand,'Marca: '+brand),model:value(model,'Modello: '+model)},objectType:{value:type,certainty:'certain',evidence:ev(name)},quantity:null,purchaseAmount:null,nameTruncated:false,disposition:'household_object',confidence:'high'});
 const raw={documentKind:'house_document',documentInfo:[],facts:[],items:[],houseExpenses:[],purchaseTotal:null,hasMoreItems:false,requiresHumanReview:false};
 if(id==='Q20'){
  raw.documentKind='purchase_document';raw.documentInfo=[{kind:'purchase_document',title:'Documento commerciale',evidence:ev('Documento commerciale')}];
  const i=item('MACC CAFFE NUBEO C2','Nubeo','C2','appliance');i.fields.purchaseDate=value('2026-09-18','Data acquisto: 18.09.2026');i.quantity={value:1,evidence:ev('Quantità: 1')};raw.items=[i];raw.purchaseTotal={amountCents:8990,evidence:ev('Totale documento corrente 89,90 EUR')};
 }else if(id==='Q29'){
  raw.documentInfo=[{kind:'other',title:'Relazione materiali impianto',evidence:ev('Relazione materiali impianto')}];
  const p=pages[0],start=p.indexOf('Voltacervo Collaudo',p.indexOf('Voltacervo Collaudo')+1),end=p.indexOf(' - REA',start),quote=p.slice(start,end);
  raw.facts=[{subjectIndex:-1,field:'issuer',value:'Voltacervo Collaudo',evidence:ev(quote)},{subjectIndex:-1,field:'issuerVatId',value:'99900000300',evidence:ev(quote)}];
 }else if(id==='Q30'){
  raw.documentKind='product_document';raw.documentInfo=[{kind:'system_booklet',title:'Libretto caldaia',evidence:ev('Libretto caldaia')}];raw.items=[item('Caldaia Nubeo T24','Nubeo','T24','heating')];
 }else throw Error('unknown residual fixture');
 return{original,raw,context:visual?{kind:'visual_pdf',snapshot,pageCount:original.pages,allowedPages:[1,2]}:{kind:'text',snapshot,pages}};
}
module.exports={residual};
