// Constructed offline response quoting the frozen synthetic Q48; not a model replay or OCR.
const {randomUUID}=require('node:crypto');
const {load}=require('./corpus-v3/corpus.cjs');
function q48(){
 const original=load().cases.find(c=>c.id==='Q48');
 const snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:original.sha256};
 const proof=(page,excerpt)=>({page,excerpt,region:{x:.1,y:.1,width:.75,height:.7}});
 const value=(page,value,excerpt)=>({value,evidence:proof(page,excerpt)});
 const invoice=(page,supplier,number,date,printedDate,cents,title)=>({fields:{title:value(page,title,title),supplier:value(page,supplier,page===1?supplier:'Impresa: '+supplier),documentNumber:value(page,number,page===1?'Numero '+number:'Seconda fattura distinta '+number),documentDate:value(page,date,'Data documento: '+printedDate)},amountCandidates:[{id:'total',amountCents:cents,role:'current_document_total',label:'Totale documento',evidence:proof(page,page===1?'Totale documento corrente\nEUR 122,00':'Totale documento: EUR 244,00')}]});
 return{original,snapshot,context:{kind:'visual_pdf',snapshot,pageCount:2},raw:{documentKind:'purchase_document',documentInfo:[{kind:'invoice',title:'Due fatture nella stessa scansione',evidence:proof(1,'Due fatture nella stessa scansione')}],facts:[],items:[],hasMoreItems:false,requiresHumanReview:true,purchaseTotal:null,houseExpenses:[invoice(1,'Idroquarzo Collaudo','Q48/2026','2026-09-18','2026-09-18',12200,'Due fatture nella stessa scansione'),invoice(2,'Termonimbo Collaudo','Q48-B','2026-09-19','19/09/2026',24400,'Seconda fattura distinta Q48-B')]}};
}
module.exports={q48};
