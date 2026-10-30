import { ArgumentsHost, Body, CanActivate, Catch, Controller, DynamicModule, ExecutionContext, ExceptionFilter, Get, Headers, HttpException, Inject, Injectable, Module, Param, Post, Query, Req, Res, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash, randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import type { Request, Response } from 'express';
import { SessionsService } from '../security';
import { PrismaService } from '../prisma.service';
import { PracticeError } from './domain';
import { AgencyPracticesStore } from './store';
import { AgencyFileVault } from './files';
import { parsePlanEdit } from '../agency-plans/edit-dto';
import { PlanError } from '../agency-plans/geometry';
import { authorizedPlanImage } from '../agency-plans/renderer';

function object(v:unknown,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null||Object.keys(v).some(k=>!keys.includes(k)))throw new PracticeError('invalid_input');return v as Record<string,unknown>;}
function key(v:unknown){if(typeof v!=='string'||!v.trim()||v.length>120||Array.from(v).some(c=>c.charCodeAt(0)<32))throw new PracticeError('invalid_input');return v.trim();}
function source(v:string){if(!v||v.length>100||Array.from(v).some(c=>c.charCodeAt(0)<32))throw new PracticeError('invalid_input');return v;}
function serverId(account:string,practice:string,k:string,kind:string){return createHash('sha256').update(JSON.stringify([account,practice,k,kind])).digest('hex');}
type AgencyRequest=Request&{agencyAccountId:string};
@Catch()
export class AgencyErrorFilter implements ExceptionFilter{
 catch(error:unknown,host:ArgumentsHost){const response=host.switchToHttp().getResponse<Response>();let status=503,code='service_unavailable';if(error instanceof PracticeError){code=error.code;status=code==='access_denied'?403:code==='invalid_input'?422:409;}else if(error instanceof PlanError){status=422;code='invalid_plan_input';}else if(error instanceof HttpException){status=error.getStatus();if(status===400)status=422;code=status===401?'unauthenticated':status===403?'csrf_invalid':status===413?'file_too_large':status===422?'invalid_input':'request_error';}response.status(status).json({error:{code,message:status===503?'Servizio temporaneamente non disponibile.':'Controlla accesso e dati della richiesta.',requestId:randomUUID()}});}
}
@Injectable()
export class AgencySessionGuard implements CanActivate{
 constructor(private readonly sessions:SessionsService,@Inject(AgencyPracticesStore)private readonly store:AgencyPracticesStore){}
 async canActivate(ctx:ExecutionContext){const r=ctx.switchToHttp().getRequest<AgencyRequest>(),mutation=!['GET','HEAD'].includes(r.method);r.agencyAccountId=(await this.sessions.require(r,mutation)).accountId;if(!isUUID(String(r.params.agencyId))||r.params.practiceId&&!isUUID(String(r.params.practiceId)))throw new PracticeError('invalid_input');if(r.params.practiceId)await this.store.authorize(r.agencyAccountId,String(r.params.agencyId),String(r.params.practiceId),mutation?'edit':'read');return true;}
}
@Controller('agencies/:agencyId/practices') @UseGuards(AgencySessionGuard) @UseFilters(AgencyErrorFilter)
export class AgencyPracticesController{
 constructor(@Inject(AgencyPracticesStore)private readonly store:AgencyPracticesStore,@Inject(AgencyFileVault)private readonly vault:AgencyFileVault){}
 @Get() list(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Query()q:unknown){const b=object(q,['after']);if(b.after!==undefined&&(typeof b.after!=='string'||!isUUID(b.after)))throw new PracticeError('invalid_input');return this.store.list(r.agencyAccountId,g,b.after as string|undefined);}
 @Post() create(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Body()input:unknown,@Headers('idempotency-key')k:unknown){const b=object(input,['label']);return this.store.create(r.agencyAccountId,g,b.label as string,key(k));}
 @Get(':practiceId') read(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Query()q:unknown){object(q,[]);return this.store.read(r.agencyAccountId,g,p);}
 @Get(':practiceId/review') review(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Query()q:unknown){object(q,[]);return this.store.readReview(r.agencyAccountId,g,p);}
 @Get(':practiceId/findings') findings(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Query()q:unknown){object(q,[]);return this.store.readFindings(r.agencyAccountId,g,p);}
 @Post(':practiceId/findings') finding(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Body()input:unknown,@Headers('idempotency-key')raw:unknown){const b=object(input,['expectedRevision','command']),c=object(b.command,['operation','visibility','question','unitId','kind','description','evidence','target','targetId','expectedFingerprint','outcome','reason']),k=key(raw);let command:Record<string,unknown>;if(c.operation==='comparison'){object(c,['operation','visibility','question']);command={...c,id:serverId(r.agencyAccountId,p,k,'comparison')};}else if(c.operation==='observation'){object(c,['operation','unitId','kind','description','visibility','evidence']);command={...c,id:serverId(r.agencyAccountId,p,k,'observation')};}else if(c.operation==='resolve'){object(c,['operation','target','targetId','expectedFingerprint','outcome','reason','evidence']);const {targetId,...rest}=c;command={...rest,id:targetId};}else throw new PracticeError('invalid_input');return this.store.finding(r.agencyAccountId,g,p,{key:k,expectedRevision:b.expectedRevision,command});}
 @Get(':practiceId/plans') plans(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Query()q:unknown){object(q,[]);return this.store.readPlans(r.agencyAccountId,g,p);}
 @Get(':practiceId/plans/:planId/image') async planImage(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('planId')id:string,@Query()q:unknown,@Res()res:Response){object(q,[]);const image=await authorizedPlanImage(this.store,this.vault,{accountId:r.agencyAccountId,agencyId:g,practiceId:p},source(id));res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'image/png'});res.send(image);}
 @Post(':practiceId/plans/:planId/edits') editPlan(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('planId')id:string,@Body()input:unknown,@Headers('idempotency-key')k:unknown){return this.store.editPlan(r.agencyAccountId,g,p,parsePlanEdit(input,key(k),id));}
 @Get(':practiceId/sources/:sourceId') details(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('sourceId')s:string,@Query()q:unknown){object(q,[]);return this.store.sourceDetails(r.agencyAccountId,g,p,source(s));}
 @Post(':practiceId/review') decide(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Body()input:unknown,@Headers('idempotency-key')raw:unknown){
  const b=object(input,['expectedRevision','command']),c=object(b.command,['operation','label','unitId','subjectKey','field','value','visibility','factId','expectedFactVersion','action','reason']),k=key(raw);let command:Record<string,unknown>;
  if(c.operation==='unit'){object(c,['operation','label']);command={operation:'unit',id:serverId(r.agencyAccountId,p,k,'unit'),label:c.label};}
  else if(c.operation==='declare'){object(c,['operation','unitId','subjectKey','field','value','visibility']);command={...c,operation:'propose',id:serverId(r.agencyAccountId,p,k,'fact'),origin:'declared',evidence:[]};}
  else if(c.operation==='decide'){object(c,['operation','factId','expectedFactVersion','action','value','reason']);const {factId,...rest}=c;command={...rest,id:factId};}
  else throw new PracticeError('invalid_input');
  return this.store.review(r.agencyAccountId,g,p,{key:k,expectedRevision:b.expectedRevision,command});
 }
 @Post(':practiceId/sources') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:20*1024*1024,files:1,fields:1,fieldSize:4096,parts:3}}))
 upload(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Body()body:unknown,@UploadedFile()file:{buffer:Buffer;originalname:string}|undefined,@Headers('idempotency-key')raw:unknown){
  const b=object(body,['metadata']);if(typeof b.metadata!=='string'||!file)throw new PracticeError('invalid_input');let m:Record<string,unknown>;try{m=object(JSON.parse(b.metadata),['expectedRevision','visibility']);}catch{throw new PracticeError('invalid_input');}const k=key(raw);
  return this.store.upload(r.agencyAccountId,g,p,{key:k,expectedRevision:m.expectedRevision,command:{operation:'attach',sourceId:serverId(r.agencyAccountId,p,k,'source'),visibility:m.visibility,originalFilename:file.originalname}},file.buffer,this.vault);
 }
 @Post(':practiceId/sources/:sourceId/replacements') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:20*1024*1024,files:1,fields:1,fieldSize:4096,parts:3}}))
 replace(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('sourceId')s:string,@Body()body:unknown,@UploadedFile()file:{buffer:Buffer;originalname:string}|undefined,@Headers('idempotency-key')raw:unknown){const b=object(body,['metadata']);if(typeof b.metadata!=='string'||!file)throw new PracticeError('invalid_input');let m:Record<string,unknown>;try{m=object(JSON.parse(b.metadata),['expectedRevision','expectedSourceVersion']);}catch{throw new PracticeError('invalid_input');}return this.store.upload(r.agencyAccountId,g,p,{key:key(raw),expectedRevision:m.expectedRevision,command:{operation:'replace',sourceId:source(s),expectedSourceVersion:m.expectedSourceVersion,originalFilename:file.originalname}},file.buffer,this.vault);}
 @Post(':practiceId/sources/:sourceId/classification') classify(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('sourceId')s:string,@Body()input:unknown,@Headers('idempotency-key')k:unknown){const b=object(input,['expectedRevision','expectedSourceVersion','kind']);return this.store.mutate(r.agencyAccountId,g,p,{key:key(k),expectedRevision:b.expectedRevision,command:{operation:'classify',sourceId:source(s),expectedSourceVersion:b.expectedSourceVersion,kind:b.kind}});}
 @Post(':practiceId/sources/:sourceId/withdraw') withdraw(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('sourceId')s:string,@Body()input:unknown,@Headers('idempotency-key')k:unknown){const b=object(input,['expectedRevision','expectedSourceVersion']);return this.store.mutate(r.agencyAccountId,g,p,{key:key(k),expectedRevision:b.expectedRevision,command:{operation:'withdraw',sourceId:source(s),expectedSourceVersion:b.expectedSourceVersion}});}
 @Get(':practiceId/sources/:sourceId/file') async file(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('sourceId')s:string,@Query()q:unknown,@Res()res:Response){const b=object(q,['version','sha256']);if(typeof b.version!=='string'||!/^\d{1,8}$/u.test(b.version))throw new PracticeError('invalid_input');const f=await this.store.readFile(r.agencyAccountId,g,p,{sourceId:source(s),version:Number(b.version),sha256:b.sha256 as string},this.vault);const name=encodeURIComponent(f.originalFilename).replace(/[!'()*]/gu,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':f.mimeType,'Content-Disposition':"attachment; filename=\"documento\"; filename*=UTF-8''"+name});res.send(f.bytes);}
}
/** Opt-in module only; intentionally absent from AppModule. No default storage root. */
@Module({})
export class AgencyPracticesModule{
 static register(storageRoot:string):DynamicModule{return {module:AgencyPracticesModule,controllers:[AgencyPracticesController],providers:[AgencySessionGuard,{provide:AgencyPracticesStore,useFactory:(db:PrismaService)=>new AgencyPracticesStore(db),inject:[PrismaService]},{provide:AgencyFileVault,useFactory:()=>AgencyFileVault.open(storageRoot)}]};}
}
