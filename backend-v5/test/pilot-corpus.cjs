// Synthetic ground truth. Assertions about this corpus are not provider accuracy measurements.
const {readFile}=require('node:fs/promises');const {resolve}=require('node:path');const {createHash}=require('node:crypto');
const {economicFixturePdf}=require('../dist/economy/document-fixture');const {jpeg}=require('./document-fixtures.cjs');
const fact=(key,value,excerpt)=>({key,value,page:1,excerpt});
const amount=(value,excerpt,role='current_document_total')=>fact('amount.'+role,value,excerpt);
const field=(key,value,excerpt)=>fact(key,value,excerpt);
const row=(id,group,lines,facts=[],absent=[],outcome='proposal')=>({id,group,lines,facts,absent,outcome});
const cases=[
  {...row('P01','utility',[],[amount(8000,'Totale corrente bolletta: 80,00 EUR'),amount(2000,'Saldo precedenti bollette: 20,00 EUR','arrears_balance'),amount(10000,'Importo da pagare: 100,00 EUR','amount_due'),field('category','gas','Bolletta gas settembre')]),fixture:'gas'},
  row('P02','utility',['Bolletta energia elettrica','Totale documento: 64,50 EUR','Data documento: 2026-09-30'],[amount(6450,'Totale documento: 64,50 EUR'),field('category','electricity','Bolletta energia elettrica'),field('documentDate','2026-09-30','Data documento: 2026-09-30')]),
  row('P03','utility',['Bolletta acqua','Totale documento: 35,20 EUR'],[amount(3520,'Totale documento: 35,20 EUR'),field('category','water','Bolletta acqua')],['dueOn']),
  row('P04','utility',['Bolletta gas con conguaglio','Consumi: 60,00 EUR','Conguaglio: 20,00 EUR','Totale corrente: 80,00 EUR'],[amount(8000,'Totale corrente: 80,00 EUR')]),
  row('P05','utility',['Bolletta gas','Riferimento periodo: primavera','Totale documento: 45,00 EUR'],[amount(4500,'Totale documento: 45,00 EUR')],['competenceFrom','competenceTo']),
  row('P06','utility',['Bolletta energia elettrica','Totale corrente: 120,00 EUR','Credito precedente: 30,00 EUR','Da pagare: 90,00 EUR'],[amount(12000,'Totale corrente: 120,00 EUR'),amount(9000,'Da pagare: 90,00 EUR','amount_due')]),
  {...row('P07','invoice',[],[amount(12200,'Totale documento: 122,00 EUR'),amount(10000,'Imponibile: 100,00 EUR','taxable'),amount(2200,'IVA: 22,00 EUR','tax')]),fixture:'invoice'},
  row('P08','invoice',['Fattura lavori bagno','Fornitore: Impresa Demo','Totale fattura: 3500,00 EUR'],[amount(350000,'Totale fattura: 3500,00 EUR'),field('supplier','Impresa Demo','Fornitore: Impresa Demo')]),
  row('P09','invoice',['Fattura acquisto lavatrice','Modello: LD-7','Totale documento: 499,99 EUR'],[amount(49999,'Totale documento: 499,99 EUR')],['warrantyEndsOn']),
  row('P10','invoice',['Fattura acconto lavori','Acconto fatturato: 500,00 EUR','Valore preventivo: 2000,00 EUR'],[amount(50000,'Acconto fatturato: 500,00 EUR'),amount(200000,'Valore preventivo: 2000,00 EUR','other')]),
  row('P11','invoice',['Nota di credito','Storno totale: -50,00 EUR'],[],['amount.current_document_total'],'no_supported_economic_data'),
  row('P12','invoice',['Fattura acquisto forno e lavatrice','Forno: 300,00 EUR','Lavatrice: 500,00 EUR','Totale documento: 800,00 EUR'],[amount(80000,'Totale documento: 800,00 EUR')],['singleObjectId']),
  row('P13','technical',['Scheda caldaia','Marca: Termica Demo','Modello: TD-24'],[field('brand','Termica Demo','Marca: Termica Demo'),field('model','TD-24','Modello: TD-24')],['power']),
  row('P14','technical',['Scheda caldaia','Potenza utile al riscaldamento: 24 kW','Potenza nominale: 28 kW'],[field('power.useful_heating','24','Potenza utile al riscaldamento: 24 kW'),field('power.nominal','28','Potenza nominale: 28 kW')]),
  row('P15','technical',['Libretto caldaia','Marca: Termica Demo','Potenza: non riportata'],[field('brand','Termica Demo','Marca: Termica Demo')],['power','model']),
  row('P16','technical',['Libretto caldaia - dato dichiarato','Modello riportato nel libretto: TD-24','Scheda allegata - modello: TD-28'],[field('model.libretto','TD-24','Modello riportato nel libretto: TD-24'),field('model.allegato','TD-28','Scheda allegata - modello: TD-28')],['model.resolved']),
  {...row('P17','negative',[],[],[],'pdf_text_unavailable'),fixture:'scanned'},
  {...row('P18','negative',[],[],[],'pdf_invalid'),fixture:'jpeg'},
  {...row('P19','negative',[],[],[],'pdf_encrypted'),fixture:'encrypted'},
  row('P20','negative',['Manuale uso telecomando','Premere il tasto per accendere la luce'],[],['amount.current_document_total','brand','power'],'no_relevant_data'),
  row('P21','ambiguous',['Fattura manutenzione','Data documento: 03/04/2026','Scadenza: 30/04/2026','Totale documento: 80,00 EUR'],[field('documentDate','2026-04-03','Data documento: 03/04/2026'),field('dueOn','2026-04-30','Scadenza: 30/04/2026'),amount(8000,'Totale documento: 80,00 EUR')],['paidOn']),
  row('P22','ambiguous',['Fattura riparazione','Totale: 80,00 USD'],[],['amount.current_document_total'],'no_supported_economic_data'),
  row('P23','ambiguous',['Fattura lavori','Imponibile: 1.000,00 EUR','IVA: 220,00 EUR','Totale documento: 1.220,00 EUR'],[amount(122000,'Totale documento: 1.220,00 EUR'),amount(100000,'Imponibile: 1.000,00 EUR','taxable'),amount(22000,'IVA: 220,00 EUR','tax')]),
  row('P24','ambiguous',['Fattura acquisto filtro','Venditore: Negozio Demo','Totale documento: 15,00 EUR'],[amount(1500,'Totale documento: 15,00 EUR'),field('supplier','Negozio Demo','Venditore: Negozio Demo')],['professionalId','professionalPhone']),
];
function textPdf(lines){
  if(lines.some(line=>/[^\x20-\x7e]/.test(line)))throw Error('Fixture generator uses ASCII only');
  const stream='BT /F1 12 Tf 40 790 Td '+lines.map((line,i)=>(i?'0 -24 Td ':'')+'('+line.replace(/[()\\]/g,c=>'\\'+c)+') Tj').join('\n')+' ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
  let source='%PDF-1.4\n';const offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(source));source+=(i+1)+' 0 obj\n'+object+'\nendobj\n';});const xref=Buffer.byteLength(source);source+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');return Buffer.from(source+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
}
async function materialize(item){
  const bytes=item.fixture==='gas'||item.fixture==='invoice'?economicFixturePdf(item.fixture):item.fixture==='jpeg'?jpeg:item.fixture==='scanned'||item.fixture==='encrypted'?await readFile(resolve(__dirname,'../../docs/v5/fixtures/m4',item.fixture==='scanned'?'caldaia-solo-immagine.pdf':'caldaia-protetta.pdf')):textPdf(item.lines);
  return {...item,bytes,sha256:createHash('sha256').update(bytes).digest('hex'),format:item.fixture==='jpeg'?'jpeg':'pdf'};
}
// Observation format is deliberately independent from a provider. Normalize its
// output separately; omitting a required case is an error, never a passing abstention.
function score(item,observation){
  if(!observation)return {missingObservation:true};
  const facts=observation.facts||[];const expected=new Map(item.facts.map(f=>[f.key,f]));
  const seen=new Set();let correct=0,wrong=0,unsupported=0;
  for(const f of facts){const gold=expected.get(f.key);if(seen.has(f.key)){wrong++;continue;}seen.add(f.key);if(!gold||f.value!==gold.value){wrong++;continue;}if(f.page!==gold.page||f.excerpt!==gold.excerpt){unsupported++;continue;}correct++;}
  return {missingObservation:false,outcomeCorrect:observation.outcome===item.outcome,correct,wrong,unsupported,omitted:item.facts.length-correct,forbidden:facts.filter(f=>item.absent.includes(f.key)).length,precision:correct+wrong+unsupported?correct/(correct+wrong+unsupported):null,recall:item.facts.length?correct/item.facts.length:null};
}
module.exports={cases,materialize,score};
