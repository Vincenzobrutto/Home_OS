import { useEffect, useRef, useState, type ContextType } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router';
import type { ApiClient } from '../api/client';
import { isApiError, isUnauthorized, userMessage } from '../api/errors';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import { handleUnauthorized } from '../session/queryClient';
import type { DocumentEditorContext } from '../documents/DocumentEditorContext';
import type { Draft, Pending, CompilationDraft } from './model';
import type { DraftSaveFailure } from './UnifiedReview';

export function isCompilationSave(path:string,body:unknown){const review=(body as {review?:{compilation?:CompilationDraft;pending?:Pending}}).review;return path.endsWith('/review')&&review?.compilation?.saved===true&&!review.pending;}
type LocalWrite=Pending&{pauseAfterCompilation?:boolean};
export type Reply={draft:Draft;result?:{newObjects:number;newExpenses:number}|null};

type Options = {
 api: ApiClient; cache: QueryClient; account: {id:string}; home: {id:string};
 base: string; documentId: string; embedded: boolean;
 editor: ContextType<typeof DocumentEditorContext>; setSearchParams: SetURLSearchParams;
};

/** Owns the pending write and its outcome; never turns an uncertain write into a new request. */
export function useOnboardingWrites({api,cache,account,home,base,documentId,embedded,editor,setSearchParams}:Options){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[blocked,setBlocked]=useState(false),[pendingView,setPendingView]=useState<LocalWrite|null>(null);
 const pending=useRef<LocalWrite|null>(null),live=useRef(true);
 const [draftSaveFailure,setDraftSaveFailure]=useState<DraftSaveFailure|null>(null);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const current=()=>live.current&&cache.getQueryData<{account:{id:string}|null}>(queryKeys.session)?.account?.id===account.id;
 async function fail(e:unknown,inline=false){if(isUnauthorized(e))await handleUnauthorized(cache);if(!current())return;if(isApiError(e)&&e.status===403)setBlocked(true);setError(inline?'':userMessage(e));}
 async function write<T>(path:string,body:unknown,key=newIdempotencyKey(),pauseAfterCompilation=false):Promise<T>{setBusy(true);setError('');const attempt=pending.current??{path,body,key,pauseAfterCompilation};pending.current=attempt;try{const result=await api.callJson<T>(base+attempt.path,{method:'POST',body:attempt.body,idempotencyKey:attempt.key,accountId:account.id});if(!current())throw new Error('Contesto cambiato.');pending.current=null;setUncertain(false);setPendingView(null);if(attempt.pauseAfterCompilation&&isCompilationSave(attempt.path,attempt.body))setDraftSaveFailure(null);if(editor&&attempt.pauseAfterCompilation&&isCompilationSave(attempt.path,attempt.body)&&(result as Reply).draft?.review?.compilation?.saved){await invalidate();if(current())editor.pause(true);}else if(editor&&path.endsWith('/confirmations')&&(result as Reply).draft?.state==='confirmed'){await invalidate();if(current())await editor.complete(documentId);}else if(embedded&&path.endsWith('/confirmations')&&(result as Reply).draft?.state==='confirmed')setSearchParams(previous=>{const next=new URLSearchParams(previous);for(const key of ['lotto','oggetti-documento','oggetti-bozza','oggetti-analisi','compila'])next.delete(key);next.set('documento-salvato',documentId);return next;});return result;}catch(e){if(current()){if(attempt.pauseAfterCompilation&&isCompilationSave(attempt.path,attempt.body)){const uncertain=!(isApiError(e)&&e.kind==='http'&&e.status<500);setDraftSaveFailure({uncertain,message:uncertain?'I dati restano qui. Riprova per verificare il salvataggio.':userMessage(e)+' I dati inseriti restano nel modulo.'});}if(isApiError(e)&&e.kind==='http'&&e.status<500){pending.current=null;setUncertain(false);setPendingView(null);}else{setUncertain(true);setPendingView(attempt);}}await fail(e);throw e;}finally{if(current())setBusy(false);}}
 const invalidate=()=>cache.invalidateQueries({queryKey:['account',account.id,'home',home.id]});
 return {busy,error,uncertain,blocked,pendingView,pending,draftSaveFailure,write,fail,invalidate,setUncertain,setPendingView,setError};
}
