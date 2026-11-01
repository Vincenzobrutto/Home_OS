import {ArgumentsHost,Body,Catch,Controller,DynamicModule,ExceptionFilter,Get,Header,Headers,HttpCode,HttpException,Inject,Module,Param,Post,Query,Req,UseFilters,UseGuards} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request,Response} from 'express';
import {SessionsService} from '../security';
import {PrismaService} from '../prisma.service';
import {DocumentsModule} from '../documents/documents.module';
import {LocalFileStorage} from '../documents/storage';
import {AgencySessionGuard} from './http';
import {AgencyPracticesStore} from './store';
import {AgencyFileVault} from './files';
import {PracticeError} from './domain';
import {GiftInvitationError} from './gift-invitations';
import {GiftInvitationsStore} from './gift-invitations-store';
import {GiftAcceptanceStore} from './gift-acceptance-store';
import {GiftAcceptanceWorker} from './gift-acceptance-worker';
import {GiftThrottle} from './gift-throttle';
import {GiftBenefitsStore} from './gift-benefits-store';
import {GiftDocumentReleaseStore} from './gift-document-release';
import {parseGiftLandingBody,parseGiftClaimBody,parseGiftAcceptanceBody,parseGiftCreateBody,parseGiftVersionBody,parseGiftReissueBody} from './gift-http-contracts';
import {GiftJobsRunner,giftDeliveryConfigured,type GiftRuntime} from './gift-runner';

type AgencyRequest=Request&{agencyAccountId:string};
function invalid():never{throw new GiftInvitationError('invalid_input');}
function id(value:string){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))invalid();return value;}
function object(value:unknown,keys:string[]){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).some(k=>typeof k!=='string'||!keys.includes(k)))invalid();return value as Record<string,unknown>;}
function noQuery(q:unknown){object(q,[]);}
function privateHeaders(response:Response){response.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});}
function publicInvitation(r:Awaited<ReturnType<GiftInvitationsStore['create']>>){return {id:r.id,version:r.version,state:r.state,secret:r.secret,replay:r.replay,requiresReissue:r.requiresReissue};}

@Catch()
export class GiftErrorFilter implements ExceptionFilter{
 catch(error:unknown,host:ArgumentsHost){
  const response=host.switchToHttp().getResponse<Response>();privateHeaders(response);let status=503,code='service_unavailable';
  if(error instanceof GiftInvitationError){code=error.code;status=code==='unavailable'?404:code==='invalid_input'?422:code==='benefit_unavailable'?503:409;}
  else if(error instanceof PracticeError){code=error.code;status=code==='access_denied'?403:code==='invalid_input'?422:409;}
  else if(error instanceof HttpException){
   try{
    const s=error.getStatus(),body=error.getResponse(),provided=body&&typeof body==='object'?Object.getOwnPropertyDescriptor(body,'code')?.value:undefined;
    status=[401,403,429,503].includes(s)?s:s===400||s===422?422:503;
    code=status===401?(provided==='account_context_changed'?'account_context_changed':'unauthenticated'):status===403?'csrf_invalid':status===429?'rate_limited':status===422?'invalid_input':typeof provided==='string'&&['storage_unavailable','file_check_unavailable','storage_capacity_low'].includes(provided)?provided:'service_unavailable';
   }catch{status=503;code='service_unavailable';}
  }
  response.status(status).json({error:{code,message:status===503?'Servizio temporaneamente non disponibile.':status===404?'Gift non disponibile per questo accesso.':'Controlla accesso e dati della richiesta.',requestId:randomUUID()}});
 }
}

