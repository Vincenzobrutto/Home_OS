// Real HTTP/session/CSRF and owned synthetic DB/files. The injected scanner is a FIXTURE, not real AV.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID,randomBytes,createHash}=require('node:crypto'),path=require('node:path'),{readFile}=require('node:fs/promises');
const {Module,Global,ValidationPipe,UnprocessableEntityException}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const {PrismaClient}=require('../generated/client'),{PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{SessionsService,digest,verifyPassword,COOKIE}=require('../dist/security');
const {RecoveryConfig}=require('../dist/auth/recovery-config'),{RecoveryService}=require('../dist/auth/recovery.service'),{BrevoRecoveryMail}=require('../dist/auth/recovery-mail');
const {GiftAccountModule,GiftDeliveryModule}=require('../dist/agency-practices/gift-http'),{GiftAcceptanceWorker}=require('../dist/agency-practices/gift-acceptance-worker');
const {GiftThrottle}=require('../dist/agency-practices/gift-throttle');
const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
const {LocalFileStorage}=require('../dist/documents/storage'),{WindowsDefenderScanner}=require('../dist/documents/file-control'),{HomesModule}=require('../dist/homes/homes.module');
const {png,pdf}=require('./document-fixtures.cjs');
const {ApiErrorFilter}=require('../dist/main');
const origin='http://127.0.0.1:5174',sha256=createHash('sha256').update(png).digest('hex');

test('Gift HTTP uses genuine sessions, explicit release and owned file admission before normal Home delivery',{timeout:240000},async t=>{
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
 class Root{}Module({imports:[Infra,GiftAccountModule,GiftDeliveryModule.register(vaultRoot,{autoStart:false}),HomesModule]})(Root);
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
 async function fixture({verified=true,annualBenefit=false}={}){
  const recipient=await account('Gift HTTP recipient DEMO',verified),p=(await store.create(issuer.id,agency.id,'Gift HTTP practice DEMO '+randomUUID(),randomUUID())).practice;
  for(const [who,access]of [[colleague,'edit'],[viewer,'read']])await db.agencyPracticeGrant.create({data:{practiceId:p.id,accountId:who.id,access,canExport:true,validFrom:past}});
  const revision=async()=>(await store.read(issuer.id,agency.id,p.id)).revision,sourceId='gift-source-'+randomUUID(),privateId='private-source-'+randomUUID();
  await store.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId,visibility:'practice',originalFilename:'gift-selected-DEMO.png'}},png,vault);
  await store.upload(issuer.id,agency.id,p.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:privateId,visibility:'private',originalFilename:'private-not-selected-DEMO.pdf'}},pdf,vault);
  const root='/agencies/'+agency.id+'/practices/'+p.id,releaseRoute=root+'/sources/'+sourceId+'/gift-release';
  const releaseBody=async()=>({expectedRevision:await revision(),expectedSourceVersion:1,expectedSha256:sha256,title:'Documento Gift DEMO',origin:'agency_generated',finalDocumentConfirmed:true,releaseApproved:true});
  const createBody=async()=>({expectedRevision:await revision(),documents:[{sourceId,version:1,sha256}],recipientEmail:recipient.email,stipulationCompleted:true,releaseApproved:true,annualBenefit});
  return {recipient,p,revision,sourceId,privateId,root,releaseRoute,releaseBody,createBody,scanStart:scans.length,annualBenefit};
 }
 async function release(f){const response=await post(f.releaseRoute,await f.releaseBody());assert.equal(response.status,201);privacy(response);return response.json();}
 async function invite(f){await release(f);f.creationKey=randomUUID();f.creationBody=await f.createBody();const response=await post(f.root+'/gift-invitations',f.creationBody,issuer,f.creationKey);assert.equal(response.status,201);privacy(response);f.invitation=await response.json();assert.match(f.invitation.secret,/^[A-Za-z0-9_-]{43}$/);return f.invitation;}
 async function claim(f){const response=await post('/gift-invitations/'+f.invitation.id+'/claim',{secret:f.invitation.secret,expectedVersion:f.invitation.version},f.recipient);assert.equal(response.status,200);privacy(response);f.claim=await response.json();return f.claim;}
 async function begin(f){f.acceptKey??=randomUUID();f.acceptBody??={secret:f.invitation.secret,expectedInvitationVersion:f.claim.version,home:{name:' Casa Gift HTTP DEMO ',address:' Via Gift HTTP DEMO 1 '}};const response=await post('/gift-invitations/'+f.invitation.id+'/acceptances',f.acceptBody,f.recipient,f.acceptKey);assert.equal(response.status,202);privacy(response);f.job=await response.json();return f.job;}
 async function noDelivery(f){const inviteRow=await db.agencyGiftInvitation.findUniqueOrThrow({where:{id:f.invitation.id}});assert.equal(await db.home.findUnique({where:{id:inviteRow.snapshot.packet.requestedHomeId}}),null);assert.equal(await db.document.count({where:{homeId:inviteRow.snapshot.packet.requestedHomeId}}),0);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),0);}
 await t.test('account reads require actual authenticated sessions and never disclose a Gift through a supplied account header',async()=>{
  const f=await fixture();for(const route of [f.root+'/gift-documents','/gift-benefits','/gift-invitations/'+randomUUID()+'/my-acceptance']){const response=await request(route,{},guest);assert.equal(response.status,401);privacy(response);}
  const changed=await request(f.root+'/gift-documents',{headers:{'x-account-context':outsider.id}});assert.equal(changed.status,401);assert.equal((await changed.json()).error.code,'account_context_changed');privacy(changed);
 });
 await t.test('Origin, missing/wrong CSRF and changed account context block genuine release before metadata writes',async()=>{
  const f=await fixture(),before=await db.agencyPractice.findUniqueOrThrow({where:{id:f.p.id}}),body=await f.releaseBody();
  for(const headers of [{origin:'https://untrusted.example.test'},{'x-csrf-token':null},{'x-csrf-token':'invalid'}]){const response=await post(f.releaseRoute,body,issuer,randomUUID(),headers);assert.equal(response.status,403);privacy(response);}
  assert.equal((await post(f.releaseRoute,body,issuer,randomUUID(),{'x-account-context':outsider.id})).status,401);assert.deepEqual(await db.agencyPractice.findUniqueOrThrow({where:{id:f.p.id}}),before);
 });
 await t.test('release refuses privileged attestations, missing idempotency and incomplete declarations without changing the practice',async()=>{
  const f=await fixture(),before=await db.agencyPractice.findUniqueOrThrow({where:{id:f.p.id}}),body=await f.releaseBody();
  for(const extra of [{accountId:outsider.id},{author:'Certified author injection'},{surface:{qualification:'reviewed'}},{signatureVerification:'verified'},{metadataVersion:99},{finalDocumentConfirmed:false},{releaseApproved:false}])assert.equal((await post(f.releaseRoute,{...body,...extra})).status,422);
  assert.equal((await post(f.releaseRoute,body,issuer,null)).status,422);assert.equal((await post(f.releaseRoute+'?confirmed=true',body)).status,422);assert.deepEqual(await db.agencyPractice.findUniqueOrThrow({where:{id:f.p.id}}),before);
 });
 await t.test('practice access, source visibility and source scope remain authoritative for Gift metadata',async()=>{
  const f=await fixture(),other=await fixture(),before=await f.revision();assert.equal((await request(f.root+'/gift-documents',{},outsider)).status,403);assert.equal((await post(f.releaseRoute,await f.releaseBody(),viewer)).status,403);
  const visible=await request(f.root+'/gift-documents',{},colleague);assert.equal(visible.status,200);const data=await visible.json();assert.deepEqual(data.documents.map(item=>item.sourceId),[f.sourceId]);assert.equal(JSON.stringify(data).includes(f.privateId),false);assert.equal(JSON.stringify(data).includes('private-not-selected-DEMO.pdf'),false);
  assert.equal((await post(f.root+'/sources/'+f.privateId+'/gift-release',await f.releaseBody(),colleague)).status,403);assert.equal((await post(other.root+'/sources/'+f.sourceId+'/gift-release',{...await f.releaseBody(),expectedRevision:await other.revision()})).status,403);assert.equal(await f.revision(),before);
 });
 await t.test('an uploaded file starts missing Gift metadata and cannot be selected before explicit release',async()=>{
  const f=await fixture(),response=await request(f.root+'/gift-documents');privacy(response);const data=await response.json();assert.equal(data.certification,false);assert.equal(data.documents.find(item=>item.sourceId===f.sourceId).state,'missing');
  assert.equal((await post(f.root+'/gift-invitations',await f.createBody())).status,422);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),0);
 });
 await t.test('the real HTTP release producer persists only a current declared final document and replays without another metadata version',async()=>{
  const f=await fixture(),body=await f.releaseBody(),key=randomUUID(),response=await post(f.releaseRoute,body,issuer,key);assert.equal(response.status,201);privacy(response);const first=await response.json(),selected=first.metadata.documents.find(item=>item.sourceId===f.sourceId);
  assert.deepEqual(Object.keys(first).sort(),['metadata','replay']);assert.equal(first.replay,false);assert.equal(selected.state,'current');assert.equal(selected.metadataVersion,1);assert.equal(selected.descriptor.origin,'agency_generated');assert.equal(selected.descriptor.lifecycle,'final');assert.equal(selected.descriptor.author,'Produzione dell’agenzia dichiarata dall’agente');assert.equal(selected.descriptor.title,'Documento Gift DEMO');assert.equal(selected.sourceVersion,1);assert.equal(selected.sha256,sha256);assert.equal('surface'in selected.descriptor,false);assert.equal(first.metadata.certification,false);
  const replay=await post(f.releaseRoute,body,issuer,key);assert.equal(replay.status,201);const again=await replay.json();assert.equal(again.replay,true);assert.deepEqual(again.metadata,first.metadata);const row=await db.agencyPractice.findUniqueOrThrow({where:{id:f.p.id}});assert.equal(row.snapshot.giftDocuments.length,1);assert.equal(row.snapshot.giftMetadataReceipts.length,1);
 });
 await t.test('stale practice revision and wrong source version or SHA return conflicts and cannot consume a valid release key',async()=>{
  const f=await fixture(),body=await f.releaseBody(),key=randomUUID(),before=await f.revision();for(const change of [{expectedRevision:before-1},{expectedSourceVersion:2},{expectedSha256:'b'.repeat(64)}])assert.equal((await post(f.releaseRoute,{...body,...change},issuer,key)).status,409);assert.equal(await f.revision(),before);assert.equal((await post(f.releaseRoute,body,issuer,key)).status,201);
 });
 await t.test('invitation creation rejects body authority and returns its personal secret once; replay and management list never recover it',async()=>{
  const f=await fixture();await release(f);const body=await f.createBody();for(const extra of [{accountId:outsider.id},{homeId:randomUUID()},{offerId:'invented'},{key:'body-key'},{verifiedEmail:true}])assert.equal((await post(f.root+'/gift-invitations',{...body,...extra})).status,422);
  const key=randomUUID(),created=await post(f.root+'/gift-invitations',body,issuer,key);assert.equal(created.status,201);f.invitation=await created.json();assert.match(f.invitation.secret,/^[A-Za-z0-9_-]{43}$/);assert.equal(f.invitation.replay,false);
  const replay=await post(f.root+'/gift-invitations',body,issuer,key),data=await replay.json();assert.equal(replay.status,201);assert.equal(data.id,f.invitation.id);assert.equal(data.secret,null);assert.equal(data.replay,true);assert.equal(data.requiresReissue,true);
  const listResponse=await request(f.root+'/gift-invitations');privacy(listResponse);const list=await listResponse.json();assert.equal(list.invitations.length,1);assert.equal(list.invitations[0].recipientEmail,f.recipient.email);assert.equal(list.accepted,false);noSecrets(list,f);assert.equal(await db.agencyGiftInvitation.count({where:{practiceId:f.p.id}}),1);
 });
 await t.test('anonymous landing needs guest CSRF and exposes only invitation ID, version and account requirement',async()=>{
  const f=await fixture();await invite(f);const route='/gift-invitations/'+f.invitation.id+'/landing';assert.equal((await post(route,{secret:f.invitation.secret},null)).status,403);
  const response=await post(route,{secret:f.invitation.secret},guest);assert.equal(response.status,200);privacy(response);const data=await response.json();assert.deepEqual(data,{id:f.invitation.id,version:1,requiresAccount:true});noSecrets(data,f);const wire=JSON.stringify(data);for(const privateValue of [f.recipient.email,agency.name,'Documento Gift DEMO',f.sourceId,sha256])assert.equal(wire.includes(privateValue),false);
  const wrong=await post(route,{secret:'Z'.repeat(43)},guest);assert.equal(wrong.status,404);privacy(wrong);noSecrets(await wrong.json(),f);assert.equal((await post(route+'?secret='+f.invitation.secret,{secret:f.invitation.secret},guest)).status,422);
 });
 await t.test('Gift registration creates verified credentials only after mailbox proof and rotates the normal session',async t=>{
  const publicOrigin='https://dimora.example.test',outbox=[];
  t.mock.method(app.get(RecoveryConfig),'settings',()=>({
   enabled:true,apiKey:'synthetic-only',senderEmail:'sender@example.test',senderName:'Dimora DEMO',
   publicOrigin,throttleSecret:'a'.repeat(64),
  }));
  t.mock.method(app.get(RecoveryService),'mail',settings=>new BrevoRecoveryMail(settings,async(_url,options)=>{
   outbox.push(JSON.parse(options.body));
   return Response.json({messageId:'synthetic-gift'},{status:201});
  }));
  const f=await fixture(),email=randomUUID()+'@example.test',signupGuest=await session();
  await release(f);
  const invitationResponse=await post(f.root+'/gift-invitations',{...await f.createBody(),recipientEmail:email});
  assert.equal(invitationResponse.status,201);
  f.invitation=await invitationResponse.json();
  const route='/gift-invitations/'+f.invitation.id,secret=f.invitation.secret;
  const send=await post(route+'/registration-email',{secret},signupGuest);
  assert.equal(send.status,202);privacy(send);
  const notice=await send.json();
  assert.deepEqual(Object.keys(notice),['message']);
  assert.equal(JSON.stringify(notice).includes(email),false);
  noSecrets(notice,f);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(outbox.length,1);
  assert.deepEqual(outbox[0].to,[{email}]);
  const link=new URL(outbox[0].textContent.split('\n').find(line=>line.startsWith(publicOrigin)));
  assert.equal(link.pathname,'/gift/'+f.invitation.id);
  assert.equal(link.search,'');
  const params=new URLSearchParams(link.hash.slice(1)),proof=params.get('signup');
  assert.equal(params.get('token'),secret);
  assert.match(proof,/^[A-Za-z0-9_-]{43}$/u);
  assert.equal(await db.account.findUnique({where:{email}}),null);

  const password='synthetic-password-for-gift';
  const invalidProof={secret,proof:'Z'.repeat(43)};
  for(const [suffix,body] of [['registration-context',invalidProof],['register',{...invalidProof,password}]]){
   const rejected=await post(route+'/'+suffix,body,signupGuest);
   assert.equal(rejected.status,404);privacy(rejected);
   const error=await rejected.json();
   assert.deepEqual(Object.keys(error),['error']);
   assert.equal(JSON.stringify(error).includes(email),false);
   noSecrets(error,f);
  }
  assert.equal(await db.account.findUnique({where:{email}}),null);
  assert.equal((await post(route+'/register',{secret,proof,password},null)).status,403);
  const context=await post(route+'/registration-context',{secret,proof},signupGuest);
  assert.equal(context.status,200);privacy(context);
  assert.deepEqual(await context.json(),{recipientEmail:email});
  const created=await post(route+'/register',{secret,proof,password},signupGuest);
  assert.equal(created.status,201);privacy(created);
  const {account:publicAccount}=await created.json(),saved=await db.account.findUniqueOrThrow({where:{email}});
  assert.equal(publicAccount.name,'Proprietario');
  assert.equal(publicAccount.email,email);
  assert.equal(publicAccount.emailVerifiedAt,saved.emailVerifiedAt.toISOString());
  assert.equal(await verifyPassword(password,saved.passwordHash),true);
  assert.equal(await db.session.findUnique({where:{id:digest(signupGuest.raw)}}),null);
  const cookie=created.headers.get('set-cookie');
  assert.match(cookie,/HttpOnly/iu);
  const raw=cookie.split(';')[0].slice(COOKIE.length+1);
  const sessionResponse=await request('/session',{}, {raw});
  const signed=await sessionResponse.json();
  assert.deepEqual(signed.account,publicAccount);
  const preview=await post(route+'/preview',{secret},{id:publicAccount.id,raw,csrf:signed.csrfToken});
  assert.equal(preview.status,200);
  assert.equal((await preview.json()).documents.length,1);
  assert.equal(await db.homeMembership.count({where:{accountId:saved.id}}),0);

  const duplicate=await post(route+'/register',{secret,proof,password:'different-synthetic-password'},await session());
  assert.equal(duplicate.status,409);privacy(duplicate);
  assert.equal((await duplicate.json()).error.code,'registration_unavailable');
  assert.equal((await db.account.findUniqueOrThrow({where:{email}})).passwordHash,saved.passwordHash);
 });
 await t.test('only the matching currently verified account can preview the manifest; no source proof or files escape to other users',async()=>{
  const unverified=await fixture({verified:false});await invite(unverified);const deniedRoute='/gift-invitations/'+unverified.invitation.id+'/preview',deniedBody={secret:unverified.invitation.secret};assert.equal((await post(deniedRoute,deniedBody,guest)).status,401);assert.equal((await post(deniedRoute,deniedBody,outsider)).status,404);assert.equal((await post(deniedRoute,deniedBody,unverified.recipient)).status,404);assert.equal((await db.account.findUniqueOrThrow({where:{id:unverified.recipient.id}})).emailVerifiedAt,null);await noDelivery(unverified);
  // A separate synthetic account is already verified; no email-verification bypass or mail challenge is run.
  const f=await fixture();await invite(f);const response=await post('/gift-invitations/'+f.invitation.id+'/preview',{secret:f.invitation.secret},f.recipient);assert.equal(response.status,200);privacy(response);const data=await response.json();assert.equal(data.agencyName,agency.name);assert.equal(data.documents.length,1);assert.equal(data.documents[0].title,'Documento Gift DEMO');assert.equal(data.documents[0].signatureVerification,'not_assessed');assert.equal(data.documents[0].lifecycle,'final');assert.deepEqual(data.annualBenefit,{requested:false});noSecrets(data,f);assert.equal(JSON.stringify(data).includes(f.sourceId),false);assert.equal(JSON.stringify(data).includes(sha256),false);await noDelivery(f);
 });
 await t.test('claim is versioned, recipient-only and idempotent; it does not create a Home or activate the annual benefit',async()=>{
  const f=await fixture({annualBenefit:true});await invite(f);const route='/gift-invitations/'+f.invitation.id+'/claim';assert.equal((await post(route,{secret:f.invitation.secret,expectedVersion:99},f.recipient)).status,409);assert.equal((await post(route,{secret:f.invitation.secret,expectedVersion:1,accountId:f.recipient.id},f.recipient)).status,422);assert.equal((await post(route,{secret:f.invitation.secret,expectedVersion:1},outsider)).status,404);
  const claimed=await claim(f);assert.equal(claimed.state,'claimed');assert.equal(claimed.version,2);assert.equal(claimed.replay,false);noSecrets(claimed,f);const replay=await post(route,{secret:f.invitation.secret,expectedVersion:1},f.recipient);assert.equal(replay.status,200);assert.equal((await replay.json()).replay,true);await noDelivery(f);assert.deepEqual(await (await request('/gift-benefits',{},f.recipient)).json(),{fullAccess:false,scope:'all_owner_features',validUntil:null});
 });
 await t.test('acceptance confirms Home input, rejects forged authority and queues once; token-free resolver and owner status work without automatic scanning',async()=>{
  const f=await fixture();await invite(f);const route='/gift-invitations/'+f.invitation.id+'/acceptances',body={secret:f.invitation.secret,expectedInvitationVersion:1,home:{name:'Casa DEMO',address:'Via DEMO 1'}};
  assert.equal((await post(route,body,f.recipient)).status,404);assert.deepEqual(await (await request('/gift-invitations/'+f.invitation.id+'/my-acceptance',{},f.recipient)).json(),{state:'not_started'});await claim(f);body.expectedInvitationVersion=f.claim.version;
  for(const extra of [{homeId:randomUUID()},{accountId:outsider.id},{annualBenefit:true},{offerId:'invented'}])assert.equal((await post(route,{...body,...extra},f.recipient)).status,422);assert.equal((await post(route,{...body,home:{...body.home,id:randomUUID()}},f.recipient)).status,422);assert.equal((await post(route,body,f.recipient,null)).status,422);
  const job=await begin(f);assert.equal(job.state,'queued');assert.equal(job.replay,false);noSecrets(job,f);assert.equal(scans.length,f.scanStart);await noDelivery(f);
  const resolver=await request('/gift-invitations/'+f.invitation.id+'/my-acceptance',{},f.recipient);privacy(resolver);assert.equal((await resolver.json()).jobId,job.jobId);assert.equal((await (await request('/gift-acceptances/'+job.jobId,{},f.recipient)).json()).state,'queued');assert.equal((await request('/gift-acceptances/'+job.jobId,{},outsider)).status,404);
  assert.deepEqual(await (await request('/gift-invitations/'+f.invitation.id+'/my-acceptance',{},outsider)).json(),{state:'not_started'});assert.equal((await begin(f)).jobId,job.jobId);assert.equal(f.job.replay,true);assert.equal(await db.agencyGiftAcceptanceJob.count({where:{invitationId:f.invitation.id}}),1);
 });
 await t.test('released source becomes a normal private owner document and full-access year; accepted receipt survives issuer revocation and changed email',async()=>{
  const f=await fixture({annualBenefit:true});await invite(f);await claim(f);const job=await begin(f);await noDelivery(f);assert.equal((await worker.runNext(job.jobId)).state,'accepted');
  const response=await request('/gift-acceptances/'+job.jobId,{},f.recipient);assert.equal(response.status,200);privacy(response);const accepted=await response.json();assert.equal(accepted.state,'accepted');assert.equal(accepted.documents.length,1);assert.ok(accepted.benefit);noSecrets(accepted,f);
  const homeResponse=await request('/homes/'+accepted.homeId,{},f.recipient);assert.equal(homeResponse.status,200);const home=(await homeResponse.json()).home;assert.equal(home.name,'Casa Gift HTTP DEMO');assert.equal(home.address,'Via Gift HTTP DEMO 1');assert.equal(home.role,'owner');assert.equal(await db.homeMembership.count({where:{homeId:home.id}}),1);assert.equal((await request('/homes/'+home.id,{},issuer)).status,403);
  const list=await request('/homes/'+home.id+'/documents',{},f.recipient);assert.equal(list.status,200);const docs=(await list.json()).items;assert.equal(docs.length,1);assert.equal(docs[0].source,'agency_gift');assert.equal(docs[0].visibility,'private');assert.equal(docs[0].version,1);
  const documentId=accepted.documents[0].documentId,detail=(await (await request('/homes/'+home.id+'/documents/'+documentId,{},f.recipient)).json()).document;assert.equal(detail.giftProvenance.sourceId,f.sourceId);assert.equal(detail.giftProvenance.sourceVersion,1);assert.equal(detail.giftProvenance.sourceSha256,sha256);assert.equal(detail.giftProvenance.origin,'agency_generated');assert.equal(detail.giftProvenance.author,'Produzione dell’agenzia dichiarata dall’agente');assert.equal(detail.sha256,sha256);
  const original=await request('/homes/'+home.id+'/documents/'+documentId+'/file',{},f.recipient);assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),png);assert.equal((await request('/homes/'+home.id+'/documents/'+documentId+'/file',{},issuer)).status,403);assert.equal(scans.length,f.scanStart+1);
  const benefits=await request('/gift-benefits',{},f.recipient);privacy(benefits);assert.deepEqual(await benefits.json(),{fullAccess:true,scope:'all_owner_features',validUntil:accepted.benefit.endsAt});
  const revoked=await post(f.root+'/gift-invitations/'+f.invitation.id+'/revoke',{expectedVersion:f.claim.version});assert.equal(revoked.status,201);await db.account.update({where:{id:f.recipient.id},data:{email:randomUUID()+'@example.test'}});await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:f.p.id,accountId:issuer.id}},data:{canExport:false}});
  const replay=await post('/gift-invitations/'+f.invitation.id+'/acceptances',f.acceptBody,f.recipient,f.acceptKey);assert.equal(replay.status,202);const replayed=await replay.json();assert.equal(replayed.replay,true);assert.equal(replayed.homeId,accepted.homeId);assert.deepEqual(replayed.documents,accepted.documents);assert.deepEqual(replayed.benefit,accepted.benefit);
  const recovered=await request('/gift-invitations/'+f.invitation.id+'/my-acceptance',{},f.recipient);assert.equal(recovered.status,200);assert.equal((await recovered.json()).homeId,home.id);assert.equal((await request('/gift-acceptances/'+job.jobId,{},f.recipient)).status,200);assert.equal((await request('/homes/'+home.id+'/documents/'+documentId,{},f.recipient)).status,200);assert.equal((await (await request('/gift-benefits',{},f.recipient)).json()).fullAccess,true);assert.equal(await db.accountGiftBenefit.count({where:{accountId:f.recipient.id}}),1);assert.equal(scans.length,f.scanStart+1);
 });
 await t.test('without the annual flag delivery creates the Home and docs but no year; revoked pending invitations remain unusable',async()=>{
  const f=await fixture();await invite(f);await claim(f);const job=await begin(f);assert.equal((await worker.runNext(job.jobId)).state,'accepted');const accepted=await (await request('/gift-acceptances/'+job.jobId,{},f.recipient)).json();assert.equal(accepted.benefit,null);assert.ok(await db.home.findUnique({where:{id:accepted.homeId}}));assert.equal(await db.document.count({where:{homeId:accepted.homeId}}),1);assert.deepEqual(await (await request('/gift-benefits',{},f.recipient)).json(),{fullAccess:false,scope:'all_owner_features',validUntil:null});
  const pending=await fixture({annualBenefit:true});await invite(pending);const revoke=await post(pending.root+'/gift-invitations/'+pending.invitation.id+'/revoke',{expectedVersion:1});assert.equal(revoke.status,201);assert.equal((await post('/gift-invitations/'+pending.invitation.id+'/landing',{secret:pending.invitation.secret},guest)).status,404);assert.equal((await post('/gift-invitations/'+pending.invitation.id+'/claim',{secret:pending.invitation.secret,expectedVersion:1},pending.recipient)).status,404);await noDelivery(pending);
 });
 await t.test('HTTP cancellation requires owner CSRF and empty body; cancelling queued work cannot create a Home',async()=>{
  const f=await fixture({annualBenefit:true});await invite(f);await claim(f);const job=await begin(f),route='/gift-acceptances/'+job.jobId+'/cancel';assert.equal((await post(route,{},outsider)).status,404);assert.equal((await post(route,{},f.recipient,randomUUID(),{'x-csrf-token':null})).status,403);assert.equal((await post(route,{homeId:randomUUID()},f.recipient)).status,422);
  const response=await post(route,{},f.recipient);assert.equal(response.status,200);privacy(response);const data=await response.json();assert.deepEqual(data,{jobId:job.jobId,state:'cancelled',replay:false});noSecrets(data,f);assert.equal((await (await post(route,{},f.recipient)).json()).replay,true);assert.equal((await (await request('/gift-acceptances/'+job.jobId,{},f.recipient)).json()).state,'cancelled');await noDelivery(f);assert.equal(scans.length,f.scanStart);
 });
 await t.test('HTTP reissue atomically replaces the link and replay never re-exposes a secret',async()=>{
  const f=await fixture({annualBenefit:true});await invite(f);const revision=(await store.read(issuer.id,agency.id,f.p.id)).revision;
  const route=f.root+'/gift-invitations/'+f.invitation.id+'/reissue',body={expectedRevision:revision,expectedVersion:1},key=randomUUID();
  assert.equal((await post(route,body,issuer,key,{origin:'https://other.example.test'})).status,403);
  assert.equal((await post(route,{...body,secret:'injected'},issuer,key)).status,422);
  const response=await post(route,body,issuer,key);assert.equal(response.status,201);privacy(response);const result=await response.json();
  assert.deepEqual(Object.keys(result).sort(),['id','version','state','secret','replay','requiresReissue'].sort());assert.notEqual(result.id,f.invitation.id);assert.match(result.secret,/^[A-Za-z0-9_-]{43}$/);assert.equal(result.replay,false);
  assert.equal((await post('/gift-invitations/'+f.invitation.id+'/landing',{secret:f.invitation.secret},guest)).status,404);
  assert.equal((await post('/gift-invitations/'+result.id+'/landing',{secret:result.secret},guest)).status,200);
  const replay=await post(route,body,issuer,key);assert.equal(replay.status,201);const replayBody=await replay.json();assert.equal(replayBody.id,result.id);assert.equal(replayBody.secret,null);assert.equal(replayBody.requiresReissue,true);assert.equal(replayBody.replay,true);
  assert.equal((await store.read(issuer.id,agency.id,f.p.id)).revision,revision+1);await noDelivery(f);
 });
 await t.test('the normal owner can add a private manual original after Gift acceptance without changing the received files or granting Agency access',async()=>{
  const f=await fixture({annualBenefit:true});await invite(f);await claim(f);const job=await begin(f);assert.equal((await worker.runNext(job.jobId)).state,'accepted');
  const received=await (await request('/gift-acceptances/'+job.jobId,{},f.recipient)).json(),receivedId=received.documents[0].documentId,documentsRoute='/homes/'+received.homeId+'/documents';
  const receivedBefore=await db.document.findUniqueOrThrow({where:{id:receivedId},include:{original:{include:{file:true}}}}),receiptBefore=await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{practiceId:f.p.id}}),benefitsBefore=await db.accountGiftBenefit.findMany({where:{accountId:f.recipient.id},orderBy:{id:'asc'}});
  assert.equal(benefitsBefore.length,1);assert.equal(scans.length,f.scanStart+1);assert.deepEqual(await storage.read(receivedBefore.original.file.storageKey),png);
  const key=randomUUID(),form=()=>{const body=new FormData();body.set('name','Documento aggiunto dal proprietario DEMO');body.set('visibility','private');body.set('file',new File([png],'owner-addition-DEMO.png',{type:'image/png'}));return body;};
  // Use the normal multipart DTO; fetch owns its boundary, so no JSON Content-Type is supplied.
  const uploadedResponse=await request(documentsRoute,{method:'POST',headers:{'idempotency-key':key},body:form()},f.recipient);assert.equal(uploadedResponse.status,201);assert.equal(uploadedResponse.headers.get('cache-control'),'no-store');
  const uploaded=(await uploadedResponse.json()).document;assert.notEqual(uploaded.id,receivedId);assert.equal(uploaded.homeId,received.homeId);assert.equal(uploaded.source,'manual_upload');assert.equal(uploaded.visibility,'private');assert.equal(uploaded.originalFilename,'owner-addition-DEMO.png');assert.equal(uploaded.mimeType,'image/png');assert.equal(uploaded.sha256,sha256);assert.equal(uploaded.version,1);assert.equal(Object.hasOwn(uploaded,'giftProvenance'),false);
  const manual=await db.document.findUniqueOrThrow({where:{id:uploaded.id},include:{original:{include:{file:true}}}});assert.equal(manual.uploaderId,f.recipient.id);assert.equal(manual.giftProvenance,null);assert.notEqual(manual.original.fileId,receivedBefore.original.fileId);assert.notEqual(manual.original.file.storageKey,receivedBefore.original.file.storageKey);assert.equal(scans.length,f.scanStart+2);
  const manualDetailResponse=await request(documentsRoute+'/'+uploaded.id,{},f.recipient);assert.equal(manualDetailResponse.status,200);const manualDetail=(await manualDetailResponse.json()).document;assert.equal(manualDetail.source,'manual_upload');assert.equal(Object.hasOwn(manualDetail,'giftProvenance'),false);
  const manualFile=await request(documentsRoute+'/'+uploaded.id+'/file',{},f.recipient);assert.equal(manualFile.status,200);assert.deepEqual(Buffer.from(await manualFile.arrayBuffer()),png);
  const replay=await request(documentsRoute,{method:'POST',headers:{'idempotency-key':key},body:form()},f.recipient);assert.equal(replay.status,201);assert.equal((await replay.json()).document.id,uploaded.id);assert.equal(scans.length,f.scanStart+2);
  const ownerList=await request(documentsRoute,{},f.recipient);assert.equal(ownerList.status,200);const items=(await ownerList.json()).items;assert.equal(items.length,2);assert.equal(items.find(document=>document.id===receivedId).source,'agency_gift');assert.equal(items.find(document=>document.id===uploaded.id).source,'manual_upload');
  assert.deepEqual(await db.document.findUniqueOrThrow({where:{id:receivedId},include:{original:{include:{file:true}}}}),receivedBefore);assert.deepEqual(await storage.read(receivedBefore.original.file.storageKey),png);const originalResponse=await request(documentsRoute+'/'+receivedId+'/file',{},f.recipient);assert.equal(originalResponse.status,200);assert.deepEqual(Buffer.from(await originalResponse.arrayBuffer()),png);
  const receivedDetail=(await (await request(documentsRoute+'/'+receivedId,{},f.recipient)).json()).document;assert.equal(receivedDetail.source,'agency_gift');assert.equal(receivedDetail.giftProvenance.sourceId,f.sourceId);assert.equal(receivedDetail.giftProvenance.sourceSha256,sha256);
  assert.deepEqual(await db.agencyGiftAcceptanceReceipt.findUniqueOrThrow({where:{practiceId:f.p.id}}),receiptBefore);assert.equal(await db.agencyGiftAcceptanceReceipt.count({where:{accountId:f.recipient.id}}),1);assert.deepEqual(await db.accountGiftBenefit.findMany({where:{accountId:f.recipient.id},orderBy:{id:'asc'}}),benefitsBefore);
  const recovered=await request('/gift-invitations/'+f.invitation.id+'/my-acceptance',{},f.recipient);assert.equal(recovered.status,200);const receipt=await recovered.json();assert.deepEqual(receipt.documents,received.documents);assert.deepEqual(receipt.benefit,received.benefit);assert.deepEqual(await (await request('/gift-benefits',{},f.recipient)).json(),{fullAccess:true,scope:'all_owner_features',validUntil:received.benefit.endsAt});
  const members=await db.homeMembership.findMany({where:{homeId:received.homeId}});assert.equal(members.length,1);assert.equal(members[0].accountId,f.recipient.id);assert.equal(members[0].role,'owner');
  for(const agent of [issuer,colleague,viewer])for(const route of ['/homes/'+received.homeId,documentsRoute,documentsRoute+'/'+uploaded.id,documentsRoute+'/'+uploaded.id+'/file'])assert.equal((await request(route,{},agent)).status,403);
  const refusedUpload=await request(documentsRoute,{method:'POST',headers:{'idempotency-key':randomUUID()},body:form()},issuer);assert.equal(refusedUpload.status,403);assert.equal(await db.document.count({where:{homeId:received.homeId}}),2);assert.equal(scans.length,f.scanStart+2);assert.equal(await db.homeMembership.count({where:{homeId:received.homeId,accountId:{in:[issuer.id,colleague.id,viewer.id]}}}),0);
 });
 await t.test('durable HTTP landing limits ignore forwarded-header spoofing and denied attempts stay counted',async()=>{
  const route='/gift-invitations/'+randomUUID()+'/landing';let denied;
  for(let i=0;i<61;i++){const response=await post(route,{secret:'Z'.repeat(43)},guest);if(response.status===429){denied=response;break;}assert.equal(response.status,404);}
  assert.ok(denied,'a fixed-window landing limit must apply');privacy(denied);assert.equal((await denied.json()).error.code,'rate_limited');
  const before=await db.authThrottle.findMany({where:{key:{startsWith:'gift:v1:'}},orderBy:{key:'asc'}});
  const repeated=await post(route,{secret:'Y'.repeat(43)},guest,null,{'x-forwarded-for':'203.0.113.99'});assert.equal(repeated.status,429);privacy(repeated);
  const after=await db.authThrottle.findMany({where:{key:{startsWith:'gift:v1:'}},orderBy:{key:'asc'}});assert.deepEqual(after,before);
  assert.equal(JSON.stringify(after).includes('203.0.113.99'),false);assert.equal(JSON.stringify(after).includes('Z'.repeat(43)),false);
 });

});
