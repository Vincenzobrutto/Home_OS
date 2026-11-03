const {randomUUID}=require('node:crypto');
function planFixture(sourceId='map-source',sha256='a'.repeat(64),version=1){
 const room=(id,label,kind,x,y,w,h)=>({id,label,kind,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],holes:[],seed:null,component:null,pixelArea:null,symbols:[],origin:'manual'});
 return {id:'synthetic-map',creatorId:randomUUID(),proof:{sourceId,version,sha256,page:1},fingerprint:'b'.repeat(64),rasterSize:{width:100,height:100},rasterSHA256:'c'.repeat(64),resultDigest:'d'.repeat(64),version:3,createdAt:new Date().toISOString(),geometryRevision:2,rooms:[room('kitchen','Cucina','kitchen',5,5,40,40),room('corridor','Corridoio','corridor',5,50,40,10),room('balcony','Balcone','balcony',50,5,40,40)],issues:[{id:'balcony',code:'destination_requires_review'}],warnings:[],retainedSymbols:[],calls:[],status:'needs_review',confirmed:false,mainPerimeter:null,surfaceProposal:null,measurementConfiguration:{calibration:{start:[0,0],end:[100,0],metres:10,confirmed:true,maxRelativeError:.01}}};
}
module.exports={planFixture};
