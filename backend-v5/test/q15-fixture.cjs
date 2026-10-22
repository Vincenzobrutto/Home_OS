// Constructed reply on frozen Q15; not a replay of an unstored model response.
const {randomUUID}=require('node:crypto');
const {load}=require('./corpus-v3/corpus.cjs');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
async function q15(){
 const original=load().cases.find(c=>c.id==='Q15'),snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:original.sha256};
 const [parsed]=await new PdfTextExtractor().extract([{snapshot,bytes:original.bytes}]);
 const ev=excerpt=>({page:1,excerpt,region:null}),field=(value,excerpt=value)=>({value,evidence:ev(excerpt)});
 const issuer=parsed.pages[0].slice(parsed.pages[0].indexOf('Voltacervo Collaudo',1),parsed.pages[0].indexOf('PEC:')).trim();
 return{original,context:{kind:'text',snapshot,pages:parsed.pages},raw:{documentKind:'purchase_document',hasMoreItems:false,requiresHumanReview:false,items:[],purchaseTotal:null,documentInfo:[{kind:'invoice',title:'Fattura verifica impianto',evidence:ev('Fattura verifica impianto')}],facts:[{subjectIndex:-1,field:'issuer',value:'Voltacervo Collaudo',evidence:ev(issuer)},{subjectIndex:-1,field:'issuerVatId',value:'99900000300',evidence:ev(issuer)},{subjectIndex:-1,field:'interventionDescription',value:'Servizio di manutenzione',evidence:ev('Servizio di manutenzione')}],houseExpenses:[{fields:{title:field('Fattura verifica impianto'),supplier:field('Voltacervo Collaudo',issuer),category:field('maintenance','Servizio di manutenzione'),documentDate:field('2026-09-18','Data documento: 18 settembre 2026')},amountCandidates:[{id:'total',role:'current_document_total',amountCents:24400,label:'Totale documento corrente',evidence:ev('Totale documento corrente \nEUR 244,00')}]}]}};
}
module.exports={q15};
