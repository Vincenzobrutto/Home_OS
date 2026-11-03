// NOMINAL INTERACTIVE TRIAL ONLY: never add to ordinary or aggregate DB suites.
// Real production routes/session/CSRF/Prisma/copier; mail and antivirus receipts are explicit synthetic stubs.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const fs=require('node:fs/promises'),{createRequire}=require('node:module'),{spawn,spawnSync}=require('node:child_process');
const {randomUUID,randomBytes,createHash}=require('node:crypto'),{setTimeout:pause}=require('node:timers/promises');
const {NestFactory}=require('@nestjs/core'),{ValidationPipe,UnprocessableEntityException}=require('@nestjs/common'),cookieParser=require('cookie-parser'),express=require('express');
const {assertOfflineDatabase,assertOwnedRun}=require('./offline-policy.cjs');
const PROFILE='test:home-map-browser-trial',UNTIL='2026-11-01T08:30:00.000Z';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function contained(parent,child){
 const relative=path.relative(path.resolve(parent),path.resolve(child));
 return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
}
async function privateDirectory(directory,ownedRoot){
 assert.ok(contained(ownedRoot,directory),'Trial directory must remain inside its owned run');
 await fs.mkdir(directory,{recursive:true});
 const stat=await fs.lstat(directory);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink());
 assert.equal((await fs.realpath(directory)).toLowerCase(),path.resolve(directory).toLowerCase(),'No junction in trial output');
 return directory;
}
async function jsonFile(filename,value){await fs.writeFile(filename,JSON.stringify(value,null,2),{encoding:'utf8',mode:0o600});}
function syntheticMapPdf(){
 const {planFixture}=require('./home-map-fixture.cjs'),rooms=planFixture().rooms;
 const content='q 1 1 1 rg 0 0 100 100 re f 0.25 G 0.8 w '+rooms.map(r=>r.points.map((p,i)=>p[0]+' '+(100-p[1])+(i?' l':' m')).join(' ')+' h S BT /F1 3 Tf '+(r.points[0][0]+3)+' '+(100-r.points[0][1]-7)+' Td ('+r.label+') Tj ET').join(' ')+' Q';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>','<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let value='%PDF-1.4\n';const offsets=[];for(const [i,o]of objects.entries()){offsets.push(Buffer.byteLength(value));value+=(i+1)+' 0 obj\n'+o+'\nendobj\n';}
 const xref=Buffer.byteLength(value);value+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');return Buffer.from(value+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
}
function syntheticPdf(lines){
 const escaped=value=>value.replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,char=>'\\'+char);
 const content='BT /F1 12 Tf 50 790 Td '+lines.map((line,index)=>(index?'0 -22 Td ':'')+'('+escaped(line)+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>','<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let value='%PDF-1.4\n';const offsets=[];
 for(const [i,object]of objects.entries()){offsets.push(Buffer.byteLength(value));value+=(i+1)+' 0 obj\n'+object+'\nendobj\n';}
 const xref=Buffer.byteLength(value);value+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('');
 return Buffer.from(value+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
}

test('bounded owned Gift browser trial — actual application, synthetic scanner and private mail outbox',{timeout:7200000},async t=>{
 const until=Date.parse(UNTIL);assert.ok(Date.now()<until,'Gift browser trial deadline has passed');
 assert.equal(require('./offline-suites.cjs')[PROFILE]?.interactiveUntil,UNTIL,'Use only the registered dated nominal trial profile');
 assertOfflineDatabase(process.env.DATABASE_URL);assertOfflineDatabase(process.env.QUALITY_V3_DATABASE_URL);
 const run=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),ownedRoot=path.resolve(run.directory);
 const backend=path.resolve(__dirname,'..'),repository=path.dirname(backend),frontend=path.join(repository,'frontend-v5');
 assert.ok(contained(ownedRoot,backend)&&contained(ownedRoot,frontend),'Run only the copied repository, not a development checkout');
 assert.ok((await fs.stat(path.join(frontend,'index.html'))).isFile());
 const cache=await privateDirectory(path.join(frontend,'.agency-cache'),ownedRoot),fixtures=await privateDirectory(path.join(ownedRoot,'gift-browser-fixtures'),ownedRoot);
 const buildDirectory=await fs.mkdtemp(path.join(cache,'gift-browser-build-')),viteCache=await fs.mkdtemp(path.join(cache,'gift-browser-vite-')),workerDirectory=await fs.mkdtemp(path.join(cache,'gift-browser-pdf-')),envDirectory=await privateDirectory(path.join(cache,'gift-browser-empty-env'),ownedRoot);
 const vaultRoot=path.join(ownedRoot,'gift-browser-agency-files'),homeRoot=path.join(ownedRoot,'gift-browser-home-files');
 const readyFile=path.join(ownedRoot,'gift-browser-access.json'),statusFile=path.join(ownedRoot,'gift-browser-status.json'),outboxFile=path.join(ownedRoot,'gift-browser-mailbox.json'),stopFile=path.join(ownedRoot,'gift-browser-stop.json');
 let app,buildChild,origin='',mailWrites=Promise.resolve();
 function stopOwnedChild(child){
  if(!child?.pid||child.exitCode!==null||child.signalCode!==null)return;
  if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore',timeout:10000,env:process.env});
  else child.kill();
 }
 t.after(async()=>{stopOwnedChild(buildChild);if(app){console.log('TRIAL_STOPPING');app.getHttpServer().closeAllConnections?.();await app.close();console.log('TRIAL_STOPPED');}await mailWrites.catch(()=>{});});
 const banner='<aside role="note" data-gift-browser-trial="true" style="padding:12px 16px;background:#fff0ca;color:#332710;font:15px/1.5 system-ui;overflow-wrap:anywhere">COLLAUDO LOCALE ISOLATO · Solo persone e documenti sintetici. Email e scanner simulati: nessun invio reale, nessuna chiamata AI o spesa. API, sessioni e copia nella casa sono reali nel nuovo database di prova. Termine automatico: '+UNTIL+'.</aside>';
 const frontendRequire=createRequire(path.join(frontend,'package.json')),pdfRoot=path.dirname(frontendRequire.resolve('pdfjs-dist/package.json')),privateWorker=path.join(workerDirectory,'pdf.worker.min.mjs');
 await fs.copyFile(path.join(pdfRoot,'build/pdf.worker.min.mjs'),privateWorker);
 const config=path.join(cache,'gift-browser.build.config.ts');
 await fs.writeFile(config,`import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import {pdfAssets} from '../scripts/pdfAssets';import {ocrAssets} from '../scripts/ocrAssets';
export default defineConfig({root:${JSON.stringify(frontend)},envDir:${JSON.stringify(envDirectory)},cacheDir:${JSON.stringify(viteCache)},plugins:[react(),pdfAssets(),ocrAssets(),{name:'explicit-synthetic-gift-trial',transformIndexHtml(html){return html.replace('<body>','<body>'+ ${JSON.stringify(banner)})}}],resolve:{alias:[{find:/^pdfjs-dist\\/build\\/pdf\\.worker\\.min\\.mjs\\?url$/,replacement:${JSON.stringify(privateWorker.replaceAll('\\','/')+'?url')}}]},build:{outDir:${JSON.stringify(buildDirectory)},emptyOutDir:false,sourcemap:false,rollupOptions:{input:${JSON.stringify(path.join(frontend,'index.html'))}}}});`);
 const buildLog=await fs.open(path.join(ownedRoot,'gift-browser-build.log'),'w');
 try{
  await new Promise((resolve,reject)=>{
   buildChild=spawn(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'build','--config',config,'--configLoader','runner'],{cwd:frontend,env:process.env,windowsHide:true,stdio:['ignore',buildLog.fd,buildLog.fd]});
   const timer=setTimeout(()=>{stopOwnedChild(buildChild);reject(Error('gift_browser_build_deadline'));},Math.max(1,Math.min(180000,until-Date.now())));
   buildChild.once('error',error=>{clearTimeout(timer);reject(error);});
   buildChild.once('exit',code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error('gift_browser_build_failed'));});
  });
 }finally{await buildLog.close();}
 assert.ok(Date.now()<until,'Trial expired during frontend build');assert.ok((await fs.stat(path.join(buildDirectory,'index.html'))).isFile());

 // Module decorators read these flags at import time. No inherited provider or SMTP credentials are used.
 process.env.M4_AI_ENABLED='false';process.env.ONBOARDING_AI_ENABLED='false';process.env.DIMORA_AGENCY_PLAN_AI_ENABLED='0';
 process.env.DIMORA_AGENCY_GIFT_ENABLED='1';process.env.DIMORA_AGENCY_STORAGE_ROOT=vaultRoot;
 const {AppModule}=require('../dist/app.module'),{ApiErrorFilter}=require('../dist/main');
 const {PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{hashPassword}=require('../dist/security');
 const {LocalFileStorage}=require('../dist/documents/storage'),{WindowsDefenderScanner}=require('../dist/documents/file-control');
 const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
 const {RecoveryConfig}=require('../dist/auth/recovery-config'),{RecoveryService}=require('../dist/auth/recovery.service');
 assertDevelopmentDatabase(process.env.DATABASE_URL);
 app=await NestFactory.create(AppModule,{logger:false,abortOnError:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());
 const db=app.get(PrismaService);await db.$connect();
 assert.equal(await db.account.count(),0,'Browser trial requires its own fresh nominal cluster');
 assert.equal(await db.agencyGiftAcceptanceJob.count(),0);assert.equal(await db.home.count(),0);
 const storage=app.get(LocalFileStorage),scanner=app.get(WindowsDefenderScanner);storage.root=homeRoot;
 const allowedFiles=new Map(),scans=[];
 function allowFile(bytes){allowedFiles.set(sha(bytes),Buffer.from(bytes));return bytes;}
 scanner.scan=async(stage,expectedSha)=>{
  const expected=allowedFiles.get(expectedSha);assert.ok(expected,'Only the defined synthetic fixtures are admitted');
  const relative=path.relative(homeRoot,stage);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));assert.ok(stage.endsWith('.bin.part'));
  const actual=await fs.readFile(stage);assert.deepEqual(actual,expected);assert.equal(sha(actual),expectedSha);
  scans.push({sha256:expectedSha,at:new Date().toISOString()});
  return {engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:'synthetic-gift-browser-no-real-antivirus'};
 };
 const recipientSpecs=[
  {key:'desktop',email:'proprietario-desktop@example.test',name:'Proprietario Desktop DEMO',password:'Dimora-Gift-Desktop-2026!',annualBenefit:true},
  {key:'mobile',email:'proprietario-mobile@example.test',name:'Proprietario Mobile DEMO',password:'Dimora-Gift-Mobile-2026!',annualBenefit:false}
 ];
 const mail=[];
 const recoveryConfig=app.get(RecoveryConfig),syntheticConfig={enabled:true,apiKey:'synthetic-no-network-key',senderEmail:'noreply@gift-demo.example.test',senderName:'Dimora collaudo sintetico',publicOrigin:'https://gift-demo.example.test',throttleSecret:randomBytes(32).toString('hex')};
 Object.defineProperty(recoveryConfig,'raw',{configurable:true,get:()=>syntheticConfig});
 assert.equal(recoveryConfig.enabled(),true,'Normal registration must require actual email verification');
 const recovery=app.get(RecoveryService);
 recovery.mail=()=>({send:async(purpose,email,token)=>{
  assert.equal(purpose,'verify_email','This trial stub supports verification only');
  assert.ok(recipientSpecs.some(recipient=>recipient.email===email),'Only the supplied synthetic recipients may use the local outbox');
  assert.match(token,/^[A-Za-z0-9_-]{43}$/);assert.ok(origin,'Browser origin must be ready before requesting verification');
  mail.push({purpose,email,url:origin+'/verifica-email#token='+token,at:new Date().toISOString(),transport:'synthetic-private-outbox-no-email'});
  mailWrites=mailWrites.then(()=>jsonFile(outboxFile,{synthetic:true,externalEmailSent:false,messages:mail}));await mailWrites;
  return {messageId:'synthetic-local-'+randomUUID()};
 }});
 await jsonFile(outboxFile,{synthetic:true,externalEmailSent:false,messages:[]});

 const store=app.get(AgencyPracticesStore),vault=app.get(AgencyFileVault),agentPassword='Dimora-Gift-Agente-2026!';
 const agent=await db.account.create({data:{name:'Agente collaudo Gift DEMO',email:'agente-gift@example.test',passwordHash:await hashPassword(agentPassword),emailVerifiedAt:new Date(),requiresEmailVerification:false}});
 const agency=await db.agency.create({data:{name:'Agenzia Gift · collaudo sintetico'}});
 await db.agencyMember.create({data:{agencyId:agency.id,accountId:agent.id,role:'admin',validFrom:new Date('2026-01-01T00:00:00.000Z')}});
 const cases=[];
 for(const recipient of recipientSpecs){
  const practice=(await store.create(agent.id,agency.id,'Gift '+recipient.key+' · documenti sintetici',randomUUID())).practice;
  const revision=async()=>(await store.read(agent.id,agency.id,practice.id)).revision;
  const documents=[
   {sourceId:'received-'+recipient.key,title:'Documento ricevuto '+recipient.key+' DEMO',filename:'ricevuto-'+recipient.key+'-DEMO.pdf',origin:'received',bytes:allowFile(syntheticMapPdf())},
   {sourceId:'surface-'+recipient.key,title:'Prospetto superfici '+recipient.key+' DEMO',filename:'prospetto-'+recipient.key+'-DEMO.pdf',origin:'agency_generated',bytes:allowFile(syntheticPdf(['PROSPETTO SINTETICO - COLLAUDO GIFT','Qualifica: STIMA. Metodo: A4 presunto.','Formato e scala non verificati.','Nessuna metratura certificata.']))},
   {sourceId:'excluded-'+recipient.key,title:'Nota interna esclusa '+recipient.key+' DEMO',filename:'escluso-'+recipient.key+'-DEMO.pdf',origin:'received',bytes:allowFile(syntheticPdf(['NOTA INTERNA SINTETICA','Da NON rendere finale e NON selezionare nella Gift.']))}
  ];
  for(const document of documents)await store.upload(agent.id,agency.id,practice.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:document.sourceId,visibility:'practice',originalFilename:document.filename}},document.bytes,vault);
  await store.mutate(agent.id,agency.id,practice.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'classify',sourceId:documents[0].sourceId,expectedSourceVersion:1,kind:'floor_plan'}});
  const row=await db.agencyPractice.findUniqueOrThrow({where:{id:practice.id}}),state=row.snapshot;
  const map=require('./home-map-fixture.cjs').planFixture(documents[0].sourceId,sha(documents[0].bytes));
  const rendered=await new (require('../dist/agency-plans/renderer').AgencyPlanRasterizer)().render({bytes:documents[0].bytes,sha256:sha(documents[0].bytes),mimeType:'application/pdf'},{page:1,dpi:72});
  assert.deepEqual({width:rendered.raster.width,height:rendered.raster.height},map.rasterSize);
  map.rasterSHA256=rendered.rasterSHA256;map.rendering={dpi:72,renderer:rendered.renderer,transform:rendered.transform};
  map.measurementConfiguration={...map.measurementConfiguration,base:'rooms_and_walls',mainRegionIds:['kitchen','corridor'],assignments:map.rooms.map(r=>({id:r.id,kind:r.kind==='balcony'?'uncovered_balcony':'principal'})),policyVersion:'synthetic-reviewed-plan-v1',walls:[],coverageConfirmed:false,wallCoverageConfirmed:false,policyConfirmed:false,commonWallCapBasis:'physical_thickness'};
  state.planAnalyses=[map];
  await db.agencyPractice.update({where:{id:practice.id},data:{snapshot:state}});
  const estimated=documents[1],surface={kind:'commercial',qualification:'estimated',method:'A4 presunto · fixture sintetica',geometryRevision:3,caveats:['Formato del foglio non verificato','Scala dichiarata da controllare','Perimetro e pertinenze da verificare']};
  // Explicit trusted fixture metadata, not an implemented automatic PDF/mandate producer.
  await store.registerGiftMetadata(agent.id,agency.id,practice.id,{agencyId:agency.id,practiceId:practice.id,sourceId:estimated.sourceId,sourceVersion:1,sha256:sha(estimated.bytes),metadataVersion:1,origin:'agency_generated',lifecycle:'final',author:'Produttore sintetico del collaudo',title:estimated.title,surface},{key:randomUUID(),expectedRevision:await revision(),expectedMetadataVersion:null});
  const metadata=await store.readGiftMetadata(agent.id,agency.id,practice.id);
  assert.equal(metadata.documents.find(document=>document.sourceId===documents[0].sourceId).state,'missing');
  assert.equal(metadata.documents.find(document=>document.sourceId===documents[2].sourceId).state,'missing');
  assert.deepEqual(metadata.documents.find(document=>document.sourceId===estimated.sourceId).descriptor.surface,surface);
  assert.equal(await db.account.findUnique({where:{email:recipient.email}}),null,'Recipient must register normally in the browser');
  cases.push({key:recipient.key,practiceId:practice.id,recipient,documents:documents.map(document=>({sourceId:document.sourceId,title:document.title,filename:document.filename,sha256:sha(document.bytes),role:document===documents[0]?'release-and-select':document===estimated?'already-final-select':'exclude'})),surface});
 }
 const ownerAddition=allowFile(syntheticPdf(['DOCUMENTO AGGIUNTO DAL PROPRIETARIO - SINTETICO','Da caricare nella normale casa dopo accettazione.']));
 const ownerAdditionFile=path.join(fixtures,'aggiunta-proprietario-DEMO.pdf');await fs.writeFile(ownerAdditionFile,ownerAddition,{mode:0o600});
 assert.equal(await db.home.count(),0);assert.equal(await db.agencyGiftInvitation.count(),0);

 app.use((request,response,next)=>{response.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Dimora-Offline-Run':run.token});next();});
 const indexHtml=await fs.readFile(path.join(buildDirectory,'index.html'),'utf8');
 const serveStatic=express.static(buildDirectory,{index:false,redirect:false,dotfiles:'deny'});
 app.use((request,response,next)=>request.path.startsWith('/api/v5')?next():serveStatic(request,response,next));
 app.use((request,response,next)=>{
  const html=typeof request.headers.accept==='string'&&request.headers.accept.includes('text/html');
  if(['GET','HEAD'].includes(request.method)&&html&&!request.path.startsWith('/api/v5')&&!/^\/(?:assets|pdfjs|ocr)(?:\/|$)/.test(request.path)&&!path.extname(request.path))response.type('html').send(indexHtml);
  else next();
 });
 app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true,exceptionFactory:errors=>new UnprocessableEntityException({message:'Controlla i dati inseriti.',fieldErrors:Object.fromEntries(errors.map(error=>[error.property,Object.values(error.constraints||{})[0]||'Valore non valido.']))})}));
 app.useGlobalFilters(new ApiErrorFilter());
 assert.ok(Date.now()<until,'Trial expired before HTTP startup');
 await app.listen(0,'127.0.0.1');const apiReadiness=await app.getUrl(),listener=new URL(apiReadiness);assert.equal(listener.hostname,'127.0.0.1');
 // A fresh host isolates the application's host-only cookie without clearing the user's existing browser data.
 // Browser resolution of *.localhost is checked separately by the operator; Node readiness remains on the guarded IP.
 origin='http://gift-'+run.token.replaceAll('-','').slice(0,16)+'.localhost:'+listener.port;process.env.FRONTEND_ORIGIN=origin;
 assert.ok(Date.now()<until,'Trial expired before readiness');
 const ready=await fetch(apiReadiness+'/api/v5/session');assert.equal(ready.status,200);assert.equal(ready.headers.get('x-dimora-offline-run'),run.token);
 const spa=await fetch(apiReadiness+'/gift/00000000-0000-4000-8000-000000000001',{headers:{accept:'text/html'}});assert.equal(spa.status,200);const html=await spa.text();assert.match(html,/data-gift-browser-trial/);const assetPath=/<script[^>]*src="([^"]+)"/.exec(html)?.[1];assert.ok(assetPath?.startsWith('/assets/'));const assetResponse=await fetch(apiReadiness+assetPath);assert.equal(assetResponse.status,200);assert.match(assetResponse.headers.get('content-type'),/javascript/);
 const apiMissing=await fetch(apiReadiness+'/api/v5/not-a-route',{headers:{accept:'application/json'}});assert.notEqual(apiMissing.status,200);
 await jsonFile(readyFile,{schemaVersion:1,kind:'owned-synthetic-gift-browser-trial',origin,browserOrigin:origin,apiReadiness:apiReadiness+'/api/v5/session',until:UNTIL,runDirectory:ownedRoot,readyFile,statusFile,outboxFile,stopFile,stopToken:run.token,buildDirectory,
  isolation:'Fresh unique *.localhost origin for host-only application cookies; not a separate browser profile. Verify Chromium resolves this host before testing.',agent:{email:agent.email,password:agentPassword,loginUrl:origin+'/accedi?next=%2Fagenzie'},
  cases:cases.map(item=>({...item,practiceUrl:origin+'/agenzie/'+agency.id+'/pratiche/'+item.practiceId})),ownerAdditionFile,
  stubs:{email:'private synthetic outbox only; challenge and verification endpoint are real',antivirus:'fixture hash/bytes only; no real AV verdict',AI:'disabled; canonical geometry is a named synthetic fixture, not a real recognition run'},
  browserAssertionsAutomated:false,instructions:['Use only the supplied synthetic credentials and files.','Agent: on the received PDF release select digital map (3 rooms), explicitly review geometry/names/scale, release and select it plus surface report; internal note excluded.','Create the Gift in the actual interface, with recipient email and annual flag specified for the case.','Log out on the unique trial host; open the copied personal link on this same host, register, request email verification.','Read the local private outbox file; open its verification link in a second tab on the same unique trial host; refresh the Gift session.','Confirm Home name/address, accept, inspect normal Home Documents and all provenance/surface caveats.','Open Home -> Ambienti -> Mappa ricevuta dall’agenzia. Create a fridge in normal Oggetti, return to the map, select Cucina/fridge, place and save, reload, open normal card. Repeat at375px. Optional: split a contour edge; old pins must require reconfirmation.']});
 async function status(reason){
  const details=[];
  for(const item of cases){
   const recipient=await db.account.findUnique({where:{email:item.recipient.email},select:{id:true,emailVerifiedAt:true}});
   const receipt=await db.agencyGiftAcceptanceReceipt.findUnique({where:{practiceId:item.practiceId},select:{id:true,accountId:true,homeId:true,acceptedAt:true}});
   details.push({case:item.key,registered:!!recipient,emailVerified:!!recipient?.emailVerifiedAt,accepted:!!receipt,
    ...(receipt?{receiptId:receipt.id,homeId:receipt.homeId,acceptedAt:receipt.acceptedAt.toISOString(),documentCount:await db.document.count({where:{homeId:receipt.homeId}}),ownerMemberships:await db.homeMembership.count({where:{homeId:receipt.homeId,role:'owner'}}),benefitCount:await db.accountGiftBenefit.count({where:{accountId:receipt.accountId}})}:{})});
  }
  await jsonFile(statusFile,{synthetic:true,browserAssertionsAutomated:false,at:new Date().toISOString(),until:UNTIL,reason,scanner:'synthetic-fixture-only',scans:scans.length,mail:'synthetic-private-outbox',mailMessages:mail.length,cases:details});
 }
 await status('ready');console.log('TRIAL_READY '+JSON.stringify({origin,browserOrigin:origin,apiReadiness:apiReadiness+'/api/v5/session',until:UNTIL,readyFile}));
 let stopped='deadline',lastStatus=Date.now();
 while(Date.now()<until){
  try{const stop=JSON.parse(await fs.readFile(stopFile,'utf8'));if(stop.token===run.token){stopped='owned-stop-marker';break;}}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  if(Date.now()-lastStatus>=5000){await status('running');lastStatus=Date.now();}
  await pause(500);
 }
 await status(stopped);
});
