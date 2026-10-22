const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {load,ROOT}=require('./corpus-v3/corpus.cjs');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
test('quality v3: hashed synthetic originals and independently versioned gold',()=>{
 const {manifest,cases}=load();assert([30,52].includes(cases.length));
 assert.equal(manifest.version,manifest.goldVersion);
 for(const c of cases){assert(c.gold.forbidden.includes('invented_evidence'));assert(c.gold.reviewReason.length>30);if(c.group==='difficult')assert.equal(c.gold.automatic,'review');assert(c.bytes.length<20*1024*1024);}
});
test('quality v3: real production PDF parser, all physical text pages and scan rejection',async()=>{
 const parser=new PdfTextExtractor();
 for(const c of load().cases.filter(c=>c.mimeType==='application/pdf')){
  if(c.sourceMode==='visual_pdf')await assert.rejects(()=>parser.parse(c.bytes),e=>e.code==='pdf_text_unavailable',c.id);
  else{const pages=await parser.parse(c.bytes);assert.equal(pages.length,c.pages,c.id);assert(pages.every(p=>p.length>100),c.id);fs.mkdirSync(path.join(ROOT,'.build','parsed'),{recursive:true});fs.writeFileSync(path.join(ROOT,'.build','parsed',c.id+'.json'),JSON.stringify(pages));}
 }
});
