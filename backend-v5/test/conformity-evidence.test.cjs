require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const fixtures=require('./document-understanding-fixture.cjs');
const {productExtraction}=require('../dist/object-onboarding/domain');
const {proposedProfile}=require('../dist/object-onboarding/profile');
function setup(){const f=fixtures.conformity();return {f,date:f.raw.facts.find(x=>x.field==='documentDate'),type:f.raw.facts.find(x=>x.field==='systemType')};}
const dateValue=out=>out.documentInfo.facts.find(x=>x.field==='documentDate');
const typeValue=out=>out.documentInfo.facts.find(x=>x.field==='systemType')?.value;

for(const label of ['Data:','Data dichiarazione:','Data di rilascio:'])for(const gap of [' ','\n'])test('conformity bare date recovers its own contiguous label: '+label+JSON.stringify(gap),()=>{
 const {f,date}=setup();f.lines[3]=label+gap+'08/07/2026';date.evidence.excerpt='08/07/2026';
 const out=productExtraction(f.raw,fixtures.context(f));assert.equal(dateValue(out)?.value,'2026-07-08');assert.equal(dateValue(out).source.excerpt,f.lines[3]);
 const profile=proposedProfile(out.items[0]);assert.equal(profile.purchaseDate,undefined);assert.equal(profile.warrantyStart,undefined);
});

test('conformity never borrows document date meaning across pages or intervening content',()=>{
 for(const page of ['Data:\nAltro contenuto\n08/07/2026','08/07/2026','Data installazione: 08/07/2026','Data scadenza: 08/07/2026','Data acquisto: 08/07/2026','Data produzione: 08/07/2026']){
  const {f,date}=setup();f.lines[3]=page;date.evidence.excerpt='08/07/2026';const ctx=fixtures.context(f);ctx.pages.push('Data dichiarazione: 08/07/2026');assert.equal(dateValue(productExtraction(f.raw,ctx)),undefined);
 }
});

test('ambiguous repeated dates cannot gain a declaration label',()=>{
 const {f,date}=setup();date.evidence.excerpt='08/07/2026';f.lines.push('Data installazione: 08/07/2026');assert.equal(dateValue(productExtraction(f.raw,fixtures.context(f))),undefined);
});

for(const [value,line,canonical]of [['elettrico','Impianto elettrico','electrical'],['impianto idrico','Impianto idrico','plumbing'],['termico','Impianto termico','heating'],['climatizzazione','Impianto di climatizzazione','cooling']])test('printed Italian system label maps to canonical type: '+value,()=>{
 const {f,type}=setup();f.lines.push(line);type.value=value;type.evidence.excerpt=line;assert.equal(typeValue(productExtraction(f.raw,fixtures.context(f))),canonical);
});

test('system type normalization cannot invent a label or take a type from another source',()=>{
 for(const [value,excerpt]of [['elettrico','Nuovo quadro'],['impianto elettrico','Impianto idrico'],['generic appliance','Impianto elettrico']]){
  const {f,type}=setup();f.lines.push(excerpt);type.value=value;type.evidence.excerpt=excerpt;const out=productExtraction(f.raw,fixtures.context(f));assert.equal(typeValue(out),undefined);assert(out.reviewWarnings.some(w=>w.field==='0:systemType'));
 }
});

test('a visual bare date stays unverified without its observed document label',()=>{
 const {f,date}=setup();date.evidence.excerpt='08/07/2026';for(const s of [...f.raw.documentInfo.map(x=>x.evidence),...f.raw.facts.map(x=>x.evidence),...f.raw.items.flatMap(i=>Object.values(i.fields).map(x=>x.evidence))])s.region={x:0.1,y:0.1,width:0.8,height:0.8};
 const out=productExtraction(f.raw,{kind:'visual_pdf',snapshot:fixtures.context(f).snapshot,pageCount:1});assert.equal(dateValue(out),undefined);assert(out.reviewWarnings.some(w=>w.field==='-1:documentDate'));
});

test('complete visual declaration date citation keeps its observed provenance and semantics',()=>{
 const {f,date}=setup();date.evidence.excerpt='Dichiarazione di conformita\nData di rilascio: 08/07/2026';
 for(const s of [...f.raw.documentInfo.map(x=>x.evidence),...f.raw.facts.map(x=>x.evidence),...f.raw.items.flatMap(i=>Object.values(i.fields).map(x=>x.evidence))])s.region={x:0.1,y:0.1,width:0.8,height:0.8};
 const out=productExtraction(f.raw,{kind:'visual_pdf',snapshot:fixtures.context(f).snapshot,pageCount:1});assert.equal(dateValue(out)?.value,'2026-07-08');assert.equal(dateValue(out).source.basis,'provider_observed_image');assert.equal(proposedProfile(out.items[0]).purchaseDate,undefined);
});

test('real synthetic PDF parser and pooled wire keep declaration date and Italian type without network',async()=>{
 const {PdfTextExtractor}=require('../dist/review/pdf-text'),{digest}=require('../dist/security'),{onboardingWireOutput}=require('../dist/object-onboarding/anthropic-provider');
 const {f,date,type}=setup();f.lines[3]='Data di rilascio:\n08/07/2026';date.evidence.excerpt='08/07/2026';type.value='elettrico';
 const bytes=fixtures.pdf(f.lines.flatMap(s=>s.split('\n'))),snapshot={...fixtures.context(f).snapshot,documentSha256:digest(bytes)};
 const [parsed]=await new PdfTextExtractor().extract([{bytes,snapshot}]);const out=productExtraction(onboardingWireOutput(fixtures.wire(f.raw)),{kind:'text',snapshot,pages:parsed.pages});
 assert.equal(dateValue(out)?.value,'2026-07-08');assert.equal(typeValue(out),'electrical');assert.equal(dateValue(out).source.sha256,snapshot.documentSha256);assert.equal(dateValue(out).source.basis,'verified_text');
});
