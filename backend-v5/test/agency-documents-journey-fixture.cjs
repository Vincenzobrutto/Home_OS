// Shared synthetic data for the acceptance journey and a separately owned browser harness.
// No src/ module imports this file. PDF bytes, names and provider output are invented.
const {createHash}=require('node:crypto');
const {nativePdf}=require('./agency-document-analysis-http-fixture.cjs');

function createAgencyDocumentsJourneyFixture(){
 const people={historical:'Elena Verdi',heirs:['Luca Bianchi','Sara Bianchi']};
 const successionText=[
  'Successione sintetica: Elena Verdi era proprietaria. Eredi dichiarati: Luca Bianchi e Sara Bianchi.',
  'Comune Bologna foglio 31 particella 312 subalterno 12.'
 ];
 const cadastreText=[
  'Intestazione catastale riportata: Elena Verdi. Dato sintetico da verificare.',
  'Comune Bologna foglio 31 particella 312 subalterno 13.'
 ];
 const candidate=(id,field,value,page,excerpt,role='unresolved',subjectRef='document-property')=>({id,field,value,page,excerpt,role,subjectRef,unitRef:'document-home'});
 const sources=[
  {id:'succession',kind:'succession',filename:'Successione sintetica - due eredi.pdf',pages:[1,2],lines:successionText,candidates:[
   candidate('historical-mother','party.name',people.historical,1,successionText[0],'historical_owner','historical-mother'),
   candidate('declared-luca','party.name',people.heirs[0],1,successionText[0],'declared_heir','declared-luca'),
   candidate('declared-sara','party.name',people.heirs[1],1,successionText[0],'declared_heir','declared-sara'),
   candidate('succession-sheet','cadastral.sheet','31',2,successionText[1]),
   candidate('succession-parcel','cadastral.parcel','312',2,successionText[1]),
   candidate('succession-sub','cadastral.subaltern','12',2,successionText[1]),
   candidate('invented-sub','cadastral.subaltern','99',2,'Subalterno 99 senza riscontro nel documento sintetico.')
  ]},
  {id:'cadastre',kind:'cadastral',filename:'Visura sintetica - dato discordante.pdf',pages:[1,2],lines:cadastreText,candidates:[
   candidate('cadastre-person','party.name',people.historical,1,cadastreText[0],'unresolved','cadastre-person'),
   candidate('cadastre-sheet','cadastral.sheet','31',2,cadastreText[1]),
   candidate('cadastre-parcel','cadastral.parcel','312',2,cadastreText[1]),
   candidate('cadastre-sub','cadastral.subaltern','13',2,cadastreText[1])
  ]}
 ];
 const documents=sources.map(({lines,...source})=>{const bytes=nativePdf(lines),sha256=createHash('sha256').update(bytes).digest('hex');return {...source,bytes,sha256};});
 return {label:'SUC-DEMO-001 - successione e difformita interna',people,documents,manifest:documents.map(d=>({sha256:d.sha256,sourceKind:d.kind,candidates:structuredClone(d.candidates)}))};
}
module.exports={createAgencyDocumentsJourneyFixture};