@Controller() @UseFilters(GiftErrorFilter)
export class GiftAccountController{
 constructor(private readonly sessions:SessionsService,@Inject(GiftAcceptanceStore)private readonly acceptances:GiftAcceptanceStore,@Inject(GiftBenefitsStore)private readonly benefits:GiftBenefitsStore,@Inject(GiftThrottle)private readonly throttle:GiftThrottle){}
 @Get('gift-capabilities') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async capabilities(@Req()r:Request,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r);await this.throttle.check('read',{ip:r.ip??'',accountId:session.accountId});return {enabled:giftDeliveryConfigured(process.env),requiresVerifiedEmail:true};}
 @Get('gift-benefits') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async accountBenefits(@Req()r:Request,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r);await this.throttle.check('read',{ip:r.ip??'',accountId:session.accountId});return this.benefits.capabilities(session.accountId);}
 @Get('gift-invitations/:invitationId/my-acceptance') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async resume(@Req()r:Request,@Param('invitationId')invitationId:string,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r);await this.throttle.check('read',{ip:r.ip??'',accountId:session.accountId});return this.acceptances.forInvitation(session.accountId,id(invitationId));}
 @Get('gift-acceptances/:jobId') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async status(@Req()r:Request,@Param('jobId')jobId:string,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r);await this.throttle.check('read',{ip:r.ip??'',accountId:session.accountId});return this.acceptances.get(session.accountId,id(jobId));}
}
@Module({controllers:[GiftAccountController],providers:[{provide:GiftThrottle,useFactory:(db:PrismaService)=>new GiftThrottle(db),inject:[PrismaService]},{provide:GiftAcceptanceStore,useFactory:(db:PrismaService)=>new GiftAcceptanceStore(db),inject:[PrismaService]},{provide:GiftBenefitsStore,useFactory:(db:PrismaService)=>new GiftBenefitsStore(db),inject:[PrismaService]}],exports:[GiftAcceptanceStore,GiftBenefitsStore,GiftThrottle]})
export class GiftAccountModule{}

@Controller('agencies/:agencyId/practices/:practiceId') @UseGuards(AgencySessionGuard) @UseFilters(GiftErrorFilter)
export class AgencyGiftController{
 constructor(@Inject(GiftInvitationsStore)private readonly invitations:GiftInvitationsStore,@Inject(GiftDocumentReleaseStore)private readonly documents:GiftDocumentReleaseStore,@Inject(GiftThrottle)private readonly throttle:GiftThrottle){}
 @Get('gift-documents') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async listDocuments(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Query()q:unknown){noQuery(q);await this.throttle.check('read',{ip:r.ip??'',accountId:r.agencyAccountId});return this.documents.list(r.agencyAccountId,g,p);}
 @Post('sources/:sourceId/gift-release') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async release(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('sourceId')sourceId:string,@Body()input:unknown,@Headers('idempotency-key')key:unknown,@Query()q:unknown){noQuery(q);await this.throttle.check('mutation',{ip:r.ip??'',accountId:r.agencyAccountId});const b=object(input,['expectedRevision','expectedSourceVersion','expectedSha256','title','origin','finalDocumentConfirmed','releaseApproved','digitalPlan']),out=await this.documents.release(r.agencyAccountId,g,p,sourceId,{...b,key});return {replay:out.replay,metadata:out.metadata};}
 @Get('gift-invitations') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async listInvitations(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Query()q:unknown){noQuery(q);await this.throttle.check('read',{ip:r.ip??'',accountId:r.agencyAccountId});return this.invitations.list(r.agencyAccountId,g,p);}
 @Post('gift-invitations') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async create(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Body()input:unknown,@Headers('idempotency-key')key:unknown,@Query()q:unknown){noQuery(q);await this.throttle.check('mutation',{ip:r.ip??'',accountId:r.agencyAccountId});return publicInvitation(await this.invitations.create(r.agencyAccountId,g,p,parseGiftCreateBody(input,key)));}
 @Post('gift-invitations/:invitationId/reissue') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async reissue(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('invitationId')invitationId:string,@Body()input:unknown,@Headers('idempotency-key')key:unknown,@Query()q:unknown){noQuery(q);await this.throttle.check('mutation',{ip:r.ip??'',accountId:r.agencyAccountId});const result=await this.invitations.reissue(r.agencyAccountId,g,p,id(invitationId),parseGiftReissueBody(input,key));return {id:result.id,version:result.version,state:result.state,secret:result.secret,replay:result.replay,requiresReissue:result.requiresReissue};}
 @Post('gift-invitations/:invitationId/revoke') @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async revoke(@Req()r:AgencyRequest,@Param('agencyId')g:string,@Param('practiceId')p:string,@Param('invitationId')invitationId:string,@Body()input:unknown,@Query()q:unknown){noQuery(q);await this.throttle.check('mutation',{ip:r.ip??'',accountId:r.agencyAccountId});const b=parseGiftVersionBody(input),result=await this.invitations.revoke(r.agencyAccountId,g,p,id(invitationId),b.expectedVersion);return {id:result.id,version:result.version,state:result.state,replay:result.replay};}
}

