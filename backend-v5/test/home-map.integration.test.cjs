// Real HTTP/session/CSRF and owned synthetic DB/files. The injected scanner is a FIXTURE, not real AV.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes,createHash}=require('node:crypto'),path=require('node:path'),{readFile}=require('node:fs/promises');
const {Module,Global,ValidationPipe,UnprocessableEntityException}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{SessionsService,digest,COOKIE}=require('../dist/security');
const {GiftAccountModule,GiftDeliveryModule}=require('../dist/agency-practices/gift-http'),{GiftAcceptanceWorker}=require('../dist/agency-practices/gift-acceptance-worker');
const {GiftThrottle}=require('../dist/agency-practices/gift-throttle');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {LocalFileStorage}=require('../dist/documents/storage'),{WindowsDefenderScanner}=require('../dist/documents/file-control'),{HomesModule}=require('../dist/homes/homes.module');
const {png}=require('./document-fixtures.cjs');
const {ApiErrorFilter}=require('../dist/main');
const origin='http://127.0.0.1:5174',sha256=createHash('sha256').update(png).digest('hex');

test('Digital plan Agency -> Gift -> Home -> object placement on fresh owned cluster',{timeout:240000},async t=>{
 assertOfflineDatabase(process.env.DATABASE_URL);assertDevelopmentDatabase(process.env.DATABASE_URL);
 const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),db=new PrismaClient();await db.$connect();let app;
 t.after(async()=>{if(app)await app.close();await db.$disconnect();});
 const past=new Date('2026-01-01T00:00:00.000Z'),agency=await db.agency.create({data:{name:'Gift HTTP Agency DEMO'}});
 async function session(account=null){
  const raw=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');await db.session.create({data:{id:digest(raw),accountId:account?.id??null,csrfToken:csrf,expiresAt:new Date(Date.now()+3600000)}});return {...(account??{}),raw,csrf};
 }
 async function account(name,verified=true){return session(await db.account.create({data:{name,email:randomUUID()+'@example.test',passwordHash:'synthetic-no-login',emailVerifiedAt:verified?past:null}}));}
 const issuer=await account('Gift HTTP issuer DEMO'),colleague=await account('Gift HTTP colleague DEMO'),viewer=await account('Gift HTTP viewer DEMO'),outsider=await account('Gift HTTP outsider DEMO'),guest=await session();
 for(const [who,role]of [[issuer,'admin'],[colleague,'agent'],[viewer,'viewer']])await db.agencyMember.create({data:{agencyId:agency.id,accountId:who.id,role,validFrom:past}});
 const vaultRoot=path.join(owned.directory,'gift-http-source-'+randomUUID()),homeRoot=path.join(owned.directory,'gift-http-home-'+randomUUID()),vault=await AgencyFileVault.open(vaultRoot),store=new AgencyPracticesStore(db);
 class Infra{}Global()(Infra);Module({providers:[{provide:PrismaService,useValue:db},{provide:SessionsService,useValue:new SessionsService(db)}],exports:[PrismaService,SessionsService]})(Infra);
 const {HomeMapController}=require('../dist/home-maps/home-map.controller'),{HomeMapService}=require('../dist/home-maps/home-map.service'),{ObjectOnboardingAccess}=require('../dist/object-onboarding/access'),{DocumentsModule}=require('../dist/documents/documents.module'),{ReviewModule}=require('../dist/review/review.module'),{HomeObjectsModule}=require('../dist/home-objects/home-objects.module');
 class Maps{}Module({imports:[DocumentsModule,ReviewModule],controllers:[HomeMapController],providers:[HomeMapService,ObjectOnboardingAccess]})(Maps);
 class Root{}Module({imports:[Infra,GiftAccountModule,GiftDeliveryModule.register(vaultRoot,{autoStart:false}),HomesModule,Maps,HomeObjectsModule]})(Root);
 app=await NestFactory.create(Root,{logger:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());
 // Match the normal app bootstrap; Document DTO defaults require the production transform pipe.
 app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
 app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true,exceptionFactory:errors=>new UnprocessableEntityException({message:'Controlla i dati inseriti.',fieldErrors:Object.fromEntries(errors.map(e=>[e.property,Object.values(e.constraints||{})[0]||'Valore non valido.']))})}));
 app.useGlobalFilters(new ApiErrorFilter());
 const throttleClock=new Date();app.get(GiftThrottle).clock=()=>new Date(throttleClock);
 const storage=app.get(LocalFileStorage),scanner=app.get(WindowsDefenderScanner),scans=[];storage.root=homeRoot;
 // Override the existing DI scanner before module initialization/listen. No real antivirus command runs.
 scanner.scan=async(stage,expectedSha)=>{assert.equal(expectedSha,sha256);assert.deepEqual(await readFile(stage),png);assert.ok(stage.endsWith('.bin.part'));const relative=path.relative(homeRoot,stage);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));scans.push({stage,sha256:expectedSha});return {engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:'synthetic-http-no-real-av'};};
 await app.listen(0,'127.0.0.1');const url=await app.getUrl(),worker=app.get(GiftAcceptanceWorker);
 const request=(route,options={},who=issuer)=>{
  const headers={origin,...(who?{cookie:COOKIE+'='+who.raw,'x-csrf-token':who.csrf,...(who.id?{'x-account-context':who.id}:{})}:{}),...options.headers};for(const name of Object.keys(headers))if(headers[name]===null)delete headers[name];
  return fetch(url+'/api/v5'+route,{...options,headers});
 };
 const post=(route,body,who=issuer,key=randomUUID(),headers={})=>request(route,{method:'POST',headers:{'content-type':'application/json',...(key?{'idempotency-key':key}:{}),...headers},body:JSON.stringify(body)},who);
 const privacy=response=>{assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('referrer-policy'),'no-referrer');};
 const noSecrets=(data,f)=>{const wire=JSON.stringify(data);assert.doesNotMatch(wire,/"(?:secret|tokenHash|sourceFingerprint|packet|homeInput|manifest|storageKey|creationDigest|preparationDigest|claimedAccountId)"/);if(f?.invitation?.secret)assert.equal(wire.includes(f.invitation.secret),false);};

 const {planFixture}=require('./home-map-fixture.cjs');
 const recipient=await account('Map owner DEMO'),p=(await store.create(issuer.id,agency.id,'Map practice DEMO',randomUUID())).practice,sourceId='map-source';
 const revision=async()=>(await store.read(issuer.id,agency.id,p.id)).revision;
 await store.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId,visibility:'practice',originalFilename:'synthetic-plan.png'}},png,vault);
 await store.mutate(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'classify',sourceId,expectedSourceVersion:1,kind:'floor_plan'}});
 const practiceRow=await db.agencyPractice.findUniqueOrThrow({where:{id:p.id}}),snapshot=practiceRow.snapshot;
 snapshot.planAnalyses=[planFixture(sourceId,sha256)];await db.agencyPractice.update({where:{id:p.id},data:{snapshot}});
 const root='/agencies/'+agency.id+'/practices/'+p.id;
 const release={expectedRevision:await revision(),expectedSourceVersion:1,expectedSha256:sha256,title:'Planimetria DEMO con vani',origin:'received',finalDocumentConfirmed:true,releaseApproved:true,digitalPlan:{planId:'synthetic-map',expectedPlanVersion:3,reviewed:true}};
 let invitation,claim,job,accepted,mapId,homeId,objectId,received;
 await t.test('only an explicit reviewed selection can release the canonical map; no polygons from browser',async()=>{
  let response=await post(root+'/sources/'+sourceId+'/gift-release',{...release,digitalPlan:{...release.digitalPlan,reviewed:false}});assert.equal(response.status,422);
  response=await post(root+'/sources/'+sourceId+'/gift-release',{...release,digitalPlan:{...release.digitalPlan,rooms:[]}});assert.equal(response.status,422);
  response=await post(root+'/sources/'+sourceId+'/gift-release',release);assert.equal(response.status,201);const data=await response.json();privacy(response);assert.equal(data.metadata.documents[0].descriptor.digitalPlan.roomCount,3);assert.equal(data.metadata.documents[0].descriptor.digitalPlan.qualification,'reviewed');assert.equal(JSON.stringify(data).includes('points'),false);
 });
 await t.test('invitation preview discloses only map summary, acceptance alone creates nothing',async()=>{
  const response=await post(root+'/gift-invitations',{expectedRevision:await revision(),documents:[{sourceId,version:1,sha256}],recipientEmail:recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit:true});assert.equal(response.status,201);invitation=await response.json();
  let r=await post('/gift-invitations/'+invitation.id+'/preview',{secret:invitation.secret},recipient),preview=await r.json();assert.equal(r.status,200);assert.equal(preview.documents[0].digitalPlan.roomCount,3);noSecrets(preview,{invitation});
  r=await post('/gift-invitations/'+invitation.id+'/claim',{secret:invitation.secret,expectedVersion:invitation.version},recipient);claim=await r.json();assert.equal(r.status,200);
  r=await post('/gift-invitations/'+invitation.id+'/acceptances',{secret:invitation.secret,expectedInvitationVersion:claim.version,home:{name:'Casa con mappa DEMO',address:'Via sintetica 1'}},recipient);assert.equal(r.status,202);job=await r.json();
  const row=await db.agencyGiftAcceptanceJob.findUniqueOrThrow({where:{id:job.jobId}});homeId=row.homeId;assert.equal(await db.home.findUnique({where:{id:homeId}}),null);assert.equal(await db.homeDigitalPlan.count({where:{homeId}}),0);
 });
 const maps=()=>'/homes/'+homeId+'/digital-plans',route=()=>maps()+'/'+mapId;
 const read=async()=>{const r=await request(route(),{},recipient);assert.equal(r.status,200);return r.json();};
 await t.test('publication failure rolls back Home, documents, rooms, map and benefit together',async()=>{
  await db.$executeRawUnsafe("CREATE FUNCTION map_test_block() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic publication interruption'; END; $$");
  await db.$executeRawUnsafe('CREATE TRIGGER map_test_block BEFORE INSERT ON "HomeDigitalPlan" FOR EACH ROW EXECUTE FUNCTION map_test_block()');
  try{assert.equal((await worker.runNext(job.jobId)).state,'retryable');
   assert.equal(await db.home.count({where:{id:homeId}}),0);assert.equal(await db.homeRoom.count({where:{homeId}}),0);assert.equal(await db.document.count({where:{homeId}}),0);assert.equal(await db.homeDigitalPlan.count({where:{homeId}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:recipient.id}}),0);
  }finally{await db.$executeRawUnsafe('DROP TRIGGER map_test_block ON "HomeDigitalPlan"');await db.$executeRawUnsafe('DROP FUNCTION map_test_block()');}
 });
 await t.test('worker publishes original, three rooms, map and optional year atomically; replay makes no duplicate',async()=>{
  assert.equal((await worker.runNext(job.jobId)).state,'accepted');assert.equal((await worker.runNext(job.jobId)).state,'accepted');
  accepted=await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{jobId:job.jobId}});
  assert.equal(await db.document.count({where:{homeId}}),1);assert.equal(await db.homeRoom.count({where:{homeId}}),3);assert.equal(await db.homeDigitalPlan.count({where:{homeId}}),1);assert.equal(await db.objectOnboardingJob.count({where:{homeId}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:recipient.id}}),1);
  const response=await request(maps(),{},recipient),list=await response.json();assert.equal(response.status,200);mapId=list.items[0].id;received=(await db.homeDigitalPlan.findUniqueOrThrow({where:{id:mapId}})).received;
  const view=await read();assert.equal(view.rooms.length,3);assert.equal(view.pins.length,0);assert.equal(view.objects.length,0);assert.equal(view.rooms.find(x=>x.id==='corridor').name,'Corridoio');assert.deepEqual(view.layout.rooms[0].points,snapshot.planAnalyses[0].rooms[0].points);assert.notEqual(view.rooms[0].roomId,view.rooms[0].id);
 });
 await t.test('normal owner object can be placed on map; replay/reload preserve one pin and canonical room',async()=>{
  const response=await post('/homes/'+homeId+'/objects',{name:'Frigorifero DEMO',type:'appliance'},recipient);assert.equal(response.status,201);const created=await response.json();objectId=created.object.ref.id;
  const view=await read(),body={expectedVersion:view.version,objectId,regionId:'kitchen',x:20,y:20,expectedPositionVersion:0},key=randomUUID();
  for(let i=0;i<2;i++){const r=await post(route()+'/pins',body,recipient,key);assert.equal(r.status,200,await r.clone().text());}
  const next=await read();assert.equal(next.pins.length,1);assert.equal(next.pins[0].needsReview,false);assert.equal(next.pins[0].x,20);
  const pos=await db.objectPosition.findUniqueOrThrow({where:{objectId}});assert.deepEqual(pos.roomIds,[next.rooms.find(r=>r.id==='kitchen').roomId]);assert.equal(pos.version,1);
 });
 await t.test('map checks membership, private source, actual CSRF and Origin; Agency receives no Home access',async()=>{
  const v=await read(),body={expectedVersion:v.version,objectId,regionId:'kitchen',x:21,y:21,expectedPositionVersion:1};
  for(const who of [issuer,colleague,viewer,outsider]){const r=await request(route(),{},who);assert.equal(r.status,403);const w=await post(route()+'/pins',body,who);assert.equal(w.status,403);}
  assert.equal((await post(route()+'/pins',body,recipient,randomUUID(),{'x-csrf-token':null})).status,403);
  assert.equal((await post(route()+'/pins',body,recipient,randomUUID(),{origin:'https://evil.invalid'})).status,403);
  assert.equal((await request(route(),{},guest)).status,401);
  const otherHome=await db.home.create({data:{name:'Other synthetic',address:'Elsewhere'}});assert.equal((await request('/homes/'+otherHome.id+'/digital-plans/'+mapId,{},recipient)).status,403);
 });
 await t.test('out of room, foreign object and old placement versions are rejected without state changes',async()=>{
  const v=await read(),base={expectedVersion:v.version,objectId,regionId:'kitchen',x:70,y:70,expectedPositionVersion:1};
  assert.equal((await post(route()+'/pins',base,recipient)).status,422);
  assert.equal((await post(route()+'/pins',{...base,x:20,y:20,objectId:randomUUID()},recipient)).status,403);
  assert.equal((await post(route()+'/pins',{...base,x:20,y:20,expectedPositionVersion:0},recipient)).status,409);
  assert.equal((await read()).version,v.version);
 });
 await t.test('owner geometry point insertion invalidates measurements and marks existing pin without moving it',async()=>{
  const v=await read(),points=[[5,5],[25,5],[45,5],[45,45],[5,45]];
  const response=await post(route()+'/geometry',{expectedVersion:v.version,regionId:'kitchen',geometry:{points,holes:[]}},recipient);assert.equal(response.status,200);
  const next=await read();assert.equal(next.layout.rooms[0].points.length,5);assert.equal(next.layout.calibration,null);assert.equal(next.layout.mainPerimeter,null);assert.equal(next.layout.qualification,'unverified');assert.equal(next.pins[0].needsReview,true);assert.equal(next.pins[0].x,20);assert.equal(next.pins[0].y,20);
  assert.deepEqual((await db.homeDigitalPlan.findUniqueOrThrow({where:{id:mapId}})).received,received);
  const source=(await db.agencyPractice.findUniqueOrThrow({where:{id:p.id}})).snapshot;assert.deepEqual(source.planAnalyses[0].rooms[0].points,snapshot.planAnalyses[0].rooms[0].points);
  const r=await post(route()+'/pins',{expectedVersion:next.version,objectId,regionId:'kitchen',x:22,y:22,expectedPositionVersion:1},recipient);assert.equal(r.status,200);assert.equal((await read()).pins[0].needsReview,false);
 });
 await t.test('accepted map remains independent of Agency changes and optional year expiry',async()=>{
  await db.agencyMember.update({where:{agencyId_accountId:{agencyId:agency.id,accountId:issuer.id}},data:{revokedAt:new Date()}});
  await db.agencyPractice.update({where:{id:p.id},data:{snapshot:{unavailable:true}}});
  const {GiftBenefitsStore}=require('../dist/agency-practices/gift-benefits-store');
  const benefits=new GiftBenefitsStore(db,()=>new Date('2030-01-01T00:00:00.000Z'));assert.equal((await benefits.capabilities(recipient.id)).fullAccess,false);
  const view=await read();assert.equal(view.pins.length,1);assert.equal(view.rooms.length,3);assert.equal(view.objects[0].id,objectId);
  assert.equal((await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{id:accepted.id}})).homeId,homeId);
 });
});
