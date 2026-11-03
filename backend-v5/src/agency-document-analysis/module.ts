import {Module,type DynamicModule} from '@nestjs/common';
import {PrismaService} from '../prisma.service';
import {AgencyPracticesStore} from '../agency-practices/store';
import {AgencyFileVault} from '../agency-practices/files';
import {AgencyDocumentAnalysisStore} from './store';
import {AgencyDocumentAnalysisApplication} from './coordinator';
import {AgencyDocumentAnalysisController,AgencyDocumentAnalysisGuard} from './http';
import {DOCUMENT_ANALYSIS_APPLICATION} from './http-contracts';
import {DOCUMENT_ANALYSIS_RUNTIME,documentAnalysisRuntimeFromEnvironment,type DocumentAnalysisRuntime} from './config';
import {AgencyDocumentAnalysisRunner} from './runner';
/** Internal DI tokens permit explicit test overrides; HTTP accepts no provider/configuration injection. */
export const DOCUMENT_ANALYSIS_PROVIDER=Symbol('AgencyDocumentAnalysisProvider');
export const DOCUMENT_ANALYSIS_VAULT=Symbol('AgencyDocumentAnalysisVault');
@Module({})
export class AgencyDocumentAnalysisModule{
 static register(storageRoot:string|null,runtime:DocumentAnalysisRuntime=documentAnalysisRuntimeFromEnvironment()):DynamicModule{
  return {module:AgencyDocumentAnalysisModule,controllers:[AgencyDocumentAnalysisController],providers:[AgencyDocumentAnalysisGuard,
   {provide:DOCUMENT_ANALYSIS_RUNTIME,useValue:runtime},
   {provide:DOCUMENT_ANALYSIS_PROVIDER,useValue:runtime.provider},
   {provide:DOCUMENT_ANALYSIS_VAULT,useFactory:()=>storageRoot?AgencyFileVault.open(storageRoot):null},
   {provide:AgencyPracticesStore,useFactory:(db:PrismaService)=>new AgencyPracticesStore(db),inject:[PrismaService]},
   {provide:AgencyDocumentAnalysisStore,useFactory:(db:PrismaService)=>new AgencyDocumentAnalysisStore(db),inject:[PrismaService]},
   {provide:DOCUMENT_ANALYSIS_APPLICATION,useFactory:(db:PrismaService,ledger:AgencyDocumentAnalysisStore,vault:AgencyFileVault|null,provider:DocumentAnalysisRuntime['provider'],config:DocumentAnalysisRuntime)=>new AgencyDocumentAnalysisApplication(db,ledger,vault,{...config,provider}),inject:[PrismaService,AgencyDocumentAnalysisStore,DOCUMENT_ANALYSIS_VAULT,DOCUMENT_ANALYSIS_PROVIDER,DOCUMENT_ANALYSIS_RUNTIME]},
   {provide:AgencyDocumentAnalysisRunner,useFactory:(ledger:AgencyDocumentAnalysisStore,application:AgencyDocumentAnalysisApplication,config:DocumentAnalysisRuntime)=>new AgencyDocumentAnalysisRunner(ledger,application,config),inject:[AgencyDocumentAnalysisStore,DOCUMENT_ANALYSIS_APPLICATION,DOCUMENT_ANALYSIS_RUNTIME]}
  ],exports:[DOCUMENT_ANALYSIS_APPLICATION,AgencyDocumentAnalysisStore]};
 }
}
/** Read routes stay mounted when ingress/provider is disabled. */
export function documentAnalysisApplicationImports(env:NodeJS.ProcessEnv=process.env){return [AgencyDocumentAnalysisModule.register(env.DIMORA_AGENCY_STORAGE_ROOT??null,documentAnalysisRuntimeFromEnvironment(env))];}