@Controller() @UseFilters(GiftErrorFilter)
export class GiftDeliveryController{
 constructor(private readonly sessions:SessionsService,@Inject(GiftInvitationsStore)private readonly invitations:GiftInvitationsStore,@Inject(GiftAcceptanceStore)private readonly acceptances:GiftAcceptanceStore,@Inject(GiftAcceptanceWorker)private readonly worker:GiftAcceptanceWorker,@Inject(GiftJobsRunner)private readonly runner:GiftJobsRunner,@Inject(GiftThrottle)private readonly throttle:GiftThrottle){}
 @Post('gift-invitations/:invitationId/landing') @HttpCode(200) @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async landing(@Req()r:Request,@Param('invitationId')invitationId:string,@Body()input:unknown,@Query()q:unknown){noQuery(q);await this.sessions.requireCsrf(r);await this.throttle.check('landing',{ip:r.ip??''});return this.invitations.landingStatus(id(invitationId),parseGiftLandingBody(input).secret);}
 @Post('gift-invitations/:invitationId/preview') @HttpCode(200) @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async preview(@Req()r:Request,@Param('invitationId')invitationId:string,@Body()input:unknown,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r,true);await this.throttle.check('mutation',{ip:r.ip??'',accountId:session.accountId});return this.invitations.recipientPreview(session.accountId,id(invitationId),parseGiftLandingBody(input).secret);}
 @Post('gift-invitations/:invitationId/claim') @HttpCode(200) @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async claim(@Req()r:Request,@Param('invitationId')invitationId:string,@Body()input:unknown,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r,true);await this.throttle.check('mutation',{ip:r.ip??'',accountId:session.accountId});const b=parseGiftClaimBody(input),out=await this.invitations.claim(session.accountId,id(invitationId),b.secret,b.expectedVersion);return {id:out.id,version:out.version,state:out.state,replay:out.replay};}
 @Post('gift-invitations/:invitationId/acceptances') @HttpCode(202) @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async begin(@Req()r:Request,@Param('invitationId')invitationId:string,@Body()input:unknown,@Headers('idempotency-key')key:unknown,@Query()q:unknown){noQuery(q);const session=await this.sessions.require(r,true);await this.throttle.check('mutation',{ip:r.ip??'',accountId:session.accountId});const b=parseGiftAcceptanceBody(input,key),out=await this.acceptances.begin(session.accountId,id(invitationId),b.secret,b.command);if(out.state!=='accepted')this.runner.wake();return out;}
 @Post('gift-acceptances/:jobId/cancel') @HttpCode(200) @Header('Cache-Control','no-store') @Header('Referrer-Policy','no-referrer') @Header('X-Content-Type-Options','nosniff')
 async cancel(@Req()r:Request,@Param('jobId')jobId:string,@Body()input:unknown,@Query()q:unknown){noQuery(q);object(input,[]);const session=await this.sessions.require(r,true);await this.throttle.check('mutation',{ip:r.ip??'',accountId:session.accountId});return this.worker.cancel(session.accountId,id(jobId));}
}

@Module({})
export class GiftDeliveryModule{
 static register(storageRoot:string,options:Partial<GiftRuntime>={}):DynamicModule{
  const runtime:GiftRuntime={autoStart:true,pollIntervalMs:2000,concurrency:1,...options};
  return {module:GiftDeliveryModule,imports:[GiftAccountModule,DocumentsModule],controllers:[AgencyGiftController,GiftDeliveryController],providers:[AgencySessionGuard,{provide:AgencyPracticesStore,useFactory:(db:PrismaService)=>new AgencyPracticesStore(db),inject:[PrismaService]},{provide:AgencyFileVault,useFactory:()=>AgencyFileVault.open(storageRoot)},{provide:GiftDocumentReleaseStore,useFactory:(db:PrismaService)=>new GiftDocumentReleaseStore(db),inject:[PrismaService]},{provide:GiftInvitationsStore,useFactory:(db:PrismaService)=>new GiftInvitationsStore(db),inject:[PrismaService]},{provide:GiftAcceptanceWorker,useFactory:(db:PrismaService,vault:AgencyFileVault,storage:LocalFileStorage)=>new GiftAcceptanceWorker(db,vault,storage),inject:[PrismaService,AgencyFileVault,LocalFileStorage]},{provide:GiftJobsRunner,useFactory:(db:PrismaService,worker:GiftAcceptanceWorker,vault:AgencyFileVault,storage:LocalFileStorage)=>new GiftJobsRunner(db,worker,vault,storage,runtime),inject:[PrismaService,GiftAcceptanceWorker,AgencyFileVault,LocalFileStorage]}]};
 }
}
export function giftApplicationImports(env:NodeJS.ProcessEnv=process.env){return [GiftAccountModule,...(giftDeliveryConfigured(env)?[GiftDeliveryModule.register(env.DIMORA_AGENCY_STORAGE_ROOT!)]:[])];}