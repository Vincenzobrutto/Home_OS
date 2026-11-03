import {PracticeError} from '../agency-practices/domain';
import {analysisObject,analysisText,analysisInteger,analysisPages,parseDocumentAnalysisJobBody,type DocumentAnalysisScope,type DocumentAnalysisJobBody,type DocumentAnalysisOffer,type DocumentAnalysisJobView} from './domain';

export const DOCUMENT_ANALYSIS_APPLICATION=Symbol('AgencyDocumentAnalysisApplication');
export type DocumentOptionsSelection={sourceId:string;expectedSourceVersion:number;pages?:number[]};
export type DocumentAnalysisOptions={revision:number;canEdit:boolean;available:boolean;reason:string|null;source:{id:string;version:number;kind:string;sha256:string;filename:string};pageCount:number|null;offer:DocumentAnalysisOffer|null};
export interface DocumentAnalysisApplicationPort{
 options(scope:DocumentAnalysisScope,selection:DocumentOptionsSelection):Promise<DocumentAnalysisOptions>;
 request(scope:DocumentAnalysisScope,body:DocumentAnalysisJobBody,key:string):Promise<unknown>;
 list(scope:DocumentAnalysisScope):Promise<{jobs:DocumentAnalysisJobView[]}>;
 read(scope:DocumentAnalysisScope,id:string):Promise<DocumentAnalysisJobView>;
 lookup(scope:DocumentAnalysisScope,key:string):Promise<{job:DocumentAnalysisJobView|null}>;
}
export function documentRequestKey(value:unknown):string{const key=analysisText(value,120);if(key.length<16)throw new PracticeError('invalid_input');return key;}
export function documentJobId(value:unknown):string{return analysisText(value,100);}
function queryObject(value:unknown,keys:string[]){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new PracticeError('invalid_input');
 const own=Reflect.ownKeys(value);if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))throw new PracticeError('invalid_input');
 const plain:Record<string,unknown>={};for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!('value'in descriptor)||!descriptor.enumerable)throw new PracticeError('invalid_input');Object.defineProperty(plain,key,{value:descriptor.value,enumerable:true});}return analysisObject(plain,keys);
}
export function emptyDocumentQuery(value:unknown){queryObject(value,[]);}
export function parseDocumentOptionsQuery(value:unknown):DocumentOptionsSelection{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new PracticeError('invalid_input');
 const hasPages=Object.hasOwn(value,'pages'),r=queryObject(value,['sourceId','expectedSourceVersion',...(hasPages?['pages']:[])]);
 if(typeof r.expectedSourceVersion!=='string'||! /^[1-9]\d{0,8}$/u.test(r.expectedSourceVersion))throw new PracticeError('invalid_input');
 const result:DocumentOptionsSelection={sourceId:analysisText(r.sourceId,100),expectedSourceVersion:analysisInteger(Number(r.expectedSourceVersion),1)};
 if(hasPages){if(typeof r.pages!=='string'||! /^[1-9]\d?(?:,[1-9]\d?){0,19}$/u.test(r.pages))throw new PracticeError('invalid_input');result.pages=analysisPages(r.pages.split(',').map(Number));}
 return result;
}
export const parseDocumentJobBody=parseDocumentAnalysisJobBody;
