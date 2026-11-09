require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto'),path=require('node:path');
const {Module,Global}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser'),{createCanvas}=require('@napi-rs/canvas');
const {PrismaClient}=require('../generated/client'),{PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{SessionsService,digest,COOKIE}=require('../dist/security'),{AgencyPracticesModule}=require('../dist/agency-practices/http'),{AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files'),{paperCalibration}=require('../dist/agency-plans/geometry'),{assertOwnedRun}=require('./offline-policy.cjs');

test('A4 estimate persists through HTTP and fresh Prisma reload on a new owned cluster',{timeout:120000},async t=>{
 assertDevelopmentDatabase(process.env.DATABASE_URL);assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN);
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const agency=await db.agency.create({data:{name:'A4 HTTP DEMO'}}),a=await db.account.create({data:{name:'A4 DEMO',email:randomUUID()+'@example.test',passwordHash:'synthetic'}});
 await db.agencyMember.create({data:{agencyId:agency.id,accountId:a.id,role:'admin',validFrom:new Date('2026-01-01')}});
 const raw=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');await db.session.create({data:{id:digest(raw),accountId:a.id,csrfToken:csrf,expiresAt:new Date('2027-01-01')}});
 const root=path.join(process.env.DIMORA_OFFLINE_RUN_DIR,'paper-http-vault');class Infra{}Global()(Infra);Module({providers:[{provide:PrismaService,useValue:db},{provide:SessionsService,useValue:new SessionsService(db)}],exports:[PrismaService,SessionsService]})(Infra);class Root{}Module({imports:[Infra,AgencyPracticesModule.register(root)]})(Root);
 const app=await NestFactory.create(Root,{logger:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());await app.listen(0,'127.0.0.1');t.after(()=>app.close());
 const store=app.get(AgencyPracticesStore),vault=app.get(AgencyFileVault),p=(await store.create(a.id,agency.id,'A4 synthetic practice',randomUUID())).practice;
 const canvas=createCanvas(210,297),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,210,297);const bytes=canvas.toBuffer('image/png');
 await store.upload(a.id,agency.id,p.id,{key:randomUUID(),expectedRevision:1,command:{operation:'attach',sourceId:'paper-source',visibility:'private',originalFilename:'a4-synthetic.png'}},bytes,vault);
 await store.mutate(a.id,agency.id,p.id,{key:randomUUID(),expectedRevision:2,command:{operation:'classify',sourceId:'paper-source',expectedSourceVersion:1,kind:'floor_plan'}});
 const snapshot=await db.agencyPractice.findUnique({where:{id:p.id}}),sha=snapshot.snapshot.sources[0].versions[0].sha256;
 // Seeded internal analysis tests editing/persistence, not AI recognition.
 const room={id:'r',label:'Synthetic room',kind:'room',points:[[10,10],[110,10],[110,110],[10,110]],holes:[],seed:[50,50],component:1,pixelArea:10000,symbols:[]};
 const balcony={...room,id:'balcony',label:'Balcone sintetico',kind:'balcony',points:[[110,10],[150,10],[150,40],[110,40]]};
 const analysis={runId:randomUUID(),scope:{accountId:a.id,agencyId:agency.id,practiceId:p.id},proof:{sourceId:'paper-source',version:1,sha256:sha,page:1},fingerprint:'c'.repeat(64),rasterSize:{width:210,height:297},rasterSHA256:'d'.repeat(64),final:{regions:[room,balcony],issues:[]},warnings:[],retainedSymbols:[],calls:[{phase:'inventory',requestId:'offline1',input:1,output:1,costUSD:0},{phase:'review',requestId:'offline2',input:1,output:1,costUSD:0}],status:'draft',confirmed:false};
 await store.savePlan(a.id,agency.id,p.id,analysis,3);
 const base=(await app.getUrl())+'/api/v5/agencies/'+agency.id+'/practices/'+p.id;
 const request=(suffix,opts={})=>fetch(base+suffix,{...opts,headers:{cookie:COOKIE+'='+raw,'x-account-context':a.id,origin:'http://127.0.0.1:5174','x-csrf-token':csrf,...opts.headers}});
 const post=(body,key=randomUUID(),headers={})=>request('/plans/'+analysis.runId+'/edits',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key,...headers},body:JSON.stringify(body)});
 const configuration={base:'rooms_and_walls',calibration:paperCalibration({format:'A4',orientation:'portrait',denominator:100,widthUnits:210,heightUnits:297}),policyVersion:'synthetic-v1',mainRegionIds:['r'],assignments:[{id:'r',kind:'principal'},{id:'balcony',kind:'uncovered_balcony'}],walls:[],coverageConfirmed:true,wallCoverageConfirmed:true,policyConfirmed:true,commonWallCapBasis:'physical_thickness'};
 const input={expectedRevision:4,expectedPlanVersion:1,reason:'A4 assumed, synthetic test',command:{operation:'measure',configuration}},key=randomUUID();let saved;
 await t.test('save and exact replay retain assumption and unverified total',async()=>{let r=await post(input,key);assert.equal(r.status,201,await r.clone().text());saved=(await r.json()).plans;assert.equal(saved.plans[0].measurement.partialM2,103);assert.equal(saved.plans[0].measurement.totalM2,null);assert.deepEqual(saved.plans[0].measurement.issues,['paper_scale_estimated']);assert.equal(saved.plans[0].measurementConfiguration.calibration.confirmed,false);r=await post(input,key);assert.equal((await r.json()).replay,true);});
 await t.test('GET and a fresh database client preserve provenance and both geometry records',async()=>{const read=await (await request('/plans')).json();assert.deepEqual(read.plans[0].measurementConfiguration.calibration.paper,configuration.calibration.paper);assert.deepEqual(read.plans[0].rooms[0].points,room.points);assert.equal(read.plans[0].mainPerimeter,null);const fresh=new PrismaClient();try{const reopened=await new AgencyPracticesStore(fresh).readPlans(a.id,agency.id,p.id);assert.deepEqual(reopened,read);}finally{await fresh.$disconnect();}});
 await t.test('forged confirmation, dimensions and CSRF leave saved snapshot unchanged',async()=>{const next={...input,expectedRevision:saved.revision,expectedPlanVersion:saved.plans[0].version};for(const change of [{confirmed:true},{paper:{...configuration.calibration.paper,widthUnits:420,heightUnits:594}}]){const bad=structuredClone(next);Object.assign(bad.command.configuration.calibration,change);assert.equal((await post(bad)).status,422);}assert.equal((await post(next,randomUUID(),{'x-csrf-token':'invalid'})).status,403);assert.equal((await (await request('/plans')).json()).revision,saved.revision);});
 await t.test('explicit measured reference removes estimate while preserving room geometry',async()=>{const next=structuredClone(input);next.expectedRevision=saved.revision;next.expectedPlanVersion=saved.plans[0].version;next.command.configuration.calibration={start:[10,10],end:[110,10],metres:10,confirmed:true,maxRelativeError:.01};const r=await post(next);assert.equal(r.status,201,await r.clone().text());const read=(await r.json()).plans.plans[0];assert.equal(read.measurementConfiguration.calibration.paper,undefined);assert.equal(read.measurement.totalM2,103);assert.deepEqual(read.rooms[0].points,room.points);const reloaded=(await (await request('/plans')).json()).plans[0];assert.equal(reloaded.measurement.issues.includes('paper_scale_estimated'),false);});
 await t.test('quick estimate survives HTTP, exact replay and a fresh DB client',async()=>{
  const before=await (await request('/plans')).json(),plan=before.plans[0];
  const key=randomUUID(),command={operation:'save_quick_estimate',covers:[{id:'balcony',cover:'covered'}],scale:{mode:'manual',start:[10,10],end:[110,10],metres:10},parameters:{wallPercent:13,coefficients:[{id:'r',coefficient:.9}]},outline:{view:'perimeter',id:'gross',geometry:{points:[[8,8],[110,8],[110,112],[8,112]],holes:[]}}};
  const body={expectedRevision:before.revision,expectedPlanVersion:plan.version,reason:'Synthetic quick estimate',command};
  const invalid=structuredClone(body);invalid.command.scale.end=[300,10];
  assert.equal((await post(invalid)).status,422);
  assert.deepEqual(await (await request('/plans')).json(),before);
  const savedResponse=await post(body,key);assert.equal(savedResponse.status,201,await savedResponse.clone().text());
  const saved=(await savedResponse.json()).plans;
  assert.deepEqual(saved.plans[0].quickEstimate.scale,command.scale);
  assert.equal(saved.plans[0].quickEstimate.geometryRevision,plan.geometryRevision+1);
  assert.equal(saved.revision,before.revision+1);
  assert.deepEqual(saved.plans[0].mainPerimeter,command.outline.geometry);
  assert.deepEqual(saved.plans[0].quickEstimate.parameters,command.parameters);
  assert.deepEqual(saved.plans[0].balconyCovers,command.covers);
  assert.equal(saved.plans[0].measurement,null);
  const replay=await post(body,key);assert.equal(replay.status,201);assert.equal((await replay.json()).replay,true);
  assert.equal((await post(body)).status,409);
  const current={...body,expectedRevision:saved.revision,expectedPlanVersion:saved.plans[0].version};
  assert.equal((await post(current,randomUUID(),{'x-csrf-token':'invalid'})).status,403);
  assert.equal((await post({...current,command:{...command,covers:[{id:'r',cover:'covered'}]}})).status,422);
  const get=await request('/plans');assert.equal(get.status,200);assert.deepEqual(await get.json(),saved);
  const fresh=new PrismaClient();try{assert.deepEqual(await new AgencyPracticesStore(fresh).readPlans(a.id,agency.id,p.id),saved);}finally{await fresh.$disconnect();}
 });

});
