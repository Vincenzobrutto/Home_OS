const {test}=require('node:test'),assert=require('node:assert/strict');
const matrix=require('../../docs/v5/fase0-document-family-matrix-v4-20261023.json');
const {ARCHIVE_FAMILIES}=require('../dist/documents/families');
test('all 147 generic source rows map to existing families or explicit non-document functions; mixed attachments stay unresolved',()=>{
 assert.equal(matrix.state,'proposal_only');assert.equal(matrix.rows.length,147);assert.equal(new Set(matrix.rows.map(r=>r.sourceRow)).size,147);
 assert.equal(new Set(matrix.rows.map(r=>r.area)).size,13);
 for(const r of matrix.rows){assert(r.sourceRow>=2&&r.sourceRow<=148);assert(r.reason.length>20);assert(r.candidateFamily===null||ARCHIVE_FAMILIES.includes(r.candidateFamily));assert(r.alternatives.every(f=>ARCHIVE_FAMILIES.includes(f)&&f!==r.candidateFamily));}
 const by=n=>matrix.rows.find(r=>r.sourceRow===n);
 assert.equal(by(13).candidateFamily,'insurance');assert.equal(by(85).candidateFamily,'tax');
 assert.equal(by(125).candidateFamily,'unclassified');assert.deepEqual(by(125).alternatives,['energy','building','condo','property']);
 assert.equal(matrix.rows.filter(r=>r.candidateFamily===null).length,9);assert.equal(by(145).status,'escluso_segreti');assert.deepEqual(by(145).candidateFunctions,[]);
 for(const r of matrix.rows)assert.deepEqual(Object.keys(r).filter(k=>/^(?:note|scadenza|prezzo|ceLho|marca|matricola)$/i.test(k)),[]);
});
