// New owned synthetic cluster only. No user documents, existing service, AI, scanner or network.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{assertDevelopmentDatabase}=require('../dist/prisma.service');
const {ObjectOnboardingAccess}=require('../dist/object-onboarding/access'),{ReviewService}=require('../dist/review/review.service');
const {TrashService}=require('../dist/documents/trash.service'),{DocumentPolicy}=require('../dist/documents/access');
const {HomePlanOperatorImporter,OPERATOR_IMPORT_CAVEAT}=require('../dist/home-maps/operator-import'),{mapDigest}=require('../dist/home-maps/snapshot');
const bytes=Buffer.from('%PDF-1.4\nSYNTHETIC ORIGINAL FOR OPERATOR TEST\n%%EOF'),sha=createHash('sha256').update(bytes).digest('hex');
const fail=(status,code)=>e=>e.getStatus?.()===status&&(!code||e.getResponse()?.code===code);
test('operator map import reuses existing rooms without changing canonical objects or placements',{timeout:240000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN);
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const stored=new Map(),access=new ObjectOnboardingAccess(db,new ReviewService(db,{})),storage={async read(key){if(!stored.has(key))throw Error('Synthetic original absent');return Buffer.from(stored.get(key));}},importer=new HomePlanOperatorImporter(access,storage),trash=new TrashService(db,{},new DocumentPolicy(db));
 async function world({version=2,privateOther=false,role='owner'}={}){
  const account=await db.account.create({data:{email:randomUUID()+'@example.test',name:'Synthetic operator owner',passwordHash:'no-login'}}),other=await db.account.create({data:{email:randomUUID()+'@example.test',name:'Synthetic other',passwordHash:'no-login'}});
  const home=await db.home.create({data:{name:'Synthetic existing home',address:'Synthetic address'}}),foreignHome=await db.home.create({data:{name:'Synthetic foreign home',address:'Other synthetic address'}});
  await db.homeMembership.createMany({data:[{accountId:account.id,homeId:home.id,role,validFrom:new Date(0)},{accountId:other.id,homeId:home.id,role:'owner',validFrom:new Date(0)}]});
  const kitchen=await db.homeRoom.create({data:{homeId:home.id,name:'Cucina esistente',type:'kitchen',note:'Keep this exact record'}}),bedroom=await db.homeRoom.create({data:{homeId:home.id,name:'Camera esistente',type:'bedroom'}}),foreignRoom=await db.homeRoom.create({data:{homeId:foreignHome.id,name:'Other room',type:'other'}});
  const object=await db.homeObject.create({data:{accountId:account.id,homeId:home.id,name:'Frigorifero esistente',type:'appliance',profile:{model:{value:'Keep exact profile'}}}}),position=await db.objectPosition.create({data:{accountId:account.id,homeId:home.id,objectId:object.id,roomIds:[kitchen.id,bedroom.id],version:4}});
  const fileKey=randomUUID()+'.bin';stored.set(fileKey,Buffer.from(bytes));
  const document=await db.document.create({data:{homeId:home.id,uploaderId:privateOther?other.id:account.id,visibility:'private',name:'Synthetic existing plan',original:{create:{version,originalFilename:'synthetic-existing.pdf',mimeType:'application/pdf',byteSize:bytes.length,sha256:sha,file:{create:{storageKey:fileKey}}}}},include:{original:true}});
  const content={schemaVersion:1,planId:'synthetic-reconstruction-'+randomUUID(),planVersion:1,geometryRevision:1,source:{sourceId:document.id,version,sha256:sha,page:1},frame:{width:100,height:100,rasterSha256:'b'.repeat(64),coordinateSystem:'rendered-page-top-left',transform:[1,0,0,-1,0,100]},rooms:[{id:'kitchen',name:'Cucina da bozza',type:'kitchen',points:[[0,0],[40,0],[40,40],[0,40]],holes:[]},{id:'hall',name:'Corridoio da bozza',type:'corridor',points:[[0,50],[80,50],[80,60],[0,60]],holes:[]}],calibration:null,qualification:'unverified',mainPerimeter:null,caveats:[OPERATOR_IMPORT_CAVEAT,'Contorni sintetici: nessuna completezza o misura verificata.'],reviewedBy:account.id,reviewedAt:new Date().toISOString()};
  const input={expectedAccountEmail:account.email,documentId:document.id,expectedDocumentVersion:version,expectedDocumentSha256:sha,snapshot:{...content,digest:mapDigest(content)},bindings:[{regionId:'kitchen',kind:'existing',roomId:kitchen.id},{regionId:'hall',kind:'create',name:'Corridoio importato',type:'hall'}],reason:'Collegamento controllato della bozza sintetica',provenance:{kind:'backoffice_reconstruction',sourceDigest:'c'.repeat(64),note:'Test sintetico, nessun file reale'}};
  const preview=()=>importer.preview(account.id,home.id,input),apply=(p,key=randomUUID(),body=input)=>importer.apply(account.id,home.id,body,p.fingerprint,key);
  const unchanged=async()=>({rooms:await db.homeRoom.findMany({where:{id:{in:[kitchen.id,bedroom.id]}},orderBy:{id:'asc'}}),objects:await db.homeObject.findMany({where:{accountId:account.id,homeId:home.id},orderBy:{id:'asc'}}),positions:await db.objectPosition.findMany({where:{accountId:account.id,homeId:home.id},orderBy:{id:'asc'}})});
  return {account,other,home,foreignHome,kitchen,bedroom,foreignRoom,object,position,document,fileKey,input,preview,apply,unchanged};
 }
 await t.test('preview is read-only and binds one existing room plus one explicit creation to source version2',async()=>{
  const f=await world(),before=await f.unchanged(),p=await f.preview();assert.equal(p.documentVersion,2);assert.equal(p.reuse[0].roomId,f.kitchen.id);assert.equal(p.create[0].regionId,'hall');assert.equal(p.objectCount,1);assert.equal(p.positionCount,1);assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);assert.equal(await db.objectRequest.count({where:{homeId:f.home.id}}),0);assert.deepEqual(await f.unchanged(),before);
 });
 await t.test('mixed import creates only the missing room, preserves original objects/positions and stores independent draft audit',async()=>{
  const f=await world(),before=await f.unchanged(),p=await f.preview(),result=await f.apply(p),map=await db.homeDigitalPlan.findUniqueOrThrow({where:{id:result.mapId}});assert.equal(result.createdRoomIds.length,1);assert.deepEqual(result.reusedRoomIds,[f.kitchen.id]);assert.equal(result.roomBindings.kitchen,f.kitchen.id);assert.equal(map.documentVersion,2);assert.equal(map.documentSha256,sha);assert.equal(map.layout.qualification,'unverified');assert.equal(map.layout.calibration,null);assert.equal(map.layout.mainPerimeter,null);assert.deepEqual(map.received,map.layout);assert.deepEqual(map.pins,[]);assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),3);assert.deepEqual(await f.unchanged(),before);
  const events=await db.objectEvent.findMany({where:{homeId:f.home.id},orderBy:{kind:'asc'}});assert.deepEqual(events.map(e=>e.kind),['created','operator_imported']);assert.equal(events[1].after.origin,'backoffice_reconstruction');assert.equal(events[1].after.draft,true);assert.equal(events[1].after.provenance.sourceDigest,f.input.provenance.sourceDigest);assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{accountId:f.account.id}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.account.id}}),0);
 });
 await t.test('all existing explicit bindings create no duplicate rooms',async()=>{
  const f=await world();f.input.bindings[1]={regionId:'hall',kind:'existing',roomId:f.bedroom.id};const before=await f.unchanged(),result=await f.apply(await f.preview());assert.deepEqual(result.createdRoomIds,[]);assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),2);assert.deepEqual(await f.unchanged(),before);
 });
 await t.test('reserved dictionary region IDs fail before any map, room, receipt or event write',async()=>{
  for(const id of ['__proto__','constructor','prototype']){const f=await world(),p=await f.preview(),before=await f.unchanged();f.input.snapshot.rooms[0].id=id;f.input.bindings[0].regionId=id;const content={...f.input.snapshot};delete content.digest;f.input.snapshot.digest=mapDigest(content);
   await assert.rejects(async()=>f.preview(),fail(422));await assert.rejects(async()=>f.apply(p),fail(422));assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),2);assert.equal(await db.objectRequest.count({where:{homeId:f.home.id}}),0);assert.equal(await db.objectEvent.count({where:{homeId:f.home.id}}),0);assert.deepEqual(await f.unchanged(),before);
  }
 });
 await t.test('exact replay survives importer recreation and makes no duplicate map, room or event',async()=>{
  const f=await world(),p=await f.preview(),key=randomUUID(),first=await f.apply(p,key),second=await new HomePlanOperatorImporter(access,storage).apply(f.account.id,f.home.id,f.input,p.fingerprint,key);assert.equal(second.replay,true);assert.deepEqual({...second,replay:false},first);assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),1);assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),3);assert.equal(await db.objectEvent.count({where:{homeId:f.home.id}}),2);
  await assert.rejects(f.apply(p,key,{...f.input,reason:'Changed reason'}),fail(409,'idempotency_conflict'));await assert.rejects(f.apply(p,randomUUID()),fail(422));
 });
 await t.test('concurrent same-key apply is serialized and produces one map',async()=>{
  const f=await world(),p=await f.preview(),key=randomUUID(),results=await Promise.all([f.apply(p,key),f.apply(p,key)]);assert.equal(results.filter(r=>r.replay).length,1);assert.equal(results[0].mapId,results[1].mapId);assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),1);
 });
 await t.test('changed existing room, object placement, original source or target inventory invalidates preview',async()=>{
  for(const change of ['room','position','source','inventory']){const f=await world(),p=await f.preview();if(change==='room')await db.homeRoom.update({where:{id:f.kitchen.id},data:{name:'Changed room',version:{increment:1}}});if(change==='position')await db.objectPosition.update({where:{id:f.position.id},data:{roomIds:[f.bedroom.id],version:{increment:1}}});if(change==='source')await db.documentVersion.update({where:{id:f.document.original.id},data:{version:3}});if(change==='inventory')await db.homeRoom.create({data:{homeId:f.home.id,name:'New room after preview',type:'other'}});await assert.rejects(f.apply(p),e=>[403,409].includes(e.getStatus?.()));assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);}
 });
 await t.test('archived, foreign, duplicate or implicit room choices are refused without writes',async()=>{
  for(const change of ['archived','foreign','duplicate','same-name-create']){const f=await world();if(change==='archived')await db.homeRoom.update({where:{id:f.kitchen.id},data:{state:'archived'}});if(change==='foreign')f.input.bindings[0].roomId=f.foreignRoom.id;if(change==='duplicate')f.input.bindings[1]={regionId:'hall',kind:'existing',roomId:f.kitchen.id};if(change==='same-name-create')f.input.bindings[1].name=f.kitchen.name;await assert.rejects(async()=>f.preview(),fail(422));assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);assert.equal(await db.objectRequest.count({where:{homeId:f.home.id}}),0);}
 });
 await t.test('owner role, exact account email and readable private source are required',async()=>{
  const viewer=await world({role:'viewer'});await assert.rejects(async()=>viewer.preview(),fail(403));
  const member=await world({role:'member'});await assert.rejects(async()=>member.preview(),fail(403));
  const privateOther=await world({privateOther:true});await assert.rejects(async()=>privateOther.preview(),fail(403));
  const changedEmail=await world();changedEmail.input.expectedAccountEmail='another@example.test';await assert.rejects(async()=>changedEmail.preview(),fail(403));
 });
 await t.test('revocation and source trash deny both first import and exact receipt replay',async()=>{
  for(const change of ['revoked','trashed']){const f=await world(),p=await f.preview(),key=randomUUID();await f.apply(p,key);if(change==='revoked')await db.homeMembership.update({where:{accountId_homeId:{accountId:f.account.id,homeId:f.home.id}},data:{revokedAt:new Date()}});else await trash.trash(f.account.id,f.home.id,f.document.id,{expectedVersion:f.document.original.version},randomUUID());await assert.rejects(f.apply(p,key),fail(403));assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),1);}
 });
 await t.test('replay rechecks source version, owner role and mapped room availability before returning a receipt',async()=>{
  for(const change of ['version','role','room']){const f=await world(),p=await f.preview(),key=randomUUID();await f.apply(p,key);if(change==='version')await db.documentVersion.update({where:{id:f.document.original.id},data:{version:3}});if(change==='role')await db.homeMembership.update({where:{accountId_homeId:{accountId:f.account.id,homeId:f.home.id}},data:{role:'member'}});if(change==='room')await db.homeRoom.update({where:{id:f.kitchen.id},data:{state:'archived'}});await assert.rejects(f.apply(p,key),e=>[403,409].includes(e.getStatus?.()));assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),1);assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),3);}
 });
 await t.test('missing/corrupted physical original or wrong media cannot create a map',async()=>{
  for(const change of ['missing','corrupt','media']){const f=await world();if(change==='missing')stored.delete(f.fileKey);if(change==='corrupt')stored.set(f.fileKey,Buffer.from('changed'));if(change==='media')await db.documentVersion.update({where:{id:f.document.original.id},data:{mimeType:'image/png'}});await assert.rejects(async()=>f.preview());assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);}
 });
 await t.test('new-room and audit writes roll back with a failing final map insert',async()=>{
  const f=await world(),before=await f.unchanged(),p=await f.preview();await db.$executeRawUnsafe("CREATE FUNCTION synthetic_operator_map_block() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic operator interruption'; END; $$");await db.$executeRawUnsafe('CREATE TRIGGER synthetic_operator_map_block BEFORE INSERT ON "HomeDigitalPlan" FOR EACH ROW EXECUTE FUNCTION synthetic_operator_map_block()');
  try{await assert.rejects(f.apply(p));assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),2);assert.equal(await db.objectEvent.count({where:{homeId:f.home.id}}),0);assert.equal(await db.objectRequest.count({where:{homeId:f.home.id}}),0);assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);assert.deepEqual(await f.unchanged(),before);}finally{await db.$executeRawUnsafe('DROP TRIGGER synthetic_operator_map_block ON "HomeDigitalPlan"');await db.$executeRawUnsafe('DROP FUNCTION synthetic_operator_map_block()');}
 });
 await t.test('a physically changed original during application rolls back the new map, room and events',async()=>{
  const f=await world(),p=await f.preview(),before=await f.unchanged();let reads=0;
  const changing=new HomePlanOperatorImporter(access,{async read(key){reads++;return reads===3?Buffer.from('changed during apply'):storage.read(key);}});
  await assert.rejects(changing.apply(f.account.id,f.home.id,f.input,p.fingerprint,randomUUID()),fail(409,'operator_source_unavailable'));assert.equal(reads,3);assert.equal(await db.homeDigitalPlan.count({where:{homeId:f.home.id}}),0);assert.equal(await db.homeRoom.count({where:{homeId:f.home.id}}),2);assert.equal(await db.objectEvent.count({where:{homeId:f.home.id}}),0);assert.equal(await db.objectRequest.count({where:{homeId:f.home.id}}),0);assert.deepEqual(await f.unchanged(),before);
 });
 await t.test('existing map is never replaced even under a different key and all-existing choices',async()=>{
  const f=await world();f.input.bindings[1]={regionId:'hall',kind:'existing',roomId:f.bedroom.id};const p=await f.preview(),first=await f.apply(p),before=await db.homeDigitalPlan.findUniqueOrThrow({where:{id:first.mapId}});await assert.rejects(f.apply(p,randomUUID()),fail(409,'operator_import_stale'));await assert.rejects(async()=>f.preview(),fail(409,'operator_map_exists'));assert.deepEqual(await db.homeDigitalPlan.findUniqueOrThrow({where:{id:first.mapId}}),before);
 });
});
