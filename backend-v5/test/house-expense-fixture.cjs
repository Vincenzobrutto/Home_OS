const {digest}=require('../dist/security');
function bill(kind='electricity',n='SYNTH-01',cents=8450){
 const category=kind==='gas'?'gas':'energia elettrica',supplier='Fornitore sintetico';
 const lines=['DIMORA SYNTHETIC ONLY','Bolletta '+category,'Fornitore: '+supplier,'Numero documento: '+n,'Data documento: 2026-09-15','Periodo di competenza dal 01/09/2026 al 30/09/2026','Totale bolletta: '+(cents/100).toFixed(2).replace('.',',')+' EUR'];
 const stream='BT /F1 12 Tf 40 790 Td '+lines.map((v,i)=>(i?'0 -24 Td ':'')+'('+v+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
 let source='%PDF-1.4\n';const offsets=[];objects.forEach((v,i)=>{offsets.push(Buffer.byteLength(source));source+=(i+1)+' 0 obj\n'+v+'\nendobj\n';});const start=Buffer.byteLength(source);source+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('');
 const bytes=Buffer.from(source+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
 const ev=excerpt=>({page:1,excerpt,region:null}),f=(value,excerpt=value)=>({value,evidence:ev(excerpt)});
 const raw={documentKind:'utility_bill',hasMoreItems:false,purchaseTotal:null,items:[],houseExpenses:[{fields:{title:f(lines[1]),category:f(kind,lines[1]),supplier:f(supplier,lines[2]),documentNumber:f(n,lines[3]),documentDate:f('2026-09-15',lines[4]),competenceFrom:f('2026-09-01',lines[5]),competenceTo:f('2026-09-30',lines[5])},amountCandidates:[{id:'total',amountCents:cents,role:'current_document_total',label:'Totale bolletta',evidence:ev(lines[6])}]}]};
 return {bytes,raw,lines,sha:digest(bytes)};
}
module.exports={bill};
