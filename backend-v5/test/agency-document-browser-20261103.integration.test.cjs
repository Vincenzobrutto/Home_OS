// Dated nominal browser trial only. New owned DB, real API/PDF decoding, hash-bound synthetic provider.
require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto'),{spawn,spawnSync}=require('node:child_process'),{createRequire}=require('node:module');
const {Module,Global}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core'),cookieParser=require('cookie-parser'),express=require('express');
const {assertOwnedRun,assertOfflineDatabase}=require('./offline-policy.cjs');
const PROFILE='test:agency-document-browser-20261103',UNTIL='2026-11-03T12:30:00.000Z';
test('native document browser trial is bounded, isolated and synthetic',{timeout:7200000},async t=>{
 const until=Date.parse(UNTIL);assert.ok(Date.now()<until,'Trial expired');assert.equal(require('./offline-suites.cjs')[PROFILE].interactiveUntil,UNTIL);
 assertOfflineDatabase(process.env.DATABASE_URL);const owned=assertOwnedRun(process.env.DIMORA_OFFLINE_RUN_DIR,process.env.DIMORA_OFFLINE_TOKEN),run=owned.directory;
 const frontend=path.resolve(__dirname,'../../frontend-v5'),cache=path.join(frontend,'.agency-cache');await fs.mkdir(cache,{recursive:true});
 const build=await fs.mkdtemp(path.join(cache,'document-browser-build-')),viteCache=await fs.mkdtemp(path.join(cache,'document-browser-cache-')),envDir=path.join(cache,'document-browser-empty-env');await fs.mkdir(envDir,{recursive:true});
 const worker=path.join(cache,'document-browser-pdf.worker.min.mjs'),frontendRequire=createRequire(path.join(frontend,'package.json'));await fs.copyFile(frontendRequire.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),worker);
 const configFile=path.join(cache,'document-browser.config.ts'),banner='<aside role="note" style="padding:12px;background:#fff0ca;font:15px system-ui">Collaudo isolato · documenti e persone sintetici · provider fixture, nessuna AI reale o spesa. Termine 3 novembre 13:30 Europe/Rome.</aside>';
 await fs.writeFile(configFile,`import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import {pdfAssets} from '../scripts/pdfAssets';import {ocrAssets} from '../scripts/ocrAssets';export default defineConfig({root:${JSON.stringify(frontend)},envDir:${JSON.stringify(envDir)},cacheDir:${JSON.stringify(viteCache)},plugins:[react(),pdfAssets(),ocrAssets(),{name:'synthetic-native-document-banner',transformIndexHtml(html){return html.replace('<body>','<body>'+${JSON.stringify(banner)})}}],resolve:{alias:[{find:/^pdfjs-dist\\/build\\/pdf\\.worker\\.min\\.mjs\\?url$/,replacement:${JSON.stringify(worker.replaceAll('\\','/')+'?url')}}]},build:{outDir:${JSON.stringify(build)},emptyOutDir:false,sourcemap:false}});`);
 const log=await fs.open(path.join(run,'document-browser-build.log'),'w');let child;
 function stopChild(){if(child?.pid&&child.exitCode===null){if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore',timeout:10000});else child.kill();}}
 t.after(stopChild);
 try{await new Promise((resolve,reject)=>{child=spawn(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'build','--config',configFile,'--configLoader','runner'],{cwd:frontend,windowsHide:true,env:process.env,stdio:['ignore',log.fd,log.fd]});const timer=setTimeout(()=>{stopChild();reject(Error('native_trial_build_timeout'));},180000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error('native_trial_build_failed'));});});}finally{await log.close();}
 const vaultRoot=path.join(run,'document-browser-vault');process.env.DIMORA_AGENCY_STORAGE_ROOT=vaultRoot;process.env.DIMORA_AGENCY_PLAN_AI_ENABLED='0';
 const {PrismaClient}=require('../generated/client'),{PrismaService,assertDevelopmentDatabase}=require('../dist/prisma.service'),{SessionsService,hashPassword}=require('../dist/security');
 const {AuthModule}=require('../dist/auth/auth.module'),{HomesModule}=require('../dist/homes/homes.module');
 const {AgencyAvailabilityModule,AgencyPracticesModule}=require('../dist/agency-practices/http'),{GiftAccountModule}=require('../dist/agency-practices/gift-http');
 const {AgencyPracticesStore}=require('../dist/agency-practices/store'),{AgencyFileVault}=require('../dist/agency-practices/files');
 const {AgencyDocumentAnalysisModule}=require('../dist/agency-document-analysis/module'),{AgencyDocumentAnalysisStore}=require('../dist/agency-document-analysis/store');
 const {syntheticDocumentConfiguration,createHashBoundDocumentProvider}=require('./agency-document-fixture.cjs'),{nativeDocumentFixture,nativePdf}=require('./agency-document-analysis-http-fixture.cjs');
 assertDevelopmentDatabase(process.env.DATABASE_URL);const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
 const fixture=nativeDocumentFixture(),provider=createHashBoundDocumentProvider(fixture.manifest),configuration=syntheticDocumentConfiguration();
 class Infra{}Global()(Infra);Module({providers:[{provide:PrismaService,useValue:db},{provide:SessionsService,useValue:new SessionsService(db)}],exports:[PrismaService,SessionsService]})(Infra);
 class Root{}Module({imports:[Infra,AuthModule,HomesModule,AgencyAvailabilityModule,GiftAccountModule,AgencyPracticesModule.register(vaultRoot),AgencyDocumentAnalysisModule.register(vaultRoot,{config:configuration,provider,autoStart:true,pollIntervalMs:500,concurrency:1})]})(Root);
 const app=await NestFactory.create(Root,{logger:false});app.setGlobalPrefix('api/v5');app.use(cookieParser());app.use((_req,res,next)=>{res.setHeader('X-Dimora-Offline-Run',owned.token);next();});
 t.after(async()=>{app.getHttpServer().closeAllConnections?.();await app.close();});
 const store=app.get(AgencyPracticesStore),vault=await AgencyFileVault.open(vaultRoot),ledger=app.get(AgencyDocumentAnalysisStore),email='agente-documenti@example.test',password='Dimora-Documenti-Synthetic-2026!';
 const actor=await db.account.create({data:{name:'Agente documenti DEMO',email,passwordHash:await hashPassword(password),emailVerifiedAt:new Date(),requiresEmailVerification:false}}),agency=await db.agency.create({data:{name:'Agenzia documenti · collaudo sintetico'}});
 await db.agencyMember.create({data:{accountId:actor.id,agencyId:agency.id,role:'agent',validFrom:new Date('2026-01-01')}});
 const practice=(await store.create(actor.id,agency.id,'Fascicolo sintetico · atto e visura da verificare',randomUUID())).practice,revision=async()=>(await store.read(actor.id,agency.id,practice.id)).revision;
 await db.agencyPracticeGrant.update({where:{practiceId_accountId:{practiceId:practice.id,accountId:actor.id}},data:{canExport:false}});
 for(const [id,kind,filename,bytes]of [['deed','deed','Atto sintetico.pdf',fixture.bytes],['cadastre','cadastral','Visura sintetica.pdf',fixture.bytes],['scan','deed','PDF scansito sintetico.pdf',nativePdf(['Pagina testuale sintetica',''])]]){
  await store.upload(actor.id,agency.id,practice.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'attach',sourceId:id,visibility:'private',originalFilename:filename}},bytes,vault);
  await store.mutate(actor.id,agency.id,practice.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'classify',sourceId:id,expectedSourceVersion:1,kind}});
 }
 await store.review(actor.id,agency.id,practice.id,{key:randomUUID(),expectedRevision:await revision(),command:{operation:'unit',id:'unit-demo',label:'Abitazione sintetica'}});
 await ledger.provisionBudget({agencyId:agency.id,configuration,capMicros:0,expiresAt:new Date(until)});
 await app.init();const server=app.getHttpAdapter().getInstance();server.use('/api/v5',(_req,res)=>res.status(404).json({error:{code:'not_found'}}));server.use(express.static(build,{index:false}));server.use((req,res,next)=>req.method==='GET'?res.sendFile(path.join(build,'index.html')):next());
 await app.listen(0,'127.0.0.1');const port=app.getHttpServer().address().port,origin='http://document-'+randomUUID().replaceAll('-','').slice(0,16)+'.localhost:'+port;process.env.FRONTEND_ORIGIN=origin;
 const url=origin+'/agenzie/'+agency.id+'/pratiche/'+practice.id,readyFile=path.join(run,'document-browser-ready.json'),stopFile=path.join(run,'document-browser-stop.json'),statusFile=path.join(run,'document-browser-status.json');
 const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2),{mode:0o600});
 const readiness=await fetch('http://127.0.0.1:'+port+'/api/v5/session');assert.equal(readiness.status,200);assert.equal(readiness.headers.get('x-dimora-offline-run'),owned.token);
 await write(readyFile,{profile:PROFILE,origin,url,email,password,until:UNTIL,stopFile,statusFile,stopToken:owned.token,agencyId:agency.id,practiceId:practice.id,synthetic:true,provider:'hash-bound fixture only',externalCalls:0});
 console.log('DOCUMENT_BROWSER_READY '+JSON.stringify({origin,readyFile,until:UNTIL}));let reason='deadline';
 while(Date.now()<until){try{const stop=JSON.parse(await fs.readFile(stopFile,'utf8'));if(stop.token===owned.token&&stop.profile===PROFILE){reason='owned-stop-marker';break;}}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}await new Promise(resolve=>setTimeout(resolve,500));}
 await write(statusFile,{reason,at:new Date().toISOString(),synthetic:true,providerCalls:provider.calls.map(c=>({phase:c.phase,pages:c.pages})),jobs:await db.agencyDocumentAnalysisJob.findMany({select:{state:true,recordId:true,spentMicros:true}}).then(rows=>rows.map(r=>({...r,spentMicros:r.spentMicros.toString()})))});
});
