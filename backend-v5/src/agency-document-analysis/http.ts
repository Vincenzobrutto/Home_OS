import {ArgumentsHost,Body,CanActivate,Catch,Controller,ExecutionContext,ExceptionFilter,Get,Header,Headers,HttpException,Inject,Injectable,Param,Post,Query,Req,UseFilters,UseGuards} from '@nestjs/common';
import {isUUID} from 'class-validator';
import {randomUUID} from 'node:crypto';
import type {Request,Response} from 'express';
import {SessionsService} from '../security';
import {PracticeError} from '../agency-practices/domain';
import {AgencyPracticesStore} from '../agency-practices/store';
import {DOCUMENT_ANALYSIS_APPLICATION,documentRequestKey,documentJobId,emptyDocumentQuery,parseDocumentOptionsQuery,parseDocumentJobBody,type DocumentAnalysisApplicationPort} from './http-contracts';

type AuthenticatedRequest=Request&{agencyAccountId:string};
@Injectable()
export class AgencyDocumentAnalysisGuard implements CanActivate{
 constructor(private readonly sessions:SessionsService,@Inject(AgencyPracticesStore)private readonly store:AgencyPracticesStore){}
 async canActivate(context:ExecutionContext){
  const request=context.switchToHttp().getRequest<AuthenticatedRequest>(),mutation=!['GET','HEAD'].includes(request.method);
  request.agencyAccountId=(await this.sessions.require(request,mutation)).accountId;
  if(!isUUID(String(request.params.agencyId))||!isUUID(String(request.params.practiceId)))throw new PracticeError('invalid_input');
  await this.store.authorize(request.agencyAccountId,String(request.params.agencyId),String(request.params.practiceId),mutation?'edit':'read');return true;
 }
}
@Catch()
export class AgencyDocumentAnalysisErrorFilter implements ExceptionFilter{
 catch(error:unknown,host:ArgumentsHost){
  const response=host.switchToHttp().getResponse<Response>();let status=503,code='service_unavailable';
  if(error instanceof PracticeError){code=error.code;status=code==='access_denied'?403:code==='invalid_input'?422:409;}
  else if(error instanceof HttpException){status=error.getStatus();if(status===400)status=422;code=status===401?'unauthenticated':status===403?'csrf_invalid':status===404?'not_found':status===422?'invalid_input':'service_unavailable';}
  response.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).status(status).json({error:{code,message:status===503?'Analisi documentale non disponibile.':'Controlla accesso e dati della richiesta.',requestId:randomUUID()}});
 }
}
@Controller('agencies/:agencyId/practices/:practiceId')
@UseGuards(AgencyDocumentAnalysisGuard)
@UseFilters(AgencyDocumentAnalysisErrorFilter)
export class AgencyDocumentAnalysisController{
 constructor(@Inject(DOCUMENT_ANALYSIS_APPLICATION)private readonly application:DocumentAnalysisApplicationPort){}
 private scope(request:AuthenticatedRequest,agencyId:string,practiceId:string){return {accountId:request.agencyAccountId,agencyId,practiceId};}
 @Header('Cache-Control','no-store') @Header('X-Content-Type-Options','nosniff') @Get('deed-analysis-options') options(@Req()r:AuthenticatedRequest,@Param('agencyId')a:string,@Param('practiceId')p:string,@Query()query:unknown){return this.application.options(this.scope(r,a,p),parseDocumentOptionsQuery(query));}
 @Header('Cache-Control','no-store') @Header('X-Content-Type-Options','nosniff') @Post('deed-analysis-jobs') create(@Req()r:AuthenticatedRequest,@Param('agencyId')a:string,@Param('practiceId')p:string,@Body()body:unknown,@Headers('idempotency-key')key:unknown,@Query()query:unknown){emptyDocumentQuery(query);return this.application.request(this.scope(r,a,p),parseDocumentJobBody(body),documentRequestKey(key));}
 @Header('Cache-Control','no-store') @Header('X-Content-Type-Options','nosniff') @Get('deed-analysis-jobs/lookup') lookup(@Req()r:AuthenticatedRequest,@Param('agencyId')a:string,@Param('practiceId')p:string,@Headers('idempotency-key')key:unknown,@Query()query:unknown){emptyDocumentQuery(query);return this.application.lookup(this.scope(r,a,p),documentRequestKey(key));}
 @Header('Cache-Control','no-store') @Header('X-Content-Type-Options','nosniff') @Get('deed-analysis-jobs') list(@Req()r:AuthenticatedRequest,@Param('agencyId')a:string,@Param('practiceId')p:string,@Query()query:unknown){emptyDocumentQuery(query);return this.application.list(this.scope(r,a,p));}
 @Header('Cache-Control','no-store') @Header('X-Content-Type-Options','nosniff') @Get('deed-analysis-jobs/:jobId') read(@Req()r:AuthenticatedRequest,@Param('agencyId')a:string,@Param('practiceId')p:string,@Param('jobId')id:unknown,@Query()query:unknown){emptyDocumentQuery(query);return this.application.read(this.scope(r,a,p),documentJobId(id));}
}
