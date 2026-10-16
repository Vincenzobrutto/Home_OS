const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');const {cases,materialize,score}=require('./pilot-corpus.cjs');
const {PdfTextExtractor}=require('../dist/review/pdf-text');const {printedCents,printedDates}=require('../dist/economy/document-evidence');

test('Pilota: 24 casi sintetici con gruppi e attesi distinti, nessun provider chiamato',async()=>{
  assert.equal(cases.length,24);assert.equal(new Set(cases.map(c=>c.id)).size,24);
  assert.deepEqual(['utility','invoice','technical','negative','ambiguous'].map(group=>cases.filter(c=>c.group===group).length),[6,6,4,4,4]);
  const extractor=new PdfTextExtractor();
  for(const item of cases){const fixture=await materialize(item);assert.match(fixture.sha256,/^[a-f0-9]{64}$/);
    const snapshot={documentId:randomUUID(),documentVersion:1,documentSha256:fixture.sha256};
    if(['pdf_text_unavailable','pdf_invalid','pdf_encrypted'].includes(item.outcome)){await assert.rejects(extractor.extract([{snapshot,bytes:fixture.bytes}]),e=>e.code===item.outcome);continue;}
    const [{pages}]=await extractor.extract([{snapshot,bytes:fixture.bytes}]);
    for(const fact of item.facts){assert(pages[fact.page-1].includes(fact.excerpt),item.id+': evidence not present');if(fact.key.startsWith('amount.'))assert(printedCents(fact.excerpt).includes(fact.value),item.id+': printed amount mismatch');if(['documentDate','dueOn'].includes(fact.key))assert(printedDates(fact.excerpt).includes(fact.value),item.id+': printed date mismatch');}
  }
});
test('Scorer distinguishes correct facts, omissions, false positives and fabricated evidence',()=>{
  const item=cases[2],gold=item.facts[0];
  assert.equal(score(item,{outcome:item.outcome,facts:item.facts}).recall,1);
  const bad=score(item,{outcome:'proposal',facts:[{...gold,page:2},{key:'dueOn',value:'2026-01-01',page:1,excerpt:'invented'}]});
  assert.equal(bad.unsupported,1);assert.equal(bad.wrong,1);assert.equal(bad.forbidden,1);assert.equal(bad.omitted,2);assert.equal(bad.precision,0);
  assert.equal(score(item,undefined).missingObservation,true);
  assert.equal(score(item,{outcome:'proposal',facts:[]}).recall,0);
  assert.equal(score(cases[16],{outcome:'proposal',facts:[]}).outcomeCorrect,false);
  assert.equal(score(item,{outcome:'proposal',facts:[gold,gold]}).wrong,1);
});
