require('reflect-metadata');
const{test}=require('node:test');const assert=require('node:assert/strict');const{randomUUID}=require('node:crypto');
const{productExtraction}=require('../dist/object-onboarding/domain');const{receiptPurchaseDate,tableQuantity}=require('../dist/object-onboarding/invoice-evidence');const{proposedProfile}=require('../dist/object-onboarding/profile');const{PdfTextExtractor}=require('../dist/review/pdf-text');const{digest}=require('../dist/security');
const title='Macchina ghiaccio sintetica 2.2L';const date="Ricevuta d'acquisto 12 maggio 2025";const table='Qty Articolo Posizione Prezzo Totale\n1 '+title+'\nDimensioni demo\n99,50 EUR';const total='Totale 99,50 EUR';
const ev=excerpt=>({page:1,excerpt,region:null});
function output(){return{documentKind:'purchase_document',hasMoreItems:false,items:[{fields:{name:{value:title,evidence:ev(title)},purchaseDate:{value:'2025-05-12',evidence:ev(date)},capacityLitres:{value:'2.2',evidence:ev(title)}},quantity:{value:1,evidence:ev(table)},nameTruncated:false,disposition:'household_object',confidence:'high'}],purchaseTotal:{amountCents:9950,evidence:ev(total)}};}
function context(text){return{kind:'text',snapshot:{documentId:randomUUID(),documentVersion:1,documentSha256:digest('synthetic')},pages:[text]};}
const page=[date,table,total].join('\n');
test('receipt date, quantity table, capacity and total validate with original citations',()=>{const x=productExtraction(output(),context(page));assert.equal(x.items[0].quantity.value,1);assert.equal(x.purchaseTotal.amountCents,9950);const p=proposedProfile(x.items[0]);assert.equal(p.warrantyStart.value,'2025-05-12');assert.equal(p.warrantyEnd.value,'2027-05-12');});
test('manufacturing/expected dates and an unrelated second date are not purchase evidence',()=>{assert.equal(receiptPurchaseDate('Prodotto il 12 maggio 2025','2025-05-12'),false);assert.equal(receiptPurchaseDate("Ricevuta d’acquisto 12 maggio 2025; consegna prevista 14 maggio 2025",'2025-05-14'),false);assert.equal(receiptPurchaseDate("Ricevuta d’acquisto 12 maggio 2025",'2025-05-12'),true);const x=output();x.items[0].fields.purchaseDate.evidence=ev('Data acquisto: 12 maggio 2025; consegna: 14 maggio 2025');assert.throws(()=>productExtraction(x,context(page+'\n'+x.items[0].fields.purchaseDate.evidence.excerpt)),e=>e.field==='purchaseDate'&&e.reason==='date');});
test('quantity belongs to the exact product row, not another quantity or first match',()=>{const t='Qtà Articolo Prezzo\n2 Lampada demo\n1 '+title+'\n99,50 EUR';assert.equal(tableQuantity(t,title),1);assert.equal(tableQuantity(t,'Lampada demo'),2);assert.equal(tableQuantity(t+'\n1 '+title,title),null);assert.equal(tableQuantity('Articolo Qtà\n'+title+' 1',title),null);const x=output();x.items[0].quantity={value:2,evidence:ev(t)};assert.throws(()=>productExtraction(x,context(page+'\n'+t)),e=>e.field==='quantity');});
test('forged citation and wrong totals remain rejected, diagnostics contain no document text',()=>{const x=output();x.items[0].fields.name.evidence.excerpt='PRIVATE FORGED';assert.throws(()=>productExtraction(x,context(page)),e=>e.code==='evidence_unverified'&&e.field==='name'&&!JSON.stringify(e).includes('PRIVATE FORGED'));const y=output();y.purchaseTotal.amountCents=9951;assert.throws(()=>productExtraction(y,context(page)),e=>e.field==='purchaseTotal');});
function pdf(lines){const stream='BT /F1 12 Tf 40 790 Td '+lines.map((l,i)=>(i?'0 -24 Td ':'')+'('+l.replace(/[()\\]/g,c=>'\\'+c)+') Tj').join('\n')+' ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];let s='%PDF-1.4\n';const offsets=[];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const xref=Buffer.byteLength(s);s+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');return Buffer.from(s+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');}
test('real parser on a generated synthetic PDF feeds quantity/date/total evidence without network',async()=>{const bytes=pdf([date,...table.split('\n'),total]),snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:digest(bytes)};const [parsed]=await new PdfTextExtractor().extract([{snapshot,bytes}]);const payload=output();payload.items[0].fields.purchaseDate.evidence.excerpt=parsed.pages[0].split('\n').find(line=>line.startsWith('Ricevuta'));const x=productExtraction(payload,{kind:'text',snapshot,pages:parsed.pages});assert.equal(x.items.length,1);assert.equal(x.items[0].quantity.value,1);assert.equal(x.purchaseTotal.amountCents,9950);});
const {purchaseDateSource}=require('../dist/object-onboarding/invoice-evidence');
test('purchase dates accept order and receipt headings, including physical line breaks',()=>{
 for(const label of ['Il tuo ordine del','Ordine effettuato il','Data di acquisto:','Ricevuta d’acquisto','Ricevuta d\'acquisto'])for(const separator of [' ','\n']){
  const excerpt=label+separator+'12 maggio 2025';assert.equal(purchaseDateSource(excerpt,'2025-05-12'),excerpt);
 }
});
test('date-only citation is expanded from its own labelled original line',()=>{
 for(const line of ['Il tuo ordine del 12 maggio 2025',"Ricevuta d’acquisto\n12 maggio 2025"]){
 const x=output();x.items[0].fields.purchaseDate.evidence=ev('12 maggio 2025');
 const parsed=productExtraction(x,context([line,table,total].join('\n')));
 assert.equal(parsed.items[0].fields.purchaseDate.source.excerpt,line);
 assert.equal(proposedProfile(parsed.items[0]).warrantyEnd.value,'2027-05-12');
 }
});
test('a label on a different page or across unrelated lines never validates a bare date',()=>{
 for(const page of ['12 maggio 2025',"Ricevuta d’acquisto\nDestinatario demo\n12 maggio 2025",'Produzione 12 maggio 2025'])assert.equal(purchaseDateSource('12 maggio 2025','2025-05-12',page),null);
 const x=output();x.items[0].fields.purchaseDate.evidence=ev('12 maggio 2025');const ctx=context([table,total,'12 maggio 2025'].join('\n'));ctx.pages.push('Il tuo ordine del 12 maggio 2025');
 assert.throws(()=>productExtraction(x,ctx),e=>e.field==='purchaseDate'&&e.reason==='date');
});
test('repeated dates require consistent purchase contexts and ambiguous/expected dates stay blocked',()=>{
 assert.equal(purchaseDateSource('12 maggio 2025','2025-05-12','Il tuo ordine del 12 maggio 2025\nConsegna prevista 12 maggio 2025'),null);
 assert.equal(purchaseDateSource('12 maggio 2025','2025-05-12','Il tuo ordine del 12 maggio 2025\nRicevuta d’acquisto 12 maggio 2025'),'Il tuo ordine del 12 maggio 2025');
 for(const line of ['Il tuo ordine del 12 maggio 2025; consegna prevista 14 maggio 2025','Il tuo ordine del 12 maggio 2025; produzione 12 maggio 2025'])assert.equal(purchaseDateSource(line,'2025-05-12'),null);
});
test('purchase heading context does not grant purchase dates to a delivery notice or manufacture missing year',()=>{
 const x=output();x.documentKind='delivery_notice';x.purchaseTotal=null;x.items[0].fields.purchaseDate.evidence=ev('12 maggio 2025');
 assert.throws(()=>productExtraction(x,context('Il tuo ordine del 12 maggio 2025\n'+table)),e=>e.field==='purchaseDate');
 assert.equal(purchaseDateSource('Ricevuta d’acquisto 12 maggio','2025-05-12'),null);
});
test('generated PDF through wire normalization and domain verifies short date citation locally',async()=>{
 const {onboardingWireOutput}=require('../dist/object-onboarding/anthropic-provider');
 const bytes=pdf(['Il tuo ordine del 12 maggio 2025',...table.split('\n'),total]);const snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:digest(bytes)};
 const [parsed]=await new PdfTextExtractor().extract([{snapshot,bytes}]);const x=output();x.items[0].fields.purchaseDate.evidence=ev('12 maggio 2025');
 const wire={...x,items:x.items.map(item=>({...item,fields:Object.entries(item.fields).map(([field,data])=>({field,...data}))}))};
 const result=productExtraction(onboardingWireOutput(wire),{kind:'text',snapshot,pages:parsed.pages});assert.equal(result.items[0].fields.purchaseDate.value,'2025-05-12');assert.equal(result.purchaseTotal.amountCents,9950);
});
